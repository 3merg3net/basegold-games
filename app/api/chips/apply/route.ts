// app/chips/apply/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type Kind = "gld" | "pgld";
type UserTxType = "DEPOSIT" | "WITHDRAW" | "TRANSFER";

type Body = {
  kind: Kind;
  txType: UserTxType;
  deltaBalance: number; // +/- integer
  deltaReserved?: number; // MUST be 0 from this public route
  ref?: string | null;
  meta?: Record<string, any> | null;
  idempotencyKey?: string | null; // recommended from client
};

function asInt(n: any) {
  const v = Math.trunc(Number(n ?? 0));
  return Number.isFinite(v) ? v : 0;
}

function jsonError(status: number, message: string, extra?: Record<string, any>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}

function makeSupabase() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

function normalizeKind(v: any): Kind | null {
  return v === "gld" || v === "pgld" ? v : null;
}

function normalizeUserTxType(v: any): UserTxType | null {
  return v === "DEPOSIT" || v === "WITHDRAW" || v === "TRANSFER" ? v : null;
}

function ipFromHeaders(req: Request) {
  // Best-effort; may be blank behind some infra
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    ""
  );
}

export async function POST(req: Request) {
  try {
    // Basic content-type guard (don’t hard fail if missing, but prefer JSON)
    const ct = req.headers.get("content-type") || "";
    if (ct && !ct.toLowerCase().includes("application/json")) {
      return jsonError(415, "Content-Type must be application/json");
    }

    const supabase = makeSupabase();

    // Require authenticated user
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return jsonError(401, "Unauthorized");
    }

    // Parse body
    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return jsonError(400, "Invalid JSON body");
    }

    const kind = normalizeKind(body?.kind);
    if (!kind) return jsonError(400, "Invalid kind");

    const txType = normalizeUserTxType(body?.txType);
    if (!txType) return jsonError(400, "Invalid txType");

    const deltaBalance = asInt(body?.deltaBalance);
    const deltaReserved = asInt(body?.deltaReserved);

    // No-op allowed
    if (deltaBalance === 0 && deltaReserved === 0) {
      return NextResponse.json({ ok: true, noop: true });
    }

    // Strong guardrail: public route cannot touch reserved balances
    if (deltaReserved !== 0) {
      return jsonError(400, "deltaReserved not allowed");
    }

    // Sign rules
    if (txType === "DEPOSIT" && deltaBalance <= 0) {
      return jsonError(400, "DEPOSIT must be positive");
    }
    if (txType === "WITHDRAW" && deltaBalance >= 0) {
      return jsonError(400, "WITHDRAW must be negative");
    }
    // TRANSFER can be +/- depending on direction; you may want to split into TRANSFER_IN/OUT later.

    // Optional: clamp magnitude (prevents insane numbers)
    const MAX_ABS = 1_000_000_000; // 1B chips guardrail; adjust as you like
    if (Math.abs(deltaBalance) > MAX_ABS) {
      return jsonError(400, "deltaBalance too large");
    }

    // 🔒 Derive playerId from auth, never from client input
    const playerId = user.id;

    // Ensure player exists (don’t auto-create from this public endpoint)
    const { data: playerRow, error: pErr } = await supabase
      .from("players")
      .select("id")
      .eq("id", playerId)
      .maybeSingle();

    if (pErr) return jsonError(500, pErr.message);
    if (!playerRow?.id) return jsonError(404, "Player not found");

    // Prefer caller-provided idempotencyKey; otherwise generate a best-effort stable one
    // (NOTE: client-generated is better; this fallback reduces accidental double submits)
    const idem =
      (typeof body?.idempotencyKey === "string" && body.idempotencyKey.trim()) ||
      `${txType}:${kind}:${deltaBalance}:${body?.ref ?? ""}`;

    // Add minimal server metadata (helps auditing)
    const meta: Record<string, any> = {
      ...(body?.meta ?? {}),
      source: "http_route:/chips/apply",
      ip: ipFromHeaders(req),
      ua: req.headers.get("user-agent") || "",
    };

    // Use unified RPC
    const in_delta_balance_gld = kind === "gld" ? deltaBalance : 0;
    const in_delta_balance_pgld = kind === "pgld" ? deltaBalance : 0;

    const { error } = await supabase.rpc("apply_chip_delta_any", {
      in_player_id: playerId,
      in_tx_type: txType,
      in_delta_balance_gld,
      in_delta_reserved_gld: 0,
      in_delta_balance_pgld,
      in_delta_reserved_pgld: 0,
      in_ref: body?.ref ?? null,
      in_meta: meta,
      in_idempotency_key: idem,
    });

    if (error) {
      const msg = String(error.message ?? "RPC error");
      const lower = msg.toLowerCase();

      // Your function raises 'INSUFFICIENT_CHIPS'
      if (lower.includes("insufficient")) {
        return jsonError(409, msg);
      }

      // If your RPC ever lets unique violations escape
      if (lower.includes("chip_ledger_idem_uq") || lower.includes("idempotency")) {
        return jsonError(409, "Duplicate request");
      }

      // PostgREST sometimes returns function resolution issues
      if (lower.includes("function") && lower.includes("apply_chip_delta_any")) {
        return jsonError(500, "RPC not found or signature mismatch", { details: msg });
      }

      return jsonError(500, msg);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(500, e?.message ?? "Unexpected error");
  }
}
