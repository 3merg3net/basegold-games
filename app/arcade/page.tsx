// app/arcade/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import CasinoStatusStrip from '@/components/casino/layout/CasinoStatusStrip'
import CasinoModeSwitcher from '@/components/casino/layout/CasinoModeSwitcher'
import CasinoLiveStats from '@/components/casino/layout/CasinoLiveStats'
import { ArcadeWalletProvider } from '@/lib/useArcadeWallet'
import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'

type ArcadeGame = {
  href: string
  label: string
  tag: string
  desc: string
  icon: string
}

const arcadeGames: ArcadeGame[] = [
  {
    href: '/arcade/slots-arcade',
    label: 'Gold Rush Slots (Arcade)',
    tag: 'Video Slots',
    desc: 'Hyper-real cabinet with free-play BGRC demo chips.',
    icon: '/icons/game-slots.png',
  },
  {
    href: '/arcade/roulette',
    label: 'Roulette (Arcade)',
    tag: 'Golden Wheel',
    desc: 'European wheel, full multipliers, free demo chips.',
    icon: '/icons/game-roulette1.png',
  },
  {
    href: '/arcade/blackjack',
    label: 'Blackjack (Arcade)',
    tag: '21 Demo Table',
    desc: 'Multi-seat blackjack layout with splits and doubles.',
    icon: '/icons/game-blackjack1.png',
  },
  {
    href: '/arcade/craps',
    label: 'Craps (Arcade)',
    tag: 'Full Table',
    desc: 'Pass line, odds, field, props, and hardways.',
    icon: '/icons/game-craps1.png',
  },
  {
    href: '/arcade/war',
    label: 'War (Arcade)',
    tag: 'High Card',
    desc: 'Fast flips vs the house — higher card wins.',
    icon: '/icons/game-war.png',
  },
  {
    href: '/arcade/baccarat',
    label: 'Baccarat (Arcade)',
    tag: 'Rail Table',
    desc: 'Player, Banker, Tie + Pair side bets on demo chips.',
    icon: '/icons/game-baccarat.png',
  },
  {
    href: '/arcade/video-poker',
    label: 'Video Poker (Arcade)',
    tag: 'Bar-Top',
    desc: 'Jacks or Better bar-top cabinet, free-play mode.',
    icon: '/icons/game-video-poker1.png',
  },
  {
    href: '/arcade/three-card-poker',
    label: 'Three Card Poker (Arcade)',
    tag: 'Feature Table',
    desc: 'Ante, Play, and Pair Plus in full 3-card layout.',
    icon: '/icons/game-three-card-poker.png',
  },
]

export default function ArcadePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      {/* HERO */}
      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/arcade-hero-main.png"
            alt="Demo arcade floor"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.85),rgba(0,0,0,0.96))]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12">
          <CasinoStatusStrip mode="arcade" />
          <CasinoModeSwitcher active="arcade" />

          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <div className="flex-1 space-y-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                Demo Arcade Floor
              </h1>
              <p className="text-sm md:text-base text-white/75 max-w-xl">
                This is the free-play, no-pressure floor of Base Gold Rush. Every machine
                and table here runs on BGRC demo credits only. We use this arcade to tune
                multipliers, animations, and pacing before locking in the on-chain casino.
              </p>
              <p className="text-[11px] md:text-xs text-white/60 max-w-xl">
                Spins, deals, and rolls in this arcade are fully front-end —{' '}
                <span className="font-semibold text-emerald-300">
                  no wallet required
                </span>
                . The exact UX you see here will graduate into dedicated on-chain contracts
                on Base with provable randomness and live payouts.
              </p>

              <div className="max-w-md">
                <CasinoLiveStats variant="arcade" />
              </div>
            </div>

            <div className="flex-1 flex justify-center md:justify-end">
              <div className="relative w-full max-w-[380px] rounded-3xl border border-emerald-300/50 bg-black/80 shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden">
                <div className="relative h-40 sm:h-48">
                  <Image
                    src="/images/arcade-card-bg.png"
                    alt="Arcade floor overview"
                    fill
                    sizes="380px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/90">
                      Demo Arcade
                    </div>
                    <div className="text-lg font-bold text-white">
                      Free-Play Machines
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 text-[11px] text-emerald-100/80">
                  <p>
                    Start here if you’re on mobile or just exploring. Learn the flow of
                    each game, find the pacing you like, and then step into{' '}
                    <span className="font-semibold text-[#60a5fa]">
                      on-chain tables
                    </span>{' '}
                    when you’re ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ARCADE GAMES GRID */}
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <ArcadeWalletProvider>
          <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg md:text-xl font-bold">
                Pick a machine or table
              </h2>
              <p className="text-xs md:text-sm text-white/60 max-w-xl">
                All arcade games run on a shared BGRC demo wallet so you can bounce between
                slots, tables, and wheels without reconnecting anything.
              </p>
            </div>
            <div className="text-[11px] text-white/50">
              Demo balances reset easily — this phase is for tuning, not grinding.
            </div>
          </div>

          <ArcadeWalletHUD />

          <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  {arcadeGames.map(game => (
    <Link
      key={game.href}
      href={game.href}
      className="group relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.3),transparent_60%),radial-gradient(circle_at_0%_100%,rgba(15,23,42,0.9),#020617)] p-5 sm:p-6 min-h-[132px] hover:border-emerald-300/90 hover:shadow-[0_0_32px_rgba(16,185,129,0.7)] transition"

    >
      <div className="flex items-center gap-3">
        {/* 🔥 ICON TILE WITH BACKGROUND */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex-shrink-0 rounded-2xl border border-emerald-200/70 bg-black/80 shadow-[0_0_22px_rgba(16,185,129,0.75)] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.8),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(250,204,21,0.45),transparent_55%)] opacity-85" />
          <Image
            src={game.icon}
            alt={game.label}
            fill
            sizes="96px"
            className="relative object-contain p-1.5 group-hover:scale-110 transition-transform duration-300"
          />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm md:text-base font-semibold text-white">
              {game.label}
            </h3>
            <span className="rounded-full border border-emerald-300/70 bg-emerald-900/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
              {game.tag}
            </span>
          </div>
          <p className="text-[11px] text-white/70 line-clamp-2">
            {game.desc}
          </p>
          <div className="text-[11px] text-emerald-200 flex items-center gap-1">
            <span className="group-hover:translate-x-0.5 transition-transform">
              Play free →
            </span>
          </div>
        </div>
      </div>
    </Link>
  ))}
</div>

        </ArcadeWalletProvider>
      </section>
    </main>
  )
}
