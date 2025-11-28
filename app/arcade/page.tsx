// app/arcade/page.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import CasinoLiveStats from '@/components/casino/layout/CasinoLiveStats'

type CasinoGame = {
  href: string
  label: string
  tag: string
  desc: string
  icon: string
  category: 'Slots' | 'Table' | 'Poker' | 'Feature'
}

const casinoGames: CasinoGame[] = [
  {
    href: '/arcade/slots-arcade',
    label: 'Gold Rush Slots',
    tag: 'Multi-Line',
    desc: 'Classic Vegas-style reels with GLD chip ladders and bonus hits tuned for flow.',
    icon: '/icons/game-slots.png',
    category: 'Slots',
  },
  {
    href: '/arcade/roulette',
    label: 'Roulette',
    tag: 'European Wheel',
    desc: 'Red, black, and single zero on a smooth wheel that will map to live GLD stakes.',
    icon: '/icons/game-roulette1.png',
    category: 'Table',
  },
  {
    href: '/arcade/blackjack',
    label: 'Blackjack',
    tag: '21 Table',
    desc: 'Dial in your hit / stand / double rhythm before you sit into real GLD limits.',
    icon: '/icons/game-blackjack1.png',
    category: 'Table',
  },
  {
    href: '/arcade/craps',
    label: 'Craps',
    tag: 'Full Layout',
    desc: 'Pass line, odds, field, props, and hardways on a full-length felt tuned for GLD chips.',
    icon: '/icons/game-craps1.png',
    category: 'Table',
  },
  {
    href: '/arcade/baccarat',
    label: 'Baccarat',
    tag: 'Rail Table',
    desc: 'Player, Banker, Tie and Pair side bets in a classic baccarat lane with GLD pacing.',
    icon: '/icons/game-baccarat.png',
    category: 'Table',
  },
  {
    href: '/arcade/video-poker',
    label: 'Video Poker',
    tag: 'Jacks or Better',
    desc: 'Bar-top style Jacks or Better – perfect place to feel pay tables before on-chain GLD.',
    icon: '/icons/game-video-poker1.png',
    category: 'Poker',
  },
  {
    href: '/arcade/three-card-poker',
    label: 'Three Card Poker',
    tag: 'Feature Table',
    desc: 'Ante, Play, and Pair Plus bets vs the dealer on a full felt, wired for GLD chip logic.',
    icon: '/icons/game-three-card-poker.png',
    category: 'Poker',
  },
]

export default function CasinoLobbyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      {/* HERO / LOBBY HEADER */}
      <section className="relative border-b border-white/10">
        {/* Background image */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/arcade-hero-main.png"
            alt="Base Gold Rush casino floor"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.86),rgba(0,0,0,0.97))]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            {/* LEFT: Title + intro */}
            <div className="max-w-xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/40 bg-black/70 px-3 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FFD700]/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Base Gold Rush • Casino Lobby
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                Welcome to the{' '}
                <span className="text-[#FFD700]">Base Gold Rush Casino</span>.
              </h1>

              <p className="text-xs sm:text-sm md:text-base text-white/80">
                This is the main casino floor. GLD chips sit in front of you,
                tables and slots stretch in both directions, and every game is
                tuned to feel like a real Vegas pit running on Base.
              </p>

              <p className="text-[11px] md:text-xs text-white/65">
                Early players may see complimentary GLD chip stacks while we
                finish wiring the cashier and PGLD poker rail. Your play here
                helps lock in odds, pacing, and table flow for the full rollout.
              </p>

              <div className="mt-2 flex flex-wrap gap-2 text-[11px] sm:text-xs">
                <Link
                  href="/live-tables"
                  className="rounded-full border border-amber-300/70 bg-amber-900/40 px-3 py-1 font-semibold text-amber-100 hover:bg-amber-800/70"
                >
                  🃏 Enter Poker Room & Tables
                </Link>
                <Link
                  href="#games"
                  className="rounded-full border border-white/25 bg-black/70 px-3 py-1 font-semibold text-white/80 hover:bg-white/10 hover:text-white"
                >
                  🎰 Browse Casino Games
                </Link>
              </div>

              <div className="mt-3 max-w-xs">
                <CasinoLiveStats variant="arcade" />
              </div>
            </div>

            {/* RIGHT: Simple chip / table visual */}
            <div className="mt-4 md:mt-0 flex flex-1 justify-center md:justify-end">
              <div className="relative w-[260px] sm:w-[300px] md:w-[340px]">
                <div className="relative h-[200px] sm:h-[220px] rounded-3xl border border-[#FFD700]/40 bg-black/80 shadow-[0_24px_70px_rgba(0,0,0,0.95)] overflow-hidden">
                  <Image
                    src="/images/onchain-gold.png"
                    alt="GLD casino chips"
                    fill
                    sizes="340px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.4),transparent_60%)]" />
                  <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-1 text-[11px] text-white/75">
                    <span className="uppercase tracking-[0.18em] text-[#FFD700]/90">
                      GLD Casino Chips
                    </span>
                    <span className="text-white/70">
                      Cash in at the cage • Track balance in your wallet profile
                      when live
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN GAME GRID */}
      <section
        id="games"
        className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-5"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white">
              Choose your game
            </h2>
            <p className="text-xs md:text-sm text-white/65">
              Slots, wheels, cards, and dice — all tuned for GLD chip flow and
              a clean Base-native casino experience.
            </p>
          </div>
          <div className="text-[11px] text-white/50">
            Live poker runs through the PGLD rail on the tables floor.
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {casinoGames.map(game => (
            <Link
              key={game.href}
              href={game.href}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/12 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.16),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(15,23,42,0.96),#020617)] p-4 hover:border-[#FFD700]/70 hover:shadow-[0_0_32px_rgba(250,204,21,0.6)] transition"
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-2xl border border-white/20 bg-black/80 shadow-[0_0_20px_rgba(0,0,0,0.9)] overflow-hidden">
                  <Image
                    src={game.icon}
                    alt={game.label}
                    fill
                    sizes="64px"
                    className="object-contain p-1.5 group-hover:scale-110 transition-transform duration-300"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-semibold text-white truncate">
                      {game.label}
                    </h3>
                    <span className="rounded-full border border-[#FFD700]/60 bg-[#FFD700]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FFD700] whitespace-nowrap">
                      {game.tag}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/70 line-clamp-2">
                    {game.desc}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-white/55">
                <span className="uppercase tracking-[0.18em] text-white/45">
                  {game.category}
                </span>
                <span className="font-semibold text-[#FFD700] group-hover:translate-x-0.5 transition-transform">
                  Enter game →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* EARLY-ACCESS NOTE */}
        <div className="mt-4 rounded-2xl border border-white/12 bg-black/75 p-4 text-[11px] md:text-sm text-white/65 space-y-2">
          <p>
            For early guests, some games may run with{' '}
            <span className="font-semibold text-[#FFD700]">
              complimentary GLD chip stacks
            </span>{' '}
            while we finalize the cashier and PGLD tournament flows.
          </p>
          <p>
            Balances and session history will tie into your wallet profile and
            the cage once everything is fully lit. Treat this lobby as the live
            floor — we&apos;re just building the rails under your feet.
          </p>
        </div>
      </section>
    </main>
  )
}
