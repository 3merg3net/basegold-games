// app/api/chips/apply/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type Kind = "gld" | "pgld";

type TxType =
  | "DEPOSIT"
  | "WITHDRAW"
  | "TRANSFER"
  | "BET"
  | "WIN"
  | "RAKE"
  | "JACKPOT"
  | "BONUS"
  | "ADJUST";

type Body = {
  // demo fallback only (when NEXT_PUBLIC_DEMO_BANKROLL=1)
  playerId?: string;

  kind: Kind;
  txType: TxType;
  deltaBalance: number; // +/- integer
  deltaReserved?: number; // MUST be 0 from this public route
  ref?: string | null;
  meta?: Record<string, any> | null;
  idempotencyKey?: string | null;
};

function asInt(n: any) {
  const v = Math.trunc(Number(n ?? 0));
  return Number.isFinite(v) ? v : 0;
}

function jsonError(status: number, message: string, extra?: Record<string, any>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}

function normalizeKind(v: any): Kind | null {
  return v === "gld" || v === "pgld" ? v : null;
}

function normalizeTxType(v: any): TxType | null {
  const ok: TxType[] = [
    "DEPOSIT",
    "WITHDRAW",
    "TRANSFER",
    "BET",
    "WIN",
    "RAKE",
    "JACKPOT",
    "BONUS",
    "ADJUST",
  ];
  return ok.includes(v) ? v : null;
}

function makeSupabaseAuthClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");

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

function makeSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE; // (just in case)

  if (!url || !service) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_SERVICE_KEY in env"
    );
  }

  return createClient(url, service, {
    auth: { persistSession: false },
  });
}

export async function POST(req: Request) {
  try {
    // content-type guard
    const ct = req.headers.get("content-type") || "";
    if (ct && !ct.toLowerCase().includes("application/json")) {
      return jsonError(415, "Content-Type must be application/json");
    }

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return jsonError(400, "Invalid JSON body");
    }

    const kind = normalizeKind(body?.kind);
    if (!kind) return jsonError(400, "Invalid kind");

    const txType = normalizeTxType(body?.txType);
    if (!txType) return jsonError(400, "Invalid txType");

    const deltaBalance = asInt(body?.deltaBalance);
    const deltaReserved = asInt(body?.deltaReserved);

    if (deltaReserved !== 0) return jsonError(400, "deltaReserved not allowed");
    if (deltaBalance === 0) return NextResponse.json({ ok: true, noop: true });

    const demoMode = process.env.NEXT_PUBLIC_DEMO_BANKROLL === "1";

    // ✅ auth-first id (cashier-ready)
    const supabaseAuth = makeSupabaseAuthClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    // ✅ canonical playerId:
    // - if logged in: auth user id
    // - else if demoMode: allow body.playerId
    const playerId =
      (user?.id && String(user.id)) ||
      (demoMode ? String(body?.playerId ?? "").trim() : "");

    if (!playerId || playerId.length < 3) {
      return jsonError(401, "Unauthorized");
    }

    // idempotency
    const idem =
      (typeof body?.idempotencyKey === "string" && body.idempotencyKey.trim()) ||
      (typeof body?.ref === "string" && body.ref.trim()) ||
      `${txType}:${kind}:${deltaBalance}:${Date.now()}`;

    // server meta
    const meta = body?.meta ?? null;
    const ref = body?.ref ?? null;

    // ✅ Use admin client so RLS never blocks demo/mint/bet
    const admin = makeSupabaseAdminClient();

    // ✅ Ensure players row exists (prevents chip_balances FK failures)
    const { error: pErr } = await admin
      .from("players")
      .upsert({ id: playerId }, { onConflict: "id" });

    if (pErr) return jsonError(500, pErr.message);

    // ✅ Call your unified RPC directly (no imports)
    const in_delta_balance_gld = kind === "gld" ? deltaBalance : 0;
    const in_delta_balance_pgld = kind === "pgld" ? deltaBalance : 0;

    const { error } = await admin.rpc("apply_chip_delta_any", {
      in_player_id: playerId,
      in_tx_type: txType,
      in_delta_balance_gld,
      in_delta_reserved_gld: 0,
      in_delta_balance_pgld,
      in_delta_reserved_pgld: 0,
      in_ref: ref,
      in_meta: meta,
      in_idempotency_key: idem,
    });

    if (error) {
      const msg = String(error.message ?? "RPC error");
      const lower = msg.toLowerCase();

      if (lower.includes("insufficient")) {
        return jsonError(409, "INSUFFICIENT_CHIPS");
      }

      if (lower.includes("idempotency") || lower.includes("idem")) {
        return jsonError(409, "Duplicate request");
      }

      return jsonError(500, msg);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(500, String(e?.message ?? "Unexpected error"));
  }
}