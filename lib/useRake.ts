// lib/useRake.ts
'use client'
import { useContractRead } from 'wagmi'
import type { Address } from 'viem'
import Casino from '@/abis/BaseGoldCasino.json'

export function useRake(casino: Address) {
  const { data } = useContractRead({
    address: casino,
    abi: (Casino as any).abi,
    functionName: 'rakeBps',
    watch: true,
    enabled: !!casino,
  })
  const bps = typeof data === 'bigint' ? Number(data) : 0
  // bps -> multiplier to keep after rake, e.g. 200 bps = keep 98%
  const keep = Math.max(0, 1 - bps / 10_000)
  return { bps, keep }
}
