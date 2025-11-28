// app/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import CasinoLiveStats from '@/components/casino/layout/CasinoLiveStats'

type LobbyGame = {
  href: string
  label: string
  tag: string
  desc: string
  icon: string
  highlight?: boolean
}

// Main casino lobby games (using current best UX routes – arcade + live tables)
const lobbyGames: LobbyGame[] = [
  {
    href: '/live-tables',
    label: 'Hold’em Poker Rooms',
    tag: 'PGLD Poker',
    desc: 'Live Texas Hold’em tables with shared rails, real stacks, and Vegas pacing.',
    icon: '/icons/game-poker.png',
    highlight: true,
  },
  {
    href: '/arcade/roulette',
    label: 'Roulette',
    tag: 'Golden Wheel',
    desc: 'European wheel, clean layout, and GLD-style chips across the felt.',
    icon: '/icons/game-roulette1.png',
  },
  {
    href: '/arcade/blackjack',
    label: 'Blackjack',
    tag: '21 Table',
    desc: 'Heads-up and multi-seat blackjack with splits, doubles, and clear dealer flow.',
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
    desc: 'Jacks or Better bar-top cabinet with proper draw / hold flow.',
    icon: '/icons/game-video-poker1.png',
  },
  {
    href: '/arcade/three-card-poker',
    label: 'Three Card Poker',
    tag: 'Feature Table',
    desc: 'Ante, Play, and Pair Plus bets vs the dealer on a full three-card layout.',
    icon: '/icons/game-three-card-poker.png',
  },
  {
    href: '/arcade/war',
    label: 'War',
    tag: 'High Card',
    desc: 'Fast high-card showdowns vs the house with instant reveals.',
    icon: '/icons/game-war.png',
  },
  {
    href: '/arcade/slots-arcade',
    label: 'Gold Rush Slots',
    tag: 'Vegas Slots',
    desc: 'Gold Rush-themed slots with reels, paylines, and cabinet-style pacing.',
    icon: '/icons/game-slots.png',
  },
]

function LobbyGameCard({ game }: { game: LobbyGame }) {
  return (
    <Link
      href={game.href}
      className={[
        'group relative flex flex-col gap-3 rounded-2xl border bg-black/75 p-4 sm:p-5 transition shadow-[0_12px_40px_rgba(0,0,0,0.8)]',
        game.highlight
          ? 'border-amber-300/80 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),transparent_60%),#020617]'
          : 'border-emerald-200/50 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),transparent_55%),#020617] hover:border-emerald-300/80',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 rounded-xl border border-white/15 bg-black/90 overflow-hidden">
          <Image
            src={game.icon}
            alt={game.label}
            fill
            sizes="64px"
            className="object-contain p-2 group-hover:scale-110 transition-transform duration-300"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm sm:text-base font-semibold text-white truncate">
              {game.label}
            </h3>
            <span className="rounded-full border border-amber-300/70 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-100 whitespace-nowrap">
              {game.tag}
            </span>
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-white/70">
            {game.desc}
          </p>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-white/55">
        <span>Tap to enter table / game</span>
        <span className="font-semibold text-emerald-200 group-hover:translate-x-0.5 transition-transform">
          Enter → 
        </span>
      </div>
    </Link>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      {/* HERO – MAIN CASINO WELCOME */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* Background floor */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/bg-goldrush-hero-V2.png"
            alt="Base Gold Rush casino floor"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.86),rgba(0,0,0,0.98))]" />
        </div>
        {/* Gold / blue glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.18),transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.16),transparent_60%)]" />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row md:items-center md:py-12">
          {/* LEFT – COPY */}
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/40 bg-black/75 px-3 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#FFD700]/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Base Gold Rush • Casino & Live Poker on Base
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow">
              Welcome to the{' '}
              <span className="text-[#FFD700]">Base Gold Rush</span> casino.
            </h1>

            <p className="max-w-xl text-sm text-white/80 md:text-base">
              A Vegas-style casino and poker room running on Base.{' '}
              <span className="font-semibold text-[#FACC15]">
                GLD casino chips
              </span>{' '}
              handle the floor, and{' '}
              <span className="font-semibold text-sky-300">
                PGLD poker chips
              </span>{' '}
              track your stacks in the live card room.
            </p>

            <p className="max-w-xl text-[11px] sm:text-xs text-white/65">
              Early access players are spinning, dealing, and rolling with
              GLD-denominated balances while the cashier window finishes
              wiring. The flow, tables, and UI you feel here are the same ones
              we&apos;ll run live on Base mainnet.
            </p>

            {/* PRIMARY CTAS */}
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] sm:text-xs">
              <Link
                href="/arcade"
                className="rounded-full border border-[#FFD700]/80 bg-[#FFD700] px-4 py-1.5 font-semibold text-black hover:bg-[#fbbf24]"
              >
                🎰 Enter Casino Lobby
              </Link>
              <Link
                href="/live-tables"
                className="rounded-full border border-amber-300/70 bg-black/80 px-4 py-1.5 font-semibold text-amber-100 hover:bg-amber-900/60"
              >
                🃏 Enter Poker & Tables
              </Link>
              <Link
                href="/arcade"
                className="rounded-full border border-emerald-300/70 bg-emerald-900/70 px-4 py-1.5 font-semibold text-emerald-100 hover:bg-emerald-800/80"
              >
                🎡 Practice Floor (Free Play)
              </Link>
            </div>

            {/* EARLY ACCESS BLURB */}
            <div className="mt-4 grid gap-2 text-[11px] md:text-xs">
              <div className="rounded-xl border border-white/10 bg-black/75 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="font-semibold text-emerald-300">
                  Early Access — Free GLD-denominated play
                </div>
                <div className="text-white/70">
                  Play now with free chips tied to your wallet profile. Cashier
                  for real GLD chips opens soon.
                </div>
              </div>
              <div className="rounded-xl border border-[#FACC15]/60 bg-[#111827]/90 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="font-semibold text-[#FACC15]">
                  Wallet-linked stacks
                </div>
                <div className="text-white/80">
                  When you decide to buy chips instead of playing free,
                  balances and history stay mapped to your wallet.
                </div>
              </div>
            </div>

            {/* QUICK STATS */}
            <div className="mt-3 grid max-w-md grid-cols-3 gap-2 text-[11px] text-white/70">
              <div className="rounded-xl border border-white/10 bg-black/55 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-white/40">
                  Tables & Games
                </div>
                <div className="text-sm font-bold text-white">
                  8+ Live Layouts
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/55 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-white/40">
                  Poker
                </div>
                <div className="text-sm font-bold text-amber-200">
                  PGLD Rooms
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/55 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-white/40">
                  Chain
                </div>
                <div className="text-sm font-bold text-[#60a5fa]">
                  Base
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT – CHIP + LOBBY CALLOUT */}
          <div className="relative flex flex-1 items-center justify-center mt-4 md:mt-0">
            <div className="relative w-[260px] sm:w-[320px] md:w-[380px]">
              <div className="relative h-[220px] sm:h-[260px] md:h-[300px] rounded-3xl overflow-hidden border border-[#FFD700]/35 bg-black shadow-[0_30px_90px_rgba(0,0,0,0.95)]">
                <Image
                  src="/images/hero-pedestal.png"
                  alt="Base Gold Rush chip pedestal"
                  fill
                  priority
                  sizes="380px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.35),transparent_65%)]" />
                <div className="absolute inset-x-0 bottom-14 flex justify-center">
                  <div className="relative h-36 w-36 sm:h-40 sm:w-40 md:h-48 md:w-48">
                    <Image
                      src="/chips/chip-bgrc-main.png"
                      alt="GLD casino chip"
                      fill
                      className="object-contain chip-hero-anim select-none drop-shadow-[0_18px_40px_rgba(0,0,0,0.9)]"
                    />
                  </div>
                </div>
              </div>

              <div className="relative -mt-4 rounded-2xl border border-white/15 bg-black/90 px-4 py-3 text-xs text-white/80 shadow-[0_12px_30px_rgba(0,0,0,0.9)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/50">
                    GLD Casino Chip
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    Early Access
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-white font-semibold">
                    Base Gold Rush
                  </span>
                  <span className="text-[#FFD700] text-[11px] font-bold text-right">
                    Casino Lobby → Poker Room → Cashier
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CASINO LOBBY GRID */}
      <section className="mx-auto max-w-6xl px-4 pt-6 pb-8 md:pt-8 md:pb-10">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Casino Lobby – Tables & Games
            </h2>
            <p className="text-xs md:text-sm text-white/65 max-w-xl">
              Browse the main floor: poker rooms, table games, and slots with
              GLD-style chips and full Vegas vibes. Most layouts are playable
              in free-play mode while the cashier finishes wiring.
            </p>
          </div>
          <div className="text-[11px] text-white/50">
            Tap any card to sit down and start playing.
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lobbyGames.map(game => (
            <LobbyGameCard key={game.href} game={game} />
          ))}
        </div>
      </section>

      {/* HOW GLD / PGLD WORK STRIP */}
      <section className="mx-auto max-w-6xl px-4 pb-6 md:pb-8 text-[11px] md:text-sm text-white/75 space-y-3">
        <div className="rounded-2xl border border-white/12 bg-black/85 p-4 md:p-5 shadow-[0_18px_50px_rgba(0,0,0,0.85)] space-y-2">
          <div className="text-xs md:text-sm font-semibold text-[#FFD700] mb-1">
            GLD casino chips & PGLD poker chips
          </div>
          <p>
            <span className="font-semibold text-[#FACC15]">GLD</span> is the
            main casino chip used across slots, roulette, blackjack, craps,
            baccarat, and side games. Your GLD balance is tracked against your
            wallet profile and will route through the cashier once live.
          </p>
          <p>
            <span className="font-semibold text-sky-300">PGLD</span> is used
            inside the poker room and live card pits, so poker stacks and
            casino stacks can be handled cleanly while still tying back to the
            same wallet.
          </p>
          <p>
            During early access, we use GLD-denominated free-play balances to
            dial in UX, odds, and pacing. When the cashier opens, those same
            layouts wire into real GLD and PGLD chips on Base.
          </p>
        </div>
      </section>

      {/* SOFT RESPONSIBLE GAMING STRIP */}
      <section className="border-t border-white/10 bg-black/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-[11px] text-white/55 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-white/75">
              Play like you&apos;re in a real casino.
            </div>
            <div>
              Set limits, take breaks, and treat every spin, hand, and roll as
              entertainment first.
            </div>
          </div>
          <div className="text-right md:text-left">
            <div>Know your odds, and never chase losses.</div>
            <div>Some regions may be restricted once real chips go live.</div>
          </div>
        </div>
      </section>
    </main>
  )
}
