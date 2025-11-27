// app/arcade/blackjack/page.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'

import BlackjackDemo from '@/components/casino/arcade/BlackjackDemo'


import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'

export default function BlackjackArcadePage() {
  return (
    
      <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
        {/* HERO WRAPPER */}
        <section className="relative border-b border-white/10">
          {/* Background image (generic arcade / blackjack vibe) */}
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/arcade-hero-main.png"
              alt="Base Gold Rush arcade blackjack floor"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.88),rgba(0,0,0,0.97))]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-6 md:py-8">
            {/* Status + mode switcher to keep nav consistent */}
            
            

            {/* TOP COPY + HUD */}
            <div className="space-y-4 mb-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-[11px] text-white/60">
                    <Link
                      href="/arcade"
                      className="rounded-full border border-white/20 bg-black/60 px-2 py-0.5 hover:bg-white/5"
                    >
                      ← Back to Casino Arcade
                    </Link>
                    <span className="hidden sm:inline text-white/40">•</span>
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-emerald-200/90">
                      Arcade Blackjack Table
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                    Blackjack •{' '}
                    <span className="text-[#FFD700]">Casino Arcade</span>
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base text-white/80 max-w-xl">
                    Play full{' '}
                    <span className="font-semibold text-[#FFD700]">
                      Base Gold Rush Blackjack
                    </span>{' '}
                    with splits, doubles, and a clean dealer shoe — all running on BGRC
                    chips in the arcade stack. This is the exact table model that will map
                    into the on-chain casino and future cashier.
                  </p>
                </div>
                <div className="hidden sm:block text-[11px] text-white/60 max-w-xs text-right">
                  BGRC chips here are free-play for now. The pacing, UI and table logic
                  are being tuned so we can wire this layout straight into Base contracts
                  and the BGRC/BGLD cashier.
                </div>
              </div>

              {/* Shared BGRC arcade wallet HUD */}
              <ArcadeWalletHUD />
            </div>

            {/* GAME CONTAINER */}
            <div className="rounded-3xl border border-emerald-300/50 bg-black/80 shadow-[0_24px_80px_rgba(0,0,0,0.95)] p-3 sm:p-4 md:p-5">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px] sm:text-xs text-white/70">
                <div>
                  <div className="uppercase tracking-[0.22em] text-emerald-200/90">
                    Table Overview
                  </div>
                  <p className="mt-0.5 max-w-md">
                    Standard 21 rules, with arcade-speed dealing so you can feel how the
                    Base Gold Rush blackjack pit is going to move before the on-chain
                    switch flips.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                  <span className="rounded-full border border-emerald-300/60 bg-emerald-900/40 px-2 py-0.5">
                    BGRC chip stack shared across all arcade games
                  </span>
                  <span className="rounded-full border border-white/20 bg-black/60 px-2 py-0.5">
                    No wallet required • Mobile friendly
                  </span>
                </div>
              </div>

              {/* The actual blackjack table UI */}
              <div className="rounded-2xl border border-white/12 bg-black/80 p-2 sm:p-3 md:p-4">
                <BlackjackDemo />
              </div>

              <div className="mt-3 text-[11px] sm:text-xs text-white/55">
                Every hand you play here helps us dial in shoe size, bet pacing, and table
                feel. When the Base mainnet casino opens, this same layout will be wired
                into live contracts and the BGRC/BGLD cashier without changing the flow
                you’re used to.
              </div>
            </div>
          </div>
        </section>

        {/* LOWER COPY STRIP */}
        <section className="mx-auto max-w-6xl px-4 py-6 md:py-8 text-[11px] md:text-sm text-white/65 space-y-3">
          <p>
            The{' '}
            <span className="font-semibold text-[#FFD700]">
              Blackjack Casino Arcade table
            </span>{' '}
            is your preview of the full Base Gold Rush 21 pit. The way the dealer burns,
            flips, and settles here is how it will feel when chips route through smart
            contracts and the casino cashier.
          </p>
          <p>
            As we finish integrating the on-chain logic, you’ll see this table light up on
            the <span className="font-semibold text-sky-300">On-Chain Casino</span> floor,
            with the same visuals and betting flow — just fully settled on Base.
          </p>
        </section>
      </main>
    
  )
}
