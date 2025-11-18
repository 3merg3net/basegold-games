'use client'
import { useState } from 'react'

const steps = [
  {
    k: 'stake',
    title: '1) Set Your Stake',
    body: 'Pick a bet in BGLD. Small or spicy — it’s your swing. Higher stakes = higher pulse.',
  },
  {
    k: 'approve',
    title: '2) Approve Once',
    body: 'First time only: approve the casino to use your BGLD. After that, it’s one-click mining.',
  },
  {
    k: 'swing',
    title: '3) Swing the Pickaxe',
    body: 'Hit “Swing” to commit your wager on-chain. RNG rolls. Win small, win big, or hit a jackpot.',
  },
  {
    k: 'jackpots',
    title: 'Jackpots',
    body: 'Three live pots: Quick Hit (frequent), Lucky Strike (mid), Motherlode (rare, massive). Any play can trigger one.',
  },
  {
    k: 'economy',
    title: 'Protocol Economy',
    body: 'A slice of each play tops up jackpots, feeds the staking vault, and fuels the treasury — building Base Gold.',
  },
]

export default function MineExplainer() {
  const [open, setOpen] = useState<string>('stake')

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0a0a0f] to-black p-5">
      <div className="flex items-center justify-between">
        <div className="text-[#FFD700] font-extrabold text-xl tracking-wide">
          How Mining Works
        </div>
        <div className="text-white/60 text-xs">Transparent odds · On-chain results</div>
      </div>

      <div className="mt-4 grid gap-2">
        {steps.map(s => {
          const active = open === s.k
          return (
            <button
              key={s.k}
              onClick={() => setOpen(active ? '' : s.k)}
              className={[
                'text-left rounded-xl border px-4 py-3 transition-all',
                active
                  ? 'border-yellow-400/40 bg-yellow-400/10 shadow-[0_0_20px_rgba(255,215,0,0.12)]'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-white">{s.title}</div>
                <div className={['text-xs', active ? 'text-yellow-300' : 'text-white/50'].join(' ')}>
                  {active ? 'Hide' : 'Read'}
                </div>
              </div>
              {active && (
                <div className="mt-1.5 text-white/80 text-sm">{s.body}</div>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 text-[12px] text-white/50">
        Tip: Quick Hits pop often. Motherlode grows over time — that’s where legends are made.
      </div>
    </div>
  )
}
