'use client'
import { useContractWrite } from 'wagmi'
import MockBGLD from '@/abis/MockBGLD.json'

const TOKEN  = process.env.NEXT_PUBLIC_BGLD_CA  as `0x${string}`
const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}`

export function useApproveBgld() {
  const { write, data, isLoading, error } = useContractWrite({
    address: TOKEN,
    abi: (MockBGLD as any).abi,
    functionName: 'approve',
  })

  const approve = (amountWei: bigint) =>
    write?.({ args: [CASINO, amountWei] as const })

  return { approve, tx: data, isPending: isLoading, error }
}
