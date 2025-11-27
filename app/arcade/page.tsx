import Link from 'next/link'
import Image from 'next/image'

import CasinoLiveStats from '@/components/casino/layout/CasinoLiveStats'

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
    href: '/arcade/roulette',
    label: 'Roulette',
    tag: 'Golden Wheel',
    desc: 'European wheel with rich multipliers and flowing chip action.',
    icon: '/icons/game-roulette1.png',
  },
  {
    href: '/arcade/blackjack',
    label: 'Blackjack',
    tag: '21 Table',
    desc: 'Multi-seat blackjack with splits, doubles, surrender, and clean dealer logic.',
    icon: '/icons/game-blackjack1.png',
  },
  {
    href: '/arcade/craps',
    label: 'Craps',
    tag: 'Full Table',
    desc: 'Pass line, odds, field, props, and hardways on a full Vegas-style layout.',
    icon: '/icons/game-craps1.png',
  },
  {
    href: '/arcade/war',
    label: 'War',
    tag: 'High Card',
    desc: 'Fast high-card showdowns vs the house with instant reveals.',
    icon: '/icons/game-war.png',
  },
  {
    href: '/arcade/baccarat',
    label: 'Baccarat',
    tag: 'Rail Table',
    desc: 'Player, Banker, Tie, and Pair side bets on a classic baccarat rail.',
    icon: '/icons/game-baccarat.png',
  },
  {
    href: '/arcade/video-poker',
    label: 'Video Poker',
    tag: 'Bar-Top',
    desc: 'Jacks or Better bar-top cabinet with full draw/hold flow in free-play.',
    icon: '/icons/game-video-poker1.png',
  },
  {
    href: '/arcade/three-card-poker',
    label: 'Three Card Poker',
    tag: 'Feature Table',
    desc: 'Ante, Play, and Pair Plus bets vs the dealer on a full three-card layout.',
    icon: '/icons/game-three-card-poker.png',
  },
]

export default function ArcadePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      {/* HERO + FLOOR */}
      <section className="relative border-b border-white/10">
        {/* Background image */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/arcade-hero-main.png"
            alt="Base Gold Rush free-play casino floor"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.86),rgba(0,0,0,0.97))]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10">
          

          
            <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
              {/* LEFT: GAMES FRONT & CENTER */}
              <div>
                <div className="space-y-2 mb-4">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                    Free-Play Casino Floor
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base text-white/75 max-w-xl">
                    Sit down, play with BGRC chips, and feel how the{' '}
                    <span className="font-semibold text-[#FFD700]">
                      Base Gold Rush
                    </span>{' '}
                    tables will flow when they&apos;re fully wired into smart contracts
                    on the Base chain.
                  </p>
                  <p className="text-[11px] md:text-xs text-white/65 max-w-xl">
                    This floor is your preview. Same layouts, same pacing, same rail
                    energy — today it&apos;s free-play chips, tomorrow it&apos;s on-chain{' '}
                    <span className="font-semibold text-[#60a5fa]">
                      BGRC / BGLD-powered
                    </span>{' '}
                    games on Base mainnet.
                  </p>
                </div>

                {/* Free-play wallet HUD */}
                <div className="mb-4">
                  <ArcadeWalletHUD />
                </div>

                {/* FEATURED SLOTS ROOM CARD */}
                <div className="mb-4">
                  <Link
                    href="/arcade/slots-arcade"
                    className="group relative block overflow-hidden rounded-3xl border border-yellow-300/70 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.35),transparent_60%),radial-gradient(circle_at_0%_100%,rgba(15,23,42,0.98),#020617)] p-4 sm:p-5 hover:border-yellow-300 hover:shadow-[0_0_40px_rgba(250,204,21,0.9)] transition"
                  >
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-2xl border border-yellow-300/80 bg-black/90 shadow-[0_0_26px_rgba(250,204,21,0.9)] overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,0.9),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(59,130,246,0.65),transparent_55%)] opacity-95" />
                        <Image
                          src="/icons/game-slots.png"
                          alt="Slots Room"
                          fill
                          sizes="96px"
                          className="relative object-contain p-2 group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.24em] text-yellow-200/85">
                              Featured
                            </div>
                            <h2 className="text-sm sm:text-lg font-semibold text-white">
                              Slots Room — Gold Rush Cabinets
                            </h2>
                          </div>
                          <span className="rounded-full border border-yellow-300/80 bg-yellow-400/15 px-2 py-0.5 text-[10px] font-semibold text-yellow-100 whitespace-nowrap">
                            4 Custom Slots
                          </span>
                        </div>
                        <p className="text-[11px] text-white/75 max-w-lg">
                          Step into the dedicated slots lane: classic 3-reel Gold Rush,
                          Tri-Wheel roulette hybrid, Hand You&apos;re Dealt reel poker,
                          and the new Golden Alignment puzzle slot.
                        </p>
                        <div className="text-[11px] text-yellow-200 flex items-center gap-1">
                          <span className="group-hover:translate-x-0.5 transition-transform">
                            Enter Slots Room →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* GAME GRID (non-slot games) */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
                  {arcadeGames.map(game => (
                    <Link
                      key={game.href}
                      href={game.href}
                      className="group relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.3),transparent_60%),radial-gradient(circle_at_0%_100%,rgba(15,23,42,0.95),#020617)] p-4 sm:p-5 hover:border-emerald-300/90 hover:shadow-[0_0_32px_rgba(16,185,129,0.7)] transition"
                    >
                      <div className="flex items-center gap-3">
                        {/* ICON TILE */}
                        <div className="relative w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 flex-shrink-0 rounded-2xl border border-emerald-200/70 bg-black/80 shadow-[0_0_22px_rgba(16,185,129,0.75)] overflow-hidden">
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
                              Play now →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* RIGHT: HYPE + CONTEXT CARD */}
              <div className="space-y-4">
                <div className="relative w-full max-w-[380px] mx-auto rounded-3xl border border-emerald-300/60 bg-black/85 shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden">
                  <div className="relative h-40 sm:h-48">
                    <Image
                      src="/images/arcade-card-bg.png"
                      alt="Free-play casino overview"
                      fill
                      sizes="380px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-4">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/90">
                        Base Gold Rush
                      </div>
                      <div className="text-lg font-bold text-white">
                        Free-Play Casino Floor
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 text-[11px] text-emerald-100/80 space-y-1.5">
                    <p>
                      These are the{' '}
                      <span className="font-semibold text-emerald-300">
                        pre-mainnet models
                      </span>{' '}
                      of the live games we&apos;ll be launching on Base. We&apos;re
                      dialing in flow, visuals, and table logic before the contracts go
                      live.
                    </p>
                    <p>
                      When the time comes, these layouts will plug directly into{' '}
                      <span className="font-semibold text-[#60a5fa]">
                        smart contracts on the Base chain
                      </span>{' '}
                      with real BGRC / BGLD economics and transparent odds.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-300/40 bg-emerald-950/40 p-4 text-[11px] text-emerald-50 space-y-2">
                  <div className="text-xs font-semibold text-emerald-200">
                    How this fits the casino protocol
                  </div>
                  <p>
                    • Free-play lets anyone feel the pit flow on mobile or desktop before
                    we flip the switch on live on-chain chips.
                  </p>
                  <p>
                    • Every game here is being prepared for{' '}
                    <span className="font-semibold text-[#FFD700]">
                      Base mainnet deployment
                    </span>{' '}
                    as contracts are finalized and wired into the cashier.
                  </p>
                  <p>
                    • This floor is the UX blueprint for the full Base Gold Rush protocol:
                    chips, tables, jackpots, and live multiplayer all tied together.
                  </p>
                  <div className="pt-1">
                    <CasinoLiveStats variant="arcade" />
                  </div>
                </div>
              </div>
            </div>
          
        </div>
      </section>

      {/* LOWER COPY STRIP */}
      <section className="mx-auto max-w-6xl px-4 py-6 md:py-8 text-[11px] md:text-sm text-white/65 space-y-3">
        <p>
          This floor is the{' '}
          <span className="font-semibold text-[#FFD700]">
            preview of the full Base Gold Rush casino
          </span>
          . When you lock in your favorite games here — blackjack, craps, baccarat, video
          poker, three-card, and more — those exact tables will be staged for on-chain play.
        </p>
        <p>
          On the other side: smart contracts on Base, secure randomness, live BGRC / BGLD
          chips, and a stacked rail of players who were here early feeling out the
          free-play floor.
        </p>
        <p>
          The goal is simple:{' '}
          <span className="font-semibold text-emerald-200">
            feel like a real Vegas pit today
          </span>
          , then slide this entire experience on-chain with as little friction as possible
          when the cashier opens.
        </p>
      </section>
    </main>
  )
}
