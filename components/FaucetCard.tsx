'use client'
import { useState } from 'react'
import { useFaucet } from '@/lib/hooks/useFaucet'
import { useWaitForTransaction } from 'wagmi'

export default function FaucetCard() {
  const [amount, setAmount] = useState(10_000)
  const { faucetMint, tx, isPending, error } = useFaucet()

  const txHash = typeof tx === 'string' ? tx : (tx as any)?.hash
  const wait = useWaitForTransaction({ hash: txHash as `0x${string}` })

  const onMint = () => faucetMint(BigInt(amount) * 10n ** 18n)

  return (
    <div className="rounded-2xl p-4 bg-black/40 border border-white/10">
      <div className="text-lg font-semibold text-white">Mint Mock BGLD (Sepolia)</div>
      <div className="mt-3 flex gap-2">
        <input
          type="number"
          min={1}
          max={10000}
          value={amount}
          onChange={(e)=>setAmount(parseInt(e.target.value || '0'))}
          className="w-28 bg-white/10 text-white rounded-lg px-3 py-2 outline-none"
        />
        <button
          onClick={onMint}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-cyan-500/80 hover:bg-cyan-400 text-black font-semibold"
        >
          {isPending ? 'Minting…' : 'Mint'}
        </button>
      </div>

      {txHash && <div className="text-xs text-cyan-300 mt-2">Tx: {txHash.slice(0,10)}…</div>}
      {wait.isLoading && <div className="text-xs text-white/60 mt-1">Confirming…</div>}
      {wait.isSuccess && <div className="text-xs text-green-400 mt-1">Confirmed ✅</div>}
      {error && <div className="text-xs text-red-400 mt-2">{(error as any)?.shortMessage || String(error)}</div>}

      <div className="text-[11px] text-white/50 mt-1">Limit ~10,000 per wallet / day.</div>
    </div>
  )
}
