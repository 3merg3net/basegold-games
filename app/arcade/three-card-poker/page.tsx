'use client'

import Image from 'next/image'
import Link from 'next/link'

import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'
import CasinoStatusStrip from '@/components/casino/layout/CasinoStatusStrip'
import CasinoModeSwitcher from '@/components/casino/layout/CasinoModeSwitcher'
import ThreeCardPokerArcade from '@/components/casino/arcade/ThreeCardPokerArcade'

export default function ThreeCardPokerArcadePage() {
  return (
    
      <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
        
        {/* HERO WRAPPER */}
        <section className="relative border-b border-white/10">
          
          {/* Background */}
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/arcade-hero-main.png"
              alt="Three Card Poker Table"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.88),rgba(0,0,0,0.96))]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-6 md:py-8 space-y-4">

            {/* Status Bar + Mode Switch */}
            <CasinoStatusStrip mode="arcade" />
            <CasinoModeSwitcher active="arcade" />

            {/* TOP COPY + HUD */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-[11px] text-white/60">
                  <Link
                    href="/arcade"
                    className="rounded-full border border-white/20 bg-black/60 px-2 py-0.5 hover:bg-white/5"
                  >
                    ← Back to Casino Arcade
                  </Link>
                  <span className="hidden sm:inline text-white/40">•</span>
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-emerald-200/90">
                    Three Card Poker Table
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                  Three Card Poker • <span className="text-[#FFD700]">Arcade</span>
                </h1>

                <p className="text-xs sm:text-sm md:text-base text-white/80 max-w-xl">
                  Ante, Play, and Pair-Plus side bets in a{' '}
                  <span className="font-semibold text-[#FFD700]">multi-seat table</span>.
                  This arcade version uses BGRC demo credits and mirrors the exact layout
                  that will become the Three Card Poker live table in the Base Gold Rush 
                  on-chain casino.
                </p>
              </div>

              <div className="w-full md:max-w-xs">
                <ArcadeWalletHUD />
              </div>
            </div>

            {/* GAME AREA */}
            <div className="rounded-3xl border border-emerald-300/50 bg-black/85 shadow-[0_24px_80px_rgba(0,0,0,0.95)] p-3 sm:p-4 md:p-5">
              
              {/* Table Overview */}
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px] sm:text-xs text-white/70">
                <div>
                  <div className="uppercase tracking-[0.22em] text-emerald-200/90">
                    Table Overview
                  </div>
                  <p className="mt-0.5 max-w-md">
                    Fast Ante/Play betting, automatic dealer qualification logic, and 
                    polished side-bet animations. The whole layout is designed so we can 
                    push it directly on-chain without redesigning anything.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                  <span className="rounded-full border border-emerald-300/60 bg-emerald-900/40 px-2 py-0.5">
                    BGRC chips • Shared arcade wallet
                  </span>
                  <span className="rounded-full border border-white/20 bg-black/60 px-2 py-0.5">
                    Free Play • Mobile Friendly
                  </span>
                </div>
              </div>

              {/* THE ACTUAL GAME */}
              <div className="rounded-2xl border border-white/12 bg-black/85 p-2 sm:p-3 md:p-4">
                <ThreeCardPokerArcade />
              </div>

              {/* LOWER COPY */}
              <div className="mt-3 text-[11px] sm:text-xs text-white/55">
                When the Base Gold Rush live tables go on-chain, this exact Three Card 
                Poker layout will be settlement-ready using BGRC/BGLD chips and smart 
                contract dealer rules. No UI switch — just full mainnet power underneath.
              </div>

            </div>
          </div>
        </section>
      </main>
    
  )
}
