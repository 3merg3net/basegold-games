'use client'
import { useState } from 'react'
import { useContractEvent } from 'wagmi'
import Casino from '@/abis/BaseGoldCasino.json'
const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}`

type Row = { kind: 'win' | 'jackpot'; text: string; ts: number }

export default function RecentWinners() {
  const [rows, setRows] = useState<Row[]>([])

  useContractEvent({
    address: CASINO,
    abi: (Casino as any).abi,
    eventName: 'PlayResult',
    listener: (logs) => {
      for (const log of logs as any[]) {
        const [player, stake, delta, gameType] = log.args
        const game = gameType === 0 ? 'PAN' : gameType === 1 ? 'MINE' : 'SLOTS'
        const gain = BigInt(delta) > 0n
        const amt = Math.abs(Number(delta) / 1e18).toLocaleString()
        const who = `${String(player).slice(0, 6)}…${String(player).slice(-4)}`
        const text = `${game}: ${gain ? 'WIN +' : 'LOSS '}${amt} BGLD — ${who}`

        setRows((xs): Row[] =>
          [{ kind: 'win' as const, text, ts: Date.now() }, ...xs].slice(0, 12)
        )
      }
    },
  })

  useContractEvent({
    address: CASINO,
    abi: (Casino as any).abi,
    eventName: 'JackpotHit',
    listener: (logs) => {
      for (const log of logs as any[]) {
        const [player, amount, jType] = log.args
        const pot = jType === 0 ? 'MOTHERLODE' : jType === 1 ? 'LUCKY' : 'QUICK'
        const val = (Number(amount) / 1e18).toLocaleString()
        const who = `${String(player).slice(0, 6)}…${String(player).slice(-4)}`
        setRows((xs): Row[] =>
          [{ kind: 'jackpot' as const, text: `🎉 JACKPOT ${pot}: ${val} BGLD — ${who}`, ts: Date.now() }, ...xs].slice(0, 12)
        )
      }
    },
  })

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-white/80 text-sm mb-2 font-bold">Recent Wins</div>
      <div className="space-y-1 max-h-60 overflow-auto pr-1">
        {rows.length === 0 && <div className="text-white/50 text-sm">Waiting for action…</div>}
        {rows.map((r, i) => (
          <div key={`${r.ts}-${i}`} className={r.kind === 'jackpot' ? 'text-yellow-300 text-[13px]' : 'text-white/80 text-[13px]'}>
            {r.text}
          </div>
        ))}
      </div>
    </div>
  )
}
