'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArcadeWalletProvider } from '@/lib/useArcadeWallet'
import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'
import CasinoStatusStrip from '@/components/casino/layout/CasinoStatusStrip'
import CasinoModeSwitcher from '@/components/casino/layout/CasinoModeSwitcher'
import CrapsDemo from '@/components/casino/arcade/CrapsDemo'

export default function CrapsArcadePage() {
  return (
    <ArcadeWalletProvider>
      <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">

        {/* HERO SECTION */}
        <section className="relative border-b border-white/10">
          {/* background */}
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/arcade-hero-main.png"
              alt="Base Gold Rush craps table"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.8),rgba(0,0,0,0.97))]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-6 md:py-8 space-y-4">
            <CasinoStatusStrip mode="arcade" />
            <CasinoModeSwitcher active="arcade" />

            {/* HEADER + COPY */}
            <div className="flex flex-col gap-2">
              <Link
                href="/arcade"
                className="w-fit rounded-full border border-white/20 bg-black/50 px-3 py-1 text-[11px] text-white/60 hover:bg-white/5"
              >
                ← Back to Arcade
              </Link>

              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Craps • <span className="text-[#FFD700]">Casino Arcade</span>
              </h1>

              <p className="text-sm md:text-base text-white/80 max-w-2xl">
                Roll the bones and run the classic Vegas{' '}
                <span className="font-semibold text-[#FFD700]">Craps table</span>{' '}
                in full BGRC free-play mode. This is the same layout the live
                multiplayer craps pit will use when Base Gold Rush goes on-chain.
              </p>

              {/* HUD */}
              <ArcadeWalletHUD />
            </div>

            {/* GAME */}
            <div className="rounded-3xl border border-emerald-300/40 bg-black/85 shadow-[0_20px_70px_rgba(0,0,0,0.95)] p-3 sm:p-4 md:p-6">
              <CrapsDemo />
            </div>

            {/* HOW TO PLAY */}
            <div className="mt-4 space-y-3 text-[11px] sm:text-xs md:text-sm text-white/70">
              <div>
                <span className="uppercase tracking-[0.22em] text-emerald-200/90">
                  How Craps Works
                </span>
                <p className="mt-1">
                  Players bet on the outcome of two dice. The{' '}
                  <strong>Pass Line</strong> is the main bet: hit a 7 or 11 on
                  the come-out roll to win, or avoid 2/3/12 (craps). If a point
                  is set, hit it again before a 7. This arcade table mirrors
                  Vegas pacing so you get the real flow before the on-chain pit
                  opens.
                </p>
              </div>

              <div>
                <span className="uppercase tracking-[0.22em] text-sky-300/90">
                  Live Tables Coming Soon
                </span>
                <p className="mt-1">
                  The multiplayer craps pit is already in development. Dice roll
                  proofs, table chat, and on-chain settlement will route through
                  the BGRC/BGLD cashier the moment live tables go online.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </ArcadeWalletProvider>
  )
}
