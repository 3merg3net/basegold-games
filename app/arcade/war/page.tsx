'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArcadeWalletProvider } from '@/lib/useArcadeWallet'
import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'
import CasinoStatusStrip from '@/components/casino/layout/CasinoStatusStrip'
import CasinoModeSwitcher from '@/components/casino/layout/CasinoModeSwitcher'
import WarDemo from '@/components/casino/arcade/WarDemo'

export default function WarArcadePage() {
  return (
    <ArcadeWalletProvider>
      <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">

        {/* HERO / HEADER */}
        <section className="relative border-b border-white/10">
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/arcade-hero-main.png"
              alt="Base Gold Rush War table"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.8),rgba(0,0,0,0.97))]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-6 md:py-8 space-y-4">
            <CasinoStatusStrip mode="arcade" />
            <CasinoModeSwitcher active="arcade" />

            <div className="space-y-3">
              <Link
                href="/arcade"
                className="w-fit rounded-full border border-white/20 bg-black/50 px-3 py-1 text-[11px] text-white/60 hover:bg-white/5"
              >
                ← Back to Arcade
              </Link>

              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                War • <span className="text-[#FFD700]">Casino Arcade</span>
              </h1>

              <p className="text-sm md:text-base text-white/80 max-w-xl">
                A fast, high-energy{' '}
                <span className="font-semibold text-[#FFD700]">heads-up card
                battle</span> that will be one of the first live multiplayer
                tables on Base. BGRC chips let you play instantly while we
                finalize the on-chain cashier connection.
              </p>

              {/* HUD */}
              <ArcadeWalletHUD />
            </div>

            {/* GAME */}
            <div className="rounded-3xl border border-white/15 bg-black/80 p-3 sm:p-4 md:p-5 shadow-[0_20px_70px_rgba(0,0,0,0.95)]">
              <WarDemo />
            </div>

            {/* RULES + LIVE TEASER */}
            <div className="mt-4 space-y-4 text-[11px] sm:text-xs md:text-sm text-white/70">
              <div>
                <span className="uppercase tracking-[0.22em] text-emerald-200/90">
                  Quick Rules of War
                </span>
                <p className="mt-1">
                  You and the dealer each draw one card. Higher card wins. Tie?
                  <strong> War!</strong> — both sides burn a card and pull again.
                  Simple, fast, and perfect for arcade-speed action before the
                  real money tables open.
                </p>
              </div>

              <div>
                <span className="uppercase tracking-[0.22em] text-sky-300/90">
                  Live Multiplayer Coming
                </span>
                <p className="mt-1">
                  One of the first games going live in the Base Gold Rush card
                  room. Real-time matchmaking, table chat, and on-chain settlement
                  will make War one of the most viral live games in the entire
                  ecosystem.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>
    </ArcadeWalletProvider>
  )
}
