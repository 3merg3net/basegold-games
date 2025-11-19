// components/casino/layout/CasinoLiveStats.tsx
'use client'

import { useEffect, useState } from 'react'

type Variant = 'arcade' | 'onchain' | 'live'

function baseSeeds(variant: Variant) {
  if (variant === 'arcade') {
    return { a: 4231, b: 119_204, c: 312 }
  }
  if (variant === 'onchain') {
    return { a: 982, b: 41_876, c: 28 }
  }
  // live
  return { a: 163, b: 2_947, c: 12 }
}

export default function CasinoLiveStats({ variant }: { variant: Variant }) {
  const seeds = baseSeeds(variant)
  const [t, setT] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setT(prev => prev + 1), 4000)
    return () => clearInterval(id)
  }, [])

  const tweak = (base: number, delta: number) => base + (t % delta)

  const statA =
    variant === 'arcade'
      ? 'Spins Dealt'
      : variant === 'onchain'
      ? 'On-Chain Rounds'
      : 'Hands Dealt (Alpha)'

  const statB =
    variant === 'arcade'
      ? 'Demo Credits Won'
      : variant === 'onchain'
      ? 'Testnet Chips Bet'
      : 'Pot Volume (Demo)'

  const statC =
    variant === 'arcade'
      ? 'Machines Online'
      : variant === 'onchain'
      ? 'Tables & Slots'
      : 'Live Tables Online'

  return (
    <div className="grid grid-cols-3 gap-2 text-[11px] text-white/70">
      <div className="rounded-xl border border-white/15 bg-black/45 px-2.5 py-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">
          {statA}
        </div>
        <div className="mt-1 text-sm font-bold text-white tabular-nums">
          {tweak(seeds.a, 37).toLocaleString()}
        </div>
      </div>
      <div className="rounded-xl border border-white/15 bg-black/45 px-2.5 py-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">
          {statB}
        </div>
        <div className="mt-1 text-sm font-bold text-emerald-300 tabular-nums">
          {tweak(seeds.b, 317).toLocaleString()}
        </div>
      </div>
      <div className="rounded-xl border border-white/15 bg-black/45 px-2.5 py-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">
          {statC}
        </div>
        <div className="mt-1 text-sm font-bold text-sky-300 tabular-nums">
          {tweak(seeds.c, 7).toLocaleString()}
        </div>
      </div>
    </div>
  )
}
