// lib/chips/chipService.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type ChipKind = "gld" | "pgld";

export type ChipTxType =
  | "DEPOSIT"
  | "WITHDRAW"
  | "BET"
  | "WIN"
  | "RAKE"
  | "JACKPOT"
  | "BONUS"
  | "ADJUST"
  | "TRANSFER";

export async function getChipBalance(supabase: SupabaseClient, playerId: string) {
  const { data, error } = await supabase
    .from("chip_balances")
    .select("balance_gld, reserved_gld, balance_pgld, reserved_pgld")
    .eq("player_id", playerId)
    .maybeSingle();

  if (error) throw error;

  return {
    balance_gld: Number((data as any)?.balance_gld ?? 0),
    reserved_gld: Number((data as any)?.reserved_gld ?? 0),
    balance_pgld: Number((data as any)?.balance_pgld ?? 0),
    reserved_pgld: Number((data as any)?.reserved_pgld ?? 0),
  };
}

export async function applyChipDelta(
  supabase: SupabaseClient,
  params: {
    playerId: string;
    kind: ChipKind;
    txType: ChipTxType;
    deltaBalance: number;
    deltaReserved?: number;
    ref?: string;
    meta?: Record<string, any>;
  }
) {
  const {
    playerId,
    kind,
    txType,
    deltaBalance,
    deltaReserved = 0,
    ref,
    meta,
  } = params;

  // Unified RPC (recommended)
  const { error } = await supabase.rpc("apply_chip_delta_v2", {
    in_player_id: playerId,
    in_kind: kind,
    in_tx_type: txType,
    in_delta_balance: Math.trunc(deltaBalance),
    in_delta_reserved: Math.trunc(deltaReserved),
    in_ref: ref ?? null,
    in_meta: meta ?? null,
  });

  if (error) throw error;
}
