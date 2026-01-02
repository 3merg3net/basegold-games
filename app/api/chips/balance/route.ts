// app/api/chips/balance/route.ts
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/serviceClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const START_GLD = 5000;
const START_PGLD = 5000;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const playerId = url.searchParams.get("playerId");

    if (!playerId || playerId.length < 4) {
      return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
    }

    // 1) Try to read existing row
    const { data: existing, error: readErr } = await supabaseService
      .from("chip_balances")
      .select("player_id, balance_gld, reserved_gld, balance_pgld, reserved_pgld")
      .eq("player_id", playerId)
      .maybeSingle();

    if (readErr) {
      return NextResponse.json({ error: readErr.message }, { status: 500 });
    }

    // 2) If missing, create row with starting balances
    if (!existing) {
      const { error: insErr } = await supabaseService.from("chip_balances").insert({
        player_id: playerId,
        balance_gld: START_GLD,
        reserved_gld: 0,
        balance_pgld: START_PGLD,
        reserved_pgld: 0,
      });

      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }

      // Return starting balances immediately (no null access)
      return NextResponse.json(
        {
          balance_gld: START_GLD,
          reserved_gld: 0,
          balance_pgld: START_PGLD,
          reserved_pgld: 0,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // 3) Existing row
    return NextResponse.json(
      {
        balance_gld: Number(existing.balance_gld ?? 0),
        reserved_gld: Number(existing.reserved_gld ?? 0),
        balance_pgld: Number(existing.balance_pgld ?? 0),
        reserved_pgld: Number(existing.reserved_pgld ?? 0),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
