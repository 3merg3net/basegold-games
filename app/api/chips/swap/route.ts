// app/api/chips/swap/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const START_GLD = 5000;
const START_PGLD = 5000;

function int(n: any) {
  const v = Math.floor(Number(n ?? 0));
  return Number.isFinite(v) ? v : 0;
}

function getServiceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Throwing here is OK — but now it happens only when the route is called,
  // not during Vercel build/collect.
  if (!url) throw new Error("supabaseUrl is required (set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL)");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const sb = getServiceSupabase();

    const body = await req.json().catch(() => ({}));
    const playerId = String(body.playerId ?? "");
    const from = String(body.from ?? "");
    const to = String(body.to ?? "");
    const amountIn = int(body.amountIn);

    if (!playerId || amountIn <= 0) {
      return NextResponse.json({ ok: false, error: "Bad args" }, { status: 400 });
    }

    const isChip = (a: string) => a === "gld" || a === "pgld";
    if (!isChip(from) || !isChip(to) || from === to) {
      return NextResponse.json({ ok: false, error: "Invalid pair" }, { status: 400 });
    }

    // Ensure chip_balances row exists (WITH STARTING balances)
    const { data: existing, error: exErr } = await sb
      .from("chip_balances")
      .select("player_id")
      .eq("player_id", playerId)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
    }

    if (!existing) {
      const { error: insErr } = await sb.from("chip_balances").insert({
        player_id: playerId,
        balance_gld: START_GLD,
        reserved_gld: 0,
        balance_pgld: START_PGLD,
        reserved_pgld: 0,
      });

      if (insErr) {
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
      }
    }

    const { data: cur, error: rerr } = await sb
      .from("chip_balances")
      .select("balance_gld,balance_pgld,reserved_gld,reserved_pgld")
      .eq("player_id", playerId)
      .single();

    if (rerr) return NextResponse.json({ ok: false, error: rerr.message }, { status: 500 });

    const bg = int(cur?.balance_gld);
    const bp = int(cur?.balance_pgld);
    const rg = int(cur?.reserved_gld);
    const rp = int(cur?.reserved_pgld);

    const have = from === "gld" ? bg : bp;
    if (have < amountIn) {
      return NextResponse.json({ ok: false, error: "INSUFFICIENT_CHIPS" }, { status: 400 });
    }

    const nextBg = from === "gld" ? bg - amountIn : bg + amountIn;
    const nextBp = from === "pgld" ? bp - amountIn : bp + amountIn;

    const { error: uerr } = await sb
      .from("chip_balances")
      .update({
        balance_gld: nextBg,
        balance_pgld: nextBp,
        updated_at: new Date().toISOString(),
      })
      .eq("player_id", playerId);

    if (uerr) return NextResponse.json({ ok: false, error: uerr.message }, { status: 500 });

    // optional ledger (don't fail swap if ledger insert fails)
    const { error: ledErr } = await sb.from("chip_ledger").insert({
      player_id: playerId,
      tx_type: "chip_swap",
      delta_balance_gld: from === "gld" ? -amountIn : amountIn,
      delta_balance_pgld: from === "pgld" ? -amountIn : amountIn,
      delta_reserved_gld: 0,
      delta_reserved_pgld: 0,
      balance_before_gld: bg,
      balance_after_gld: nextBg,
      reserved_before_gld: rg,
      reserved_after_gld: rg,
      balance_before_pgld: bp,
      balance_after_pgld: nextBp,
      reserved_before_pgld: rp,
      reserved_after_pgld: rp,
      ref: null,
      meta: { from, to, amountIn },
    });

    if (ledErr) {
      // log but don't break swap
      console.warn("[chips/swap] ledger insert failed:", ledErr.message);
    }

    return NextResponse.json({ ok: true, balance_gld: nextBg, balance_pgld: nextBp });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unexpected swap error" },
      { status: 500 }
    );
  }
}
