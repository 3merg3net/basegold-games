// lib/chips/chipService.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export type ChipTxType =
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'BET'
  | 'WIN'
  | 'RAKE'
  | 'JACKPOT'
  | 'BONUS'
  | 'ADJUST'
  | 'TRANSFER';

export async function getChipBalance(
  supabase: SupabaseClient,
  playerId: string
) {
  const { data, error } = await supabase
    .from('chip_balances')
    .select('balance_pgld, reserved_pgld')
    .eq('profile_id', playerId)
    .maybeSingle();

  if (error) throw error;

  return {
    balance_pgld: data?.balance_pgld ?? 0,
    reserved_pgld: data?.reserved_pgld ?? 0,
  };
}

export async function applyChipDelta(
  supabase: SupabaseClient,
  params: {
    playerId: string;
    txType: ChipTxType;
    deltaBalance: number;
    deltaReserved?: number;
    ref?: string;
    meta?: Record<string, any>;
  }
) {
  const { playerId, txType, deltaBalance, deltaReserved = 0, ref, meta } = params;

  const { error } = await supabase.rpc('apply_chip_delta', {
    in_profile_id: playerId,
    in_tx_type: txType,
    in_delta_balance_pgld: deltaBalance,
    in_delta_reserved_pgld: deltaReserved,
    in_ref: ref ?? null,
    in_meta: meta ?? null,
  });

  if (error) throw error;
}
