// app/play/dice/page.tsx
'use client'

import DiceGame from '@/components/casino/DiceGame'
import Link from 'next/link'

export default function DiceGamePage() {
  return (
    <main className="min-h-[calc(100vh-80px)] bg-[radial-gradient(circle_at_top,#020617,#020617_55%,#000000)] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.32em] text-[#FFD700]/80 uppercase">
              Base Gold Rush
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-wide">
              Golden Dice
            </h1>
            <p className="mt-2 text-sm text-white/70 max-w-xl">
              Classic Rollin Bones dice Game with clean Vegas feel, fast rounds, and on-chain
              resolution. Pick your line and let the bones roll.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="hidden md:inline">Navigate:</span>
            <Link
              href="/"
              className="rounded-full border border-white/20 px-3 py-1 hover:border-[#FFD700]/50 hover:text-[#FFD700]"
            >
              ⟵ Back to Home
            </Link>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/15 bg-gradient-to-br from-[#071017] via-[#05070d] to-black p-4 md:p-5 shadow-[0_18px_55px_rgba(0,0,0,0.9)]">
          <DiceGame />
        </div>

        <div className="text-[11px] text-white/50">
          Demo UI will run off local RNG until the full on-chain Dice V3 hooks
          are wired. All odds and payouts are visible in the game panel.
        </div>
      </div>
    </main>
  )
}
