'use client'
import { useEffect, useState } from 'react'
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi'
import MockBGLD from '@/abis/MockBGLD.json'
const TOKEN = process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`

export default function FaucetButton() {
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { write, data, isLoading, error } = useContractWrite({
    address: TOKEN,
    abi: (MockBGLD as any).abi,
    functionName: 'faucetMint',
  })
  const txHash = typeof data === 'string' ? data : (data as any)?.hash
  const wait = useWaitForTransaction({ hash: txHash as `0x${string}` })

  const onMint10k = () => {
    const amount = 10_000n * 10n ** 18n
    write?.({ args: [amount] as const })
  }

  if (!mounted) return <div className="px-3 py-1 rounded-lg border border-white/10 text-white/60">…</div>
  if (!address)  return <div className="px-3 py-1 rounded-lg border border-white/10 text-white/60">Connect Wallet</div>

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onMint10k}
        disabled={isLoading}
        className="px-3 py-1 rounded-lg border border-cyan-300/40 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300/20 transition"
        style={{ backdropFilter: 'blur(6px)' }}
      >
        {isLoading ? 'Minting…' : 'Mint 10,000 BGLD (test)'}
      </button>
      {txHash && <span className="text-xs text-cyan-300">Tx {String(txHash).slice(0,10)}…</span>}
      {wait.isSuccess && <span className="text-xs text-emerald-400">✓</span>}
      {error && <span className="text-xs text-rose-400">{(error as any)?.shortMessage || String(error)}</span>}
    </div>
  )
}
