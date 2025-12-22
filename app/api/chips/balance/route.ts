import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/serviceClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;


export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const playerId = url.searchParams.get("playerId");

    if (!playerId || playerId.length < 4) {
      return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
    }

    const { data, error } = await supabaseService
      .from("chip_balances")
      .select("player_id, balance_gld, reserved_gld, balance_pgld, reserved_pgld")
      .eq("player_id", playerId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!data) {
      const { error: insErr } = await supabaseService.from("chip_balances").insert({
        player_id: playerId,
        balance_gld: 0,
        reserved_gld: 0,
        balance_pgld: 0,
        reserved_pgld: 0,
      });

      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

      return NextResponse.json({
        balance_gld: 0,
        reserved_gld: 0,
        balance_pgld: 0,
        reserved_pgld: 0,
      });
    }

    return NextResponse.json(
  {
    balance_gld: Number(data.balance_gld ?? 0),
    reserved_gld: Number(data.reserved_gld ?? 0),
    balance_pgld: Number(data.balance_pgld ?? 0),
    reserved_pgld: Number(data.reserved_pgld ?? 0),
  },
  {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  }
);

  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
