// components/casino/layout/CasinoLiveStats.tsx
'use client'

import { useEffect, useState } from 'react'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

type Variant = 'arcade' | 'onchain' | 'live'

function baseSeeds(variant: Variant) {
  if (variant === 'arcade') {
    return { a: 4_231, b: 119_204, c: 8 }
  }
  if (variant === 'onchain') {
    return { a: 982, b: 41_876, c: 5 }
  }
  // live
  return { a: 163, b: 2_947, c: 2 }
}

export default function CasinoLiveStats({ variant }: { variant: Variant }) {
  const seeds = baseSeeds(variant)
  const [t, setT] = useState(0)

  // 🔗 Pull from arcade wallet (safe fallback elsewhere)
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
      ? 'On-Chain Rounds'
      : 'Hands Dealt (Live)'

  const statB =
    variant === 'arcade'
      ? 'BGRC Chips In Play'
      : variant === 'onchain'
      ? 'Testnet BGRC Wagered'
      : 'Pot Volume'

  const statC =
    variant === 'arcade'
      ? 'Arcade Games Online'
      : variant === 'onchain'
      ? 'On-Chain Tables & Slots'
      : 'Live Tables Online'

  // 📊 Values
  const valueA =
    variant === 'arcade'
      ? tweak(seeds.a, 37)
      : tweak(seeds.a, 37)

  const valueB =
    variant === 'arcade'
      ? credits // ✅ live wallet balance
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
