// app/api/chips/reload/route.ts
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/serviceClient";

function int(n: any) {
  const v = Math.floor(Number(n ?? 0));
  return Number.isFinite(v) ? v : 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerId = String(body.playerId ?? "");
    const asset = String(body.asset ?? "pgld"); // "gld" | "pgld"
    const amount = int(body.amount ?? 5000);

    if (!playerId) return NextResponse.json({ ok: false, error: "Missing playerId" }, { status: 400 });
    if (asset !== "gld" && asset !== "pgld") return NextResponse.json({ ok: false, error: "Bad asset" }, { status: 400 });
    if (amount <= 0) return NextResponse.json({ ok: false, error: "Bad amount" }, { status: 400 });

    const col = asset === "gld" ? "balance_gld" : "balance_pgld";

    // Ensure row exists by hitting balance route logic indirectly
    const { data: cur, error: selErr } = await supabaseService
      .from("chip_balances")
      .select("balance_gld,balance_pgld")
      .eq("player_id", playerId)
      .maybeSingle();

    if (selErr) return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });
    if (!cur) return NextResponse.json({ ok: false, error: "No chip row. Load /api/chips/balance first." }, { status: 400 });

    const next =
      asset === "gld"
        ? { balance_gld: int(cur.balance_gld) + amount }
        : { balance_pgld: int(cur.balance_pgld) + amount };

    const { error: upErr } = await supabaseService
      .from("chip_balances")
      .update({ ...next, updated_at: new Date().toISOString() })
      .eq("player_id", playerId);

    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, ...next });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
