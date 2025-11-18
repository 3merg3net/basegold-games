'use client'

import { useAccount, useContractRead, useContractWrite } from 'wagmi'
import type { Address } from 'viem'
import { formatUnits, zeroAddress } from 'viem'
import ERC20 from '@/abis/ERC20.json'

/** Minimal ERC20 ABI (re-exported so you can import from '@/lib/erc20') */
export const ERC20_ABI = ERC20 as any

/* -------------------- useErc20Balance -------------------- */
export function useErc20Balance(token: Address = zeroAddress, owner?: Address) {
  const { address: acct } = useAccount()
  const who = owner || acct
  const q = useContractRead({
    address: token,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: who ? [who] : undefined,
    watch: !!who,
    enabled: !!who,
    select: (data) => (data ? (data as unknown as bigint) : 0n),
  })
  return {
    balanceWei: q.data ?? 0n,
    balance: Number(formatUnits(q.data ?? 0n, 18)),
    refetchBalance: q.refetch,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
  }
}

/* -------------------- useErc20Allowance -------------------- */
export function useErc20Allowance(
  token: Address = zeroAddress,
  owner?: Address,
  spender?: Address
) {
  const { address: acct } = useAccount()
  const who = owner || acct
  const q = useContractRead({
    address: token,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: who && spender ? [who, spender] : undefined,
    watch: !!who && !!spender,
    enabled: !!who && !!spender,
    select: (data) => (data ? (data as unknown as bigint) : 0n),
  })
  return {
    allowance: q.data ?? 0n,
    refetchAllowance: q.refetch,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
  }
}

/* -------------------- useErc20Approve -------------------- */
export function useErc20Approve(token: Address = zeroAddress) {
  return useContractWrite({
    address: token,
    abi: ERC20_ABI,
    functionName: 'approve',
  })
}
