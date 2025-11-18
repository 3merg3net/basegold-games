'use client'
import { useState } from 'react'
import { usePlay } from '@/lib/hooks/usePlay'
import { useWaitForTransaction } from 'wagmi'

export default function PlayPanel() {
  const [bet, setBet] = useState(100)
  const { playPan, playMine, playSlots, tx, isPending, error } = usePlay()

  const txHash = typeof tx === 'string' ? tx : (tx as any)?.hash
  const wait = useWaitForTransaction({ hash: txHash as `0x${string}` })

  const toWei = () => BigInt(bet) * 10n ** 18n

  return (
    <div className="rounded-2xl p-4 bg-black/40 border border-white/10">
      <div className="text-lg font-semibold text-white">Play</div>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="number"
          min={1}
          value={bet}
          onChange={(e)=>setBet(parseInt(e.target.value || '0'))}
          className="w-28 bg-white/10 text-white rounded-lg px-3 py-2 outline-none"
        />
        <button onClick={()=>playPan(toWei())}  disabled={isPending} className="px-3 py-2 rounded-lg bg-blue-400 text-black font-semibold">Pan</button>
        <button onClick={()=>playMine(toWei())} disabled={isPending} className="px-3 py-2 rounded-lg bg-green-400 text-black font-semibold">Mine</button>
        <button onClick={()=>playSlots(toWei())}disabled={isPending} className="px-3 py-2 rounded-lg bg-pink-400 text-black font-semibold">Slots</button>
      </div>

      {txHash && <div className="text-xs text-cyan-300 mt-2">Tx: {txHash.slice(0,10)}…</div>}
      {wait.isLoading && <div className="text-xs text-white/60 mt-1">Confirming…</div>}
      {wait.isSuccess && <div className="text-xs text-green-400 mt-1">Confirmed ✅</div>}
      {error && <div className="text-xs text-red-400 mt-2">{(error as any)?.shortMessage || String(error)}</div>}
      <div className="text-[11px] text-white/50 mt-1">Tip: approve enough BGRC before playing.</div>
    </div>
  )
}
