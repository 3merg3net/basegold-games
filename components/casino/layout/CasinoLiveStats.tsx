// components/casino/layout/CasinoLiveStats.tsx
'use client'

import { useEffect, useState } from 'react'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

type Variant = 'arcade' | 'onchain' | 'live'

function baseSeeds(variant: Variant) {
  if (variant === 'arcade') {
    // casino floor – lots of small rounds
    return { a: 4_231, b: 119_204, c: 8 }
  }
  if (variant === 'onchain') {
    // overall casino volume (GLD)
    return { a: 2_184, b: 241_876, c: 12 }
  }
  // live poker / tables (PGLD rail)
  return { a: 163, b: 2_947, c: 2 }
}

export default function CasinoLiveStats({ variant }: { variant: Variant }) {
  const seeds = baseSeeds(variant)
  const [t, setT] = useState(0)

  // Still using arcade wallet as the GLD demo stack source
  const { credits } = useArcadeWallet()

  useEffect(() => {
    const id = setInterval(() => setT(prev => prev + 1), 4000)
    return () => clearInterval(id)
  }, [])

  const tweak = (base: number, delta: number) => base + (t % delta)

  const statA =
    variant === 'arcade'
      ? 'Spins / Hands Dealt'
      : variant === 'onchain'
      ? 'Casino Rounds Played'
      : 'Hands Dealt (Live)'

  const statB =
    variant === 'arcade'
      ? 'GLD Chips In Play'
      : variant === 'onchain'
      ? 'Total GLD Wagered'
      : 'PGLD Pot Volume'

  const statC =
    variant === 'arcade'
      ? 'Casino Games Online'
      : variant === 'onchain'
      ? 'Casino Tables & Slots'
      : 'Live Tables Online'

  const valueA = tweak(seeds.a, 37)

  const valueB =
    variant === 'arcade'
      ? credits // treat arcade wallet as GLD stack while comps / free chips are live
      : tweak(seeds.b, 317)

  const valueC = tweak(seeds.c, 7)

  return (
    <div className="grid grid-cols-3 gap-2 text-[11px] text-white/70">
      <div className="rounded-xl border border-white/15 bg-black/45 px-2.5 py-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">
          {statA}
        </div>
        <div className="mt-1 text-sm font-bold text-white tabular-nums">
          {valueA.toLocaleString()}
        </div>
      </div>
      <div className="rounded-xl border border-white/15 bg-black/45 px-2.5 py-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">
          {statB}
        </div>
        <div className="mt-1 text-sm font-bold text-emerald-300 tabular-nums">
          {valueB.toLocaleString()}
        </div>
      </div>
      <div className="rounded-xl border border-white/15 bg-black/45 px-2.5 py-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">
          {statC}
        </div>
        <div className="mt-1 text-sm font-bold text-sky-300 tabular-nums">
          {valueC.toLocaleString()}
        </div>
      </div>
    </div>
  )
}
