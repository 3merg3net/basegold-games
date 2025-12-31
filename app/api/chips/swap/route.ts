// app/api/chips/swap/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function int(n: any) {
  const v = Math.floor(Number(n ?? 0));
  return Number.isFinite(v) ? v : 0;
}

export async function POST(req: Request) {
  try {
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

    // 1) FK SAFE: ensure player exists (players.id must exist)
    const { data: player, error: perr } = await sb
      .from("players")
      .select("id")
      .eq("id", playerId)
      .maybeSingle();

    if (perr) {
      return NextResponse.json({ ok: false, error: perr.message }, { status: 500 });
    }
    if (!player) {
      return NextResponse.json(
        { ok: false, error: "UNKNOWN_PLAYER" },
        { status: 400 }
      );
    }

    // 2) Ensure chip_balances row exists (will succeed now that FK is valid)
    const { data: existingBal, error: berr } = await sb
      .from("chip_balances")
      .select("player_id")
      .eq("player_id", playerId)
      .maybeSingle();

    if (berr) {
      return NextResponse.json({ ok: false, error: berr.message }, { status: 500 });
    }

    if (!existingBal) {
      const { error: insErr } = await sb.from("chip_balances").insert({
        player_id: playerId,
        balance_gld: 0,
        reserved_gld: 0,
        balance_pgld: 0,
        reserved_pgld: 0,
      });
      if (insErr) {
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
      }
    }

    // 3) Read current balances
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

    // ✅ IMPORTANT: available = balance - reserved
    const availFrom = from === "gld" ? Math.max(0, bg - rg) : Math.max(0, bp - rp);
    if (availFrom < amountIn) {
      return NextResponse.json({ ok: false, error: "INSUFFICIENT_CHIPS" }, { status: 400 });
    }

    const nextBg = from === "gld" ? bg - amountIn : bg + amountIn;
    const nextBp = from === "pgld" ? bp - amountIn : bp + amountIn;

    // 4) Atomic-ish guard: only update if still sufficient at write time
    // (prevents some races without needing DB function)
    const guardColumn = from === "gld" ? "balance_gld" : "balance_pgld";
    const guardValue = from === "gld" ? bg : bp;

    const { data: updated, error: uerr } = await sb
      .from("chip_balances")
      .update({
        balance_gld: nextBg,
        balance_pgld: nextBp,
        updated_at: new Date().toISOString(),
      })
      .eq("player_id", playerId)
      .eq(guardColumn, guardValue) // optimistic concurrency guard
      .select("balance_gld,balance_pgld,reserved_gld,reserved_pgld")
      .maybeSingle();

    if (uerr) return NextResponse.json({ ok: false, error: uerr.message }, { status: 500 });

    if (!updated) {
      // someone changed balances between read and write
      return NextResponse.json(
        { ok: false, error: "CONFLICT_RETRY" },
        { status: 409 }
      );
    }

    // 5) Ledger insert (best-effort; if you want it strict, wrap in DB function)
    const { error: lerr } = await sb.from("chip_ledger").insert({
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

    if (lerr) {
      // don't fail the swap if ledger fails in dev; you can tighten later
      console.warn("[chip_swap] ledger insert failed:", lerr.message);
    }

    return NextResponse.json({ ok: true, balance_gld: nextBg, balance_pgld: nextBp });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
