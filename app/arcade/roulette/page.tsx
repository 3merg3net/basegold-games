// app/arcade/roulette/page.tsx
'use client'

import Image from 'next/image'

import CasinoLiveStats from '@/components/casino/layout/CasinoLiveStats'

import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'
import RouletteArcadeMachine from '@/components/casino/arcade/RouletteArcadeMachine'

export default function RouletteArcadePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <section className="relative border-b border-white/10">
        {/* Background image */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/arcade-hero-main.png"
            alt="Base Gold Rush roulette arcade"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.86),rgba(0,0,0,0.97))]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10">
          {/* Top status + mode switcher */}
          

          
            <div className="mt-4 space-y-4">
              {/* Intro copy + wallet HUD + light stats */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                    Golden Wheel Roulette{' '}
                    <span className="text-[#FFD700]">• Arcade Floor</span>
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base text-white/80 max-w-xl">
                    Spin the{' '}
                    <span className="font-semibold text-[#FFD700]">
                      Base Gold Rush
                    </span>{' '}
                    wheel with BGRC arcade chips and feel exactly how the on-chain
                    roulette tables will hit once they&apos;re wired into live
                    contracts on Base.
                  </p>
                  <p className="text-[11px] md:text-xs text-white/60 max-w-xl">
                    Same layout, same multipliers, same pacing — this machine is the
                    pre-mainnet model for the full{' '}
                    <span className="font-semibold text-sky-300">
                      Base Gold Rush roulette pit
                    </span>
                    . We&apos;re using it to dial in UX and flow before we flip the
                    contracts live.
                  </p>
                </div>

                {/* Shared arcade wallet HUD (BGRC credits) */}
                <ArcadeWalletHUD />

                <div className="max-w-xs">
                  <CasinoLiveStats variant="arcade" />
                </div>
              </div>

              {/* Main game: full-width machine, not shoved into a sidebar */}
              <div className="w-full">
                <RouletteArcadeMachine />
              </div>
            </div>
          
        </div>
      </section>
    </main>
  )
}
