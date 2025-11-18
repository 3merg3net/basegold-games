'use client'
import { useEffect, useState } from 'react'
import { useAccount, useContractEvent } from 'wagmi'
import Casino from '@/abis/BaseGoldCasino.json'

const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}`

type Toast = { id: string; title: string; body?: string; tone: 'win'|'lose'|'jackpot' }

export default function WinToasts() {
  const { address } = useAccount()
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = (t: Toast) => {
    setToasts((xs) => [...xs, t])
    setTimeout(() => setToasts((xs) => xs.filter(y => y.id !== t.id)), 6000)
  }

  useContractEvent({
    address: CASINO,
    abi: (Casino as any).abi,
    eventName: 'PlayResult',
    listener: (logs) => {
      for (const log of logs as any[]) {
        const [player, stake, delta, gameType] = log.args
        const isMine = address && String(player).toLowerCase() === address.toLowerCase()
        const gain = BigInt(delta) > 0n
        const val = Math.abs(Number(delta) / 1e18).toLocaleString()
        const gt = gameType === 0 ? 'Pan' : gameType === 1 ? 'Mine' : 'Slots'
        push({
          id: log.log?.transactionHash ?? crypto.randomUUID(),
          title: `${gt}: ${gain ? 'WIN' : 'LOSS'} ${val} BGLD ${isMine ? '— (You)' : ''}`,
          body: `Stake: ${Number(stake)/1e18} BGLD`,
          tone: gain ? 'win' : 'lose',
        })
      }
    },
  })

  useContractEvent({
    address: CASINO,
    abi: (Casino as any).abi,
    eventName: 'JackpotHit',
    listener: (logs) => {
      for (const log of logs as any[]) {
        const [player, amount, jtype] = log.args
        const pot = jtype === 0 ? 'Motherlode' : jtype === 1 ? 'Lucky' : 'Quick'
        const val = (Number(amount)/1e18).toLocaleString()
        push({
          id: log.log?.transactionHash ?? crypto.randomUUID(),
          title: `🎉 JACKPOT: ${pot}!`,
          body: `${val} BGLD to ${String(player).slice(0,6)}…${String(player).slice(-4)}`,
          tone: 'jackpot',
        })
      }
    },
  })

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[9999] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "pointer-events-auto w-[320px] rounded-xl border px-4 py-3 shadow-lg backdrop-blur",
            t.tone === 'win' ? "border-emerald-400/30 bg-emerald-400/10" :
            t.tone === 'lose' ? "border-red-400/30 bg-red-400/10" :
            "border-yellow-400/30 bg-yellow-400/10"
          ].join(' ')}
        >
          <div className="text-sm font-extrabold text-white">{t.title}</div>
          {t.body && <div className="text-[12px] text-white/70 mt-0.5">{t.body}</div>}
        </div>
      ))}
    </div>
  )
}
