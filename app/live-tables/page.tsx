// app/live-tables/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import CasinoStatusStrip from '@/components/casino/layout/CasinoStatusStrip'
import CasinoModeSwitcher from '@/components/casino/layout/CasinoModeSwitcher'
import CasinoLiveStats from '@/components/casino/layout/CasinoLiveStats'

type LiveGame = {
  href: string
  label: string
  tag: string
  desc: string
  icon: string
}

const liveGames: LiveGame[] = [
  {
    href: '/poker-demo',
    label: 'Poker Room',
    tag: 'Texas Hold’em',
    desc: '6–9 player table with BGRC demo credits, Railway-ready.',
    icon: '/icons/game-poker-room.png',
  },
  {
    href: '/arcade/blackjack',
    label: 'Blackjack Room',
    tag: 'Multi-Seat',
    desc: 'Multi-seat blackjack layout, built to evolve into live peer tables.',
    icon: '/icons/game-blackjack1.png',
  },
  {
    href: '/arcade/baccarat',
    label: 'Baccarat Room',
    tag: 'Live-Style',
    desc: 'Player / Banker / Tie with rail seats and pair side bets.',
    icon: '/icons/game-baccarat.png',
  },
  {
    href: '/arcade/three-card-poker',
    label: 'Three Card Poker Room',
    tag: 'Feature Pit',
    desc: 'Ante / Play / Pair Plus layout ready for live alpha.',
    icon: '/icons/game-three-card-poker.png',
  },
]

export default function LiveTablesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      {/* HERO */}
      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/live-tables-hero.png"
            alt="Live tables pit overhead"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.9),rgba(0,0,0,0.98))]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12">
          <CasinoStatusStrip mode="live" />
          <CasinoModeSwitcher active="live" />

          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <div className="flex-1 space-y-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                Live Table Games (Alpha)
              </h1>
              <p className="text-sm md:text-base text-white/78 max-w-xl">
                This is the next evolution of Base Gold Rush — shared tables, live Tournaments,
                and real-time action between multiple players. The current demos run on BGRC
                demo credits while we wire Contracts for on-chain settlement.
              </p>
              <p className="text-[11px] md:text-xs text-white/60 max-w-xl">
                Everything you see here is being built to become the First fully on-chain and
                fully multiplayer: coordinated by off-chain servers, enforced
                by on-chain contracts. You’re early enough to watch the pit come online. Grab your Gold Stack and Join the coming Tournaments and Vibe with the Community
              </p>

              <div className="max-w-md">
                <CasinoLiveStats variant="live" />
              </div>

              <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-white/60">
                <span className="rounded-full border border-amber-300/70 bg-amber-900/40 px-2 py-0.5">
                  Multiplayer alpha
                </span>
                <span className="rounded-full border border-sky-300/70 bg-sky-900/40 px-2 py-0.5">
                  WebSocket + on-chain settlement
                </span>
              </div>
            </div>

            <div className="flex-1 flex justify-center md:justify-end">
              <div className="relative w-full max-w-[380px] rounded-3xl border border-amber-300/70 bg-black/85 shadow-[0_24px_80px_rgba(0,0,0,0.96)] overflow-hidden">
                <div className="relative h-40 sm:h-48">
                  <Image
                    src="/images/live-tables-card-bg.png"
                    alt="Overhead casino pit"
                    fill
                    sizes="380px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-amber-200/90">
                      Live Pits
                    </div>
                    <div className="text-lg font-bold text-white">
                      Multiplayer Tables
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 text-[11px] text-amber-100/85">
                  <p>
                    Start by exploring the arcade-style tables. These layouts will be
                    wired into full live tables with player seats, dealer logic, and
                    on-chain pots.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE TABLE PREVIEW GRID */}
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg md:text-xl font-bold">
              Live-style tables in development
            </h2>
            <p className="text-xs md:text-sm text-white/60 max-w-xl">
              These tables are already playable as arcade or demo experiences. The next
              step is wiring WebSockets, player seating, and contract-backed pots.
            </p>
          </div>
          <div className="text-[11px] text-white/50">
            Multiplayer logic will roll out in phases — poker room first, then more pits.
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  {liveGames.map(game => (
    <Link
      key={game.href}
      href={game.href}
      className="group relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.3),transparent_60%),radial-gradient(circle_at_0%_100%,rgba(15,23,42,0.9),#020617)] p-5 sm:p-6 min-h-[132px] hover:border-emerald-300/90 hover:shadow-[0_0_32px_rgba(16,185,129,0.7)] transition"

    >
      <div className="flex items-center gap-3">
        {/* 🟡 ICON TILE WITH BACKGROUND */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex-shrink-0 rounded-2xl border border-amber-300/85 bg-black/85 shadow-[0_0_24px_rgba(251,191,36,0.9)] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(251,191,36,0.9),transparent_55%),radial-gradient(circle_at_85%_100%,rgba(244,114,182,0.55),transparent_55%)] opacity-90" />
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
            <span className="rounded-full border border-amber-300/80 bg-amber-900/60 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
              {game.tag}
            </span>
          </div>
          <p className="text-[11px] text-white/75 line-clamp-2">
            {game.desc}
          </p>
          <div className="text-[11px] text-amber-200 flex items-center gap-1">
            <span className="group-hover:translate-x-0.5 transition-transform">
              View table →
            </span>
          </div>
        </div>
      </div>
    </Link>
  ))}
</div>

      </section>
    </main>
  )
}
