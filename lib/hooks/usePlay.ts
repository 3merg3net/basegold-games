'use client'
import { useContractWrite } from 'wagmi'
import Casino from '@/abis/BaseGoldCasino.json'

const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}`
const seed = () => BigInt(Date.now())

export function usePlay() {
  const pan   = useContractWrite({ address: CASINO, abi: (Casino as any).abi, functionName: 'playPan' })
  const mine  = useContractWrite({ address: CASINO, abi: (Casino as any).abi, functionName: 'playMine' })
  const slots = useContractWrite({ address: CASINO, abi: (Casino as any).abi, functionName: 'playSlots' })

  const playPan   = (stakeWei: bigint) => pan.write?.({   args: [stakeWei, seed()] as const })
  const playMine  = (stakeWei: bigint) => mine.write?.({  args: [stakeWei, seed()] as const })
  const playSlots = (stakeWei: bigint) => slots.write?.({ args: [stakeWei, seed()] as const })

  const isPending = pan.isLoading || mine.isLoading || slots.isLoading
  const tx = pan.data ?? mine.data ?? slots.data
  const error = pan.error ?? mine.error ?? slots.error

  return { playPan, playMine, playSlots, tx, isPending, error }
}
