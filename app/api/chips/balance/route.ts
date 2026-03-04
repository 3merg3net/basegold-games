// app/api/chips/balance/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const START_GLD = 5000;
const START_PGLD = 5000;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: NO_CACHE_HEADERS });
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
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !service) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_SERVICE_KEY in env");
  }

  return createClient(url, service, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const queryPlayerId = (url.searchParams.get("playerId") ?? "").trim();

    const demoMode = process.env.NEXT_PUBLIC_DEMO_BANKROLL === "1";

    // auth-first id (cashier-ready)
    const supabaseAuth = makeSupabaseAuthClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    // canonical id:
    // - if logged in: user.id
    // - else if demoMode: query param
    const playerId =
      (user?.id && String(user.id)) ||
      (demoMode ? queryPlayerId : "");

    if (!playerId || playerId.length < 4) {
      return jsonError(400, "Missing playerId");
    }

    const admin = makeSupabaseAdminClient();

    // ✅ Ensure players row exists (prevents chip_balances FK failures)
    const { error: pErr } = await admin
      .from("players")
      .upsert({ id: playerId }, { onConflict: "id" });

    if (pErr) return jsonError(500, pErr.message);

    // 1) Read balances
    const { data: existing, error: readErr } = await admin
      .from("chip_balances")
      .select("player_id, balance_gld, reserved_gld, balance_pgld, reserved_pgld")
      .eq("player_id", playerId)
      .maybeSingle();

    if (readErr) return jsonError(500, readErr.message);

    // 2) Create if missing (UPSERT, not INSERT)
    if (!existing) {
      const seed = demoMode
        ? {
            player_id: playerId,
            balance_gld: START_GLD,
            reserved_gld: 0,
            balance_pgld: START_PGLD,
            reserved_pgld: 0,
          }
        : {
            player_id: playerId,
            balance_gld: 0,
            reserved_gld: 0,
            balance_pgld: 0,
            reserved_pgld: 0,
          };

      const { error: upErr } = await admin
        .from("chip_balances")
        .upsert(seed, { onConflict: "player_id" });

      if (upErr) return jsonError(500, upErr.message);

      // re-read canonical
      const { data: created, error: rereadErr } = await admin
        .from("chip_balances")
        .select("player_id, balance_gld, reserved_gld, balance_pgld, reserved_pgld")
        .eq("player_id", playerId)
        .maybeSingle();

      if (rereadErr) return jsonError(500, rereadErr.message);

      return NextResponse.json(
        {
          playerId, // ✅ IMPORTANT: tell client which id we used
          balance_gld: Number(created?.balance_gld ?? seed.balance_gld ?? 0),
          reserved_gld: Number(created?.reserved_gld ?? 0),
          balance_pgld: Number(created?.balance_pgld ?? seed.balance_pgld ?? 0),
          reserved_pgld: Number(created?.reserved_pgld ?? 0),
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // 3) Existing row
    return NextResponse.json(
      {
        playerId, // ✅ IMPORTANT: tell client which id we used
        balance_gld: Number(existing.balance_gld ?? 0),
        reserved_gld: Number(existing.reserved_gld ?? 0),
        balance_pgld: Number(existing.balance_pgld ?? 0),
        reserved_pgld: Number(existing.reserved_pgld ?? 0),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? "Unexpected error") },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}