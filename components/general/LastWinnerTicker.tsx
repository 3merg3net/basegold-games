'use client'
import { useEffect, useMemo, useState } from 'react'
import { useContractEvent } from 'wagmi'
import Casino from '@/abis/BaseGoldCasino.json'

const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}`

type LastWin =
  | { kind: 'jackpot'; pot: 'Motherlode' | 'Lucky' | 'Quick'; amount: number; player: string }
  | { kind: 'result'; game: 'Pan' | 'Mine' | 'Slots'; delta: number; stake: number; player: string }

export default function LastWinnerTicker() {
  const [last, setLast] = useState<LastWin | null>(null)

  // JackpotHit(player, amount, jackpotType)
  useContractEvent({
    address: CASINO,
    abi: (Casino as any).abi,
    eventName: 'JackpotHit',
    listener: (logs) => {
      for (const log of logs as any[]) {
        const [player, amount, jtype] = log.args
        const pot = jtype === 0 ? 'Motherlode' : jtype === 1 ? 'Lucky' : 'Quick'
        setLast({
          kind: 'jackpot',
          pot,
          amount: Number(amount) / 1e18,
          player: String(player),
        })
      }
    },
  })

  // PlayResult(player, stake, delta, gameType, seed)
  useContractEvent({
    address: CASINO,
    abi: (Casino as any).abi,
    eventName: 'PlayResult',
    listener: (logs) => {
      for (const log of logs as any[]) {
        const [player, stake, delta, gameType] = log.args
        const game = gameType === 0 ? 'Pan' : gameType === 1 ? 'Mine' : 'Slots'
        setLast({
          kind: 'result',
          game,
          delta: Number(delta) / 1e18,
          stake: Number(stake) / 1e18,
          player: String(player),
        })
      }
    },
  })

  const text = useMemo(() => {
    if (!last) return 'Waiting for wins…'
    if (last.kind === 'jackpot') {
      const short = `${last.player.slice(0, 6)}…${last.player.slice(-4)}`
      return `🎉 JACKPOT ${last.pot.toUpperCase()} — ${last.amount.toLocaleString()} BGLD to ${short}!`
    } else {
      const short = `${last.player.slice(0, 6)}…${last.player.slice(-4)}`
      const badge = last.delta >= 0 ? `WIN +${last.delta.toLocaleString()} BGLD` : `LOSS ${last.delta.toLocaleString()} BGLD`
      return `🪙 ${last.game.toUpperCase()} — ${badge} (stake ${last.stake.toLocaleString()} BGLD) — ${short}`
    }
  }, [last])

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-[#0a0a0f] to-black">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,#FFD70022,transparent_60%)]" />
      <div className="whitespace-nowrap py-2 font-bold text-white tracking-wide animate-[winnerMarquee_14s_linear_infinite]">
        {text}&nbsp;&nbsp;&nbsp;&nbsp;{text}&nbsp;&nbsp;&nbsp;&nbsp;{text}
      </div>
      <style jsx>{`
        @keyframes winnerMarquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
