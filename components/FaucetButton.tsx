'use client'

import { useEffect, useState } from 'react'
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi'

const FAUCET_CA = process.env.NEXT_PUBLIC_FAUCET_CA as `0x${string}`

/** Minimal FaucetController ABI */
const FAUCET_ABI = [
  { type: 'function', name: 'faucet', stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
] as const

export default function FaucetButton() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { write, data, isLoading, error } = useContractWrite({
    address: FAUCET_CA,
    abi: FAUCET_ABI,
    functionName: 'faucet',
  })
  const txHash = (data as any)?.hash as `0x${string}` | undefined
  const wait = useWaitForTransaction({ hash: txHash })

  const onMint10k = () => {
    // 10,000 * 1e18
    const amt = 10_000n * 10n ** 18n
    write?.({ args: [amt] as const })
  }

  if (!mounted) {
    return <button className="px-3 py-1 rounded bg-white/10 text-white/70">…</button>
  }
  if (!address) {
    return <button className="px-3 py-1 rounded bg-white/10 text-white/70" disabled>Connect Wallet</button>
  }

  return (
    <div className="flex items-center gap-2">
      <button
  onClick={onMint10k}
  disabled={isLoading}
  className="px-3 py-1 rounded bg-[#FFD700] text-black font-semibold hover:bg-[#FFE34F] border border-[#FFD700] shadow-md"
>
  {isLoading ? 'Minting…' : 'Mint 10,000 BGLD (test)'}
</button>


      {txHash && <span className="text-xs text-cyan-300">Tx {txHash.slice(0,10)}…</span>}
      {wait.isSuccess && <span className="text-xs text-green-400">✓</span>}
      {error && <span className="text-xs text-red-400">{(error as any)?.shortMessage || String(error)}</span>}
    </div>
  )
}
