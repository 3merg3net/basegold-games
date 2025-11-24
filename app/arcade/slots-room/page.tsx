'use client'

import Link from 'next/link'
import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'
import SlotsArcadeMachine from '@/components/casino/arcade/SlotsArcadeMachine'
import TriWheelFortuneArcadeMachine from '@/components/casino/arcade/TriWheelFortuneArcadeMachine'
import HandYoureDealtArcadeMachine from '@/components/casino/arcade/HandYoureDealtArcadeMachine'
import GoldenAlignmentArcadeMachine from '@/components/casino/arcade/GoldenAlignmentArcadeMachine'

export default function SlotsRoomPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <section className="mx-auto max-w-5xl px-3 py-4 space-y-4">
        {/* TOP STRIP */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            🎰 <span className="text-[#facc15]">Base Gold Rush Slots Room</span>
          </h1>

          <Link
            href="/arcade"
            className="rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:bg-white/5"
          >
            ← Arcade
          </Link>
        </div>

        <p className="text-[11px] sm:text-xs md:text-sm text-white/70 max-w-xl">
          This is the experimental slots lab for Base Gold Rush — every cabinet running on
          the same BGRC demo wallet. Classic reels, tri-wheel experiments, reel poker, and
          Golden Alignment puzzles all live here before they ship on-chain.
        </p>

        {/* HUD (shared balance across all cabinets) */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-2">
          <ArcadeWalletHUD />
        </div>

        <div className="space-y-6 md:space-y-8">
          {/* Gold Rush Slots */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  Gold Rush Slots
                </h2>
                <p className="text-[11px] text-white/65">
                  Classic 3-reel cabinet with three horizontal paylines, tuned to feel like
                  a real Vegas floor while you play with BGRC demo credits.
                </p>
              </div>
            </div>
            <SlotsArcadeMachine />
          </section>

          {/* Tri-Wheel Fortune */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  Tri-Wheel Fortune
                </h2>
                <p className="text-[11px] text-white/65">
                  Three mini roulette wheels spin together with combo payouts, zero magic,
                  and an optional side bet on the center wheel.
                </p>
              </div>
            </div>
            <TriWheelFortuneArcadeMachine />
          </section>

          {/* Hand You&apos;re Dealt */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  Hand You&apos;re Dealt
                </h2>
                <p className="text-[11px] text-white/65">
                  Five-card reel poker in a cabinet. Spin for made hands, chase the WILD on
                  the last reel, and unlock bonus spins with holds and 2× multipliers.
                </p>
              </div>
            </div>
            <HandYoureDealtArcadeMachine />
          </section>

          {/* Golden Alignment */}
          <section className="space-y-2 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  Golden Alignment
                </h2>
                <p className="text-[11px] text-white/65">
                  Puzzle slots: each reel is a slice of BGLD, nuggets, or the vault. Spin
                  the strips top-to-bottom and crack full alignments for escalating
                  payouts.
                </p>
              </div>
            </div>
            <GoldenAlignmentArcadeMachine />
          </section>
        </div>
      </section>
    </main>
  )
}
