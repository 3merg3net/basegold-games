'use client'
import { useContractWrite } from 'wagmi'
import MockBGLD from '@/abis/MockBGLD.json'

const TOKEN = process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`

export function useFaucet() {
  const { write, data, isLoading, error } = useContractWrite({
    address: TOKEN,
    abi: (MockBGLD as any).abi,
    functionName: 'faucetMint',
  })

  const faucetMint = (amountWei: bigint) =>
    write?.({ args: [amountWei] as const })

  return { faucetMint, tx: data, isPending: isLoading, error }
}
