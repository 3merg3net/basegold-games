import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/serviceClient";

type Body = {
  playerId: string;
  kind: "gld" | "pgld";
  txType:
    | "DEPOSIT"
    | "WITHDRAW"
    | "BET"
    | "WIN"
    | "RAKE"
    | "JACKPOT"
    | "BONUS"
    | "ADJUST"
    | "TRANSFER";
  deltaBalance: number;
  deltaReserved?: number;
  ref?: string | null;
  meta?: Record<string, any> | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.playerId || body.playerId.length < 3) {
      return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
    }

    const deltaBalance = Math.trunc(Number(body.deltaBalance ?? 0));
    const deltaReserved = Math.trunc(Number(body.deltaReserved ?? 0));

    if (!Number.isFinite(deltaBalance) || !Number.isFinite(deltaReserved)) {
      return NextResponse.json({ error: "Invalid deltas" }, { status: 400 });
    }

    if (body.kind === "pgld") {
      const { error } = await supabaseService.rpc("apply_chip_delta", {
        in_player_id: body.playerId,
        in_tx_type: body.txType,
        in_delta_balance_pgld: deltaBalance,
        in_delta_reserved_pgld: deltaReserved,
        in_ref: body.ref ?? null,
        in_meta: body.meta ?? null,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabaseService.rpc("apply_chip_delta_gld", {
      in_player_id: body.playerId,
      in_tx_type: body.txType,
      in_delta_balance_gld: deltaBalance,
      in_delta_reserved_gld: deltaReserved,
      in_ref: body.ref ?? null,
      in_meta: body.meta ?? null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
