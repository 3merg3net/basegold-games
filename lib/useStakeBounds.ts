// lib/useStakeBounds.ts
'use client'

import { useContractRead } from 'wagmi'
import type { Address } from 'viem'
import { formatUnits } from 'viem'
import Casino from '@/abis/BaseGoldCasino.json'

// Robust coercion to bigint from many shapes (bigint | string | number | object-with-toString)
function toBig(x: unknown): bigint {
  try {
    if (typeof x === 'bigint') return x
    if (typeof x === 'string') return BigInt(x)
    if (typeof x === 'number') return BigInt(Math.trunc(x))
    if (x && typeof x === 'object') {
      const s = (x as any).toString?.()
      if (s && s !== '[object Object]') return BigInt(s)
    }
  } catch {/* fallthrough */}
  return 0n
}

export function useStakeBounds(casino: Address) {
  const minQ = useContractRead({
    address: casino,
    abi: (Casino as any).abi,
    functionName: 'minStake',
    watch: true,
  })

  const maxQ = useContractRead({
    address: casino,
    abi: (Casino as any).abi,
    functionName: 'maxStake',
    watch: true,
  })

  const min = toBig(minQ.data)
  const max = toBig(maxQ.data)
  const minB = Number(formatUnits(min, 18))
  const maxB = Number(formatUnits(max, 18))

  return {
    min, max, minB, maxB,
    isLoading: !!(minQ.isLoading || maxQ.isLoading),
    isFetching: !!(minQ.isFetching || maxQ.isFetching),
    refetchMin: minQ.refetch,
    refetchMax: maxQ.refetch,
    error: minQ.error ?? maxQ.error,
  }
}
