// lib/chips/chipService.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export type ChipKind = 'gld' | 'pgld'

export type ChipTxType =
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'BET'
  | 'WIN'
  | 'RAKE'
  | 'JACKPOT'
  | 'BONUS'
  | 'ADJUST'
  | 'TRANSFER'

export async function getChipBalance(
  supabase: SupabaseClient,
  playerId: string
) {
  // If you haven't added GLD columns yet, this select will fail.
  // So: select both, but tolerate missing by falling back.
  const { data, error } = await supabase
    .from('chip_balances')
    .select('balance_gld, reserved_gld, balance_pgld, reserved_pgld')
    .eq('profile_id', playerId)
    .maybeSingle()

  if (error) throw error

  return {
    balance_gld: (data as any)?.balance_gld ?? 0,
    reserved_gld: (data as any)?.reserved_gld ?? 0,
    balance_pgld: (data as any)?.balance_pgld ?? 0,
    reserved_pgld: (data as any)?.reserved_pgld ?? 0,
  }
}

export async function applyChipDelta(
  supabase: SupabaseClient,
  params: {
    playerId: string
    kind: ChipKind
    txType: ChipTxType
    deltaBalance: number
    deltaReserved?: number
    ref?: string
    meta?: Record<string, any>
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
  } = params

  // Recommended: upgrade RPC to accept kind + generic deltas.
  // For now, keep compatibility by branching:
  if (kind === 'pgld') {
    const { error } = await supabase.rpc('apply_chip_delta', {
      in_profile_id: playerId,
      in_tx_type: txType,
      in_delta_balance_pgld: deltaBalance,
      in_delta_reserved_pgld: deltaReserved,
      in_ref: ref ?? null,
      in_meta: meta ?? null,
    })
    if (error) throw error
    return
  }

  // GLD path (expects you to create apply_chip_delta_gld OR upgrade apply_chip_delta)
  const { error } = await supabase.rpc('apply_chip_delta_gld', {
    in_profile_id: playerId,
    in_tx_type: txType,
    in_delta_balance_gld: deltaBalance,
    in_delta_reserved_gld: deltaReserved,
    in_ref: ref ?? null,
    in_meta: meta ?? null,
  })
  if (error) throw error
}
