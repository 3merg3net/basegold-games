// app/live-tables/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import CasinoStatusStrip from '@/components/casino/layout/CasinoStatusStrip'
import CasinoModeSwitcher from '@/components/casino/layout/CasinoModeSwitcher'
import CasinoLiveStats from '@/components/casino/layout/CasinoLiveStats'
import { ArcadeWalletProvider } from '@/lib/useArcadeWallet'

type LiveGameCard = {
  href?: string
  label: string
  tag: string
  desc: string
  icon: string
  status: 'live' | 'coming'
}

// Poker is now THE hero — roadmap is only future tables.
const liveGames: LiveGameCard[] = [
  {
    label: 'Blackjack Tables',
    tag: '21 Live',
    desc: 'Multi-seat blackjack with full splits, doubles, and shared dealer shoes.',
    icon: '/icons/game-blackjack1.png',
    status: 'coming',
  },
  {
    label: 'Craps Rail',
    tag: 'Dice Pit',
    desc: 'Pass line, odds, field and prop action around a shared hot shooter.',
    icon: '/icons/game-craps1.png',
    status: 'coming',
  },
  {
    label: 'Baccarat Pit',
    tag: 'Player / Banker',
    desc: 'Classic baccarat rail with live chips and shared rounds on Base.',
    icon: '/icons/game-baccarat.png',
    status: 'coming',
  },
  {
    label: 'Three Card Poker',
    tag: 'Feature Table',
    desc: 'Ante, Play, and Pair Plus versus the dealer at a live shared layout.',
    icon: '/icons/game-three-card-poker.png',
    status: 'coming',
  },
]

export default function LiveTablesPage() {
  return (
    <ArcadeWalletProvider>
      <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
        {/* HERO */}
        <section className="relative border-b border-white/10">
          {/* Background image */}
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/live-tables-card-bg.png"
              alt="Base Gold Rush live tables pit"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.88),rgba(0,0,0,0.97))]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10">
            <CasinoStatusStrip mode="live" />
            <CasinoModeSwitcher active="live" />

            <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
              {/* LEFT: SUPER-FOCUSED POKER ROOM CALLOUT */}
              <div className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                      Live Tables •{' '}
                      <span className="text-[#FFD700]">Poker Room</span>{' '}
                      is officially open.
                    </h1>
                    <p className="text-xs sm:text-sm md:text-base text-white/80 max-w-xl">
                      Sit down in the{' '}
                      <span className="font-semibold text-[#FFD700]">
                        Base Gold Rush Poker Room
                      </span>
                      , watch full boards roll, and feel how the live pit moves
                      before the rest of Base finds the floor.
                    </p>
                    <p className="text-[11px] md:text-xs text-white/60 max-w-xl">
                      This is our flagship live table — real multiplayer logic, synced
                      action across devices, and the template for every other live
                      game we&apos;re lighting up.
                    </p>
                  </div>

                  {/* Hero CTA in header */}
                  <div className="flex md:flex-col items-end gap-2 text-[11px] md:text-xs">
                    <div className="text-right text-white/60 hidden md:block">
                      <div>Flagship live room</div>
                      <div className="font-mono text-[#FFD700]">
                        bgld-holdem-demo-room
                      </div>
                    </div>
                    <Link
                      href="/poker-demo"
                      className="inline-flex items-center justify-center rounded-full bg-[#FFD700] px-4 py-2 text-[11px] md:text-xs font-semibold text-black shadow-[0_18px_45px_rgba(250,204,21,0.85)] hover:bg-yellow-400"
                    >
                      Enter Poker Room →
                    </Link>
                  </div>
                </div>

                {/* BIG POKER ROOM HERO CARD */}
                <Link
                  href="/poker-demo"
                  className="group relative block overflow-hidden rounded-3xl border border-amber-300/80 bg-black/90 shadow-[0_26px_90px_rgba(0,0,0,1)]"
                >
                  <div className="relative h-44 sm:h-52 md:h-60">
                    <Image
                      src="/images/live-poker-hero1.png"
                      alt="Base Gold Rush live poker room"
                      fill
                      sizes="480px"
                      className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-transparent" />
                    <div className="absolute left-4 bottom-3 right-4 flex items-end justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-black/70 border border-emerald-400/70 px-2.5 py-1 mb-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] uppercase tracking-[0.26em] text-emerald-100">
                            Live Table • Open Now
                          </span>
                        </div>
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                          Poker Room • Texas Hold’em
                        </div>
                        <div className="mt-1 text-[11px] sm:text-xs text-white/80 max-w-xs">
                          Full-hole cards, shared board, synced betting order, and a
                          ClubGG-style action bar — all running on Base Gold Rush.
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <span className="rounded-full bg-amber-500/30 border border-amber-200/80 px-3 py-1 text-[11px] font-semibold text-amber-50">
                          Join the table & vibe →
                        </span>
                        <span className="text-[10px] text-amber-100/80">
                          Each browser/device = a unique seat.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Under-card info strip: hard highlight on live status */}
                  <div className="px-4 py-3 border-t border-amber-300/40 bg-black/90 text-[11px] sm:text-xs text-white/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/60 px-2.5 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-semibold text-emerald-100">
                          Live now
                        </span>
                      </span>
                      <span className="inline-flex items-center rounded-full bg-black/70 border border-white/25 px-2.5 py-1">
                        Mode:{' '}
                        <span className="ml-1 font-mono text-[#FFD700]">
                          BGRC free play
                        </span>
                      </span>
                      <span className="inline-flex items-center rounded-full bg-black/70 border border-white/25 px-2.5 py-1">
                        Seats:{' '}
                        <span className="ml-1 font-mono">2–9 players</span>
                      </span>
                    </div>
                    <span className="hidden sm:inline text-white/60">
                      This room is the blueprint for every on-chain cash table we launch.
                    </span>
                  </div>
                </Link>

                <div className="max-w-md">
                  <CasinoLiveStats variant="live" />
                </div>
              </div>

              {/* RIGHT: UPCOMING LIVE TABLES LIST (FUTURE PIT) */}
              <div className="space-y-4">
                <div className="rounded-3xl border border-amber-200/60 bg-black/85 shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.26em] text-amber-200/90">
                        Next up in the pit
                      </div>
                      <div className="text-sm sm:text-base font-bold text-white">
                        Blackjack, dice, and baccarat are on deck.
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end text-[11px] text-amber-100/80">
                      <span>Live roadmap</span>
                      <span className="text-amber-300 font-semibold">
                        Poker (live) → Blackjack → Craps → Baccarat
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] sm:text-xs text-white/70 mb-3">
                    The poker room is live today. These rails are next — all sharing the
                    same multiplayer spine and eventually the same BGLD/BGRC cashier.
                  </p>

                  <div className="space-y-3">
                    {liveGames.map(game => {
                      const isLive = game.status === 'live'
                      const Wrapper: React.ElementType = game.href ? Link : 'div'
                      const wrapperProps = game.href ? { href: game.href } : {}

                      return (
                        <Wrapper
                          key={game.label}
                          {...wrapperProps}
                          className={[
                            'group flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-[11px] sm:text-xs transition',
                            isLive
                              ? 'border-amber-300/80 bg-amber-900/40 hover:bg-amber-800/70 hover:border-amber-200'
                              : 'border-white/15 bg-black/60 opacity-80 hover:opacity-100 hover:border-amber-200/70',
                          ].join(' ')}
                        >
                          <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 rounded-xl overflow-hidden border border-white/20 bg-black/80">
                            <Image
                              src={game.icon}
                              alt={game.label}
                              fill
                              sizes="44px"
                              className="object-contain p-1.5"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-white">
                                {game.label}
                              </span>
                              <span
                                className={[
                                  'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                  isLive
                                    ? 'bg-amber-300 text-black'
                                    : 'border border-amber-200/60 text-amber-100 bg-black/40',
                                ].join(' ')}
                              >
                                {isLive ? 'Live Now' : 'Coming Soon'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <span className="text-white/70">{game.desc}</span>
                              <span className="hidden sm:inline text-amber-200">
                                {game.tag}
                              </span>
                            </div>
                          </div>
                        </Wrapper>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOWER COPY STRIP */}
        <section className="mx-auto max-w-6xl px-4 py-6 md:py-8 text-[11px] md:text-sm text-white/65 space-y-3">
          <p>
            The <span className="font-semibold text-[#FFD700]">Live Tables</span> floor is
            where the Base Gold Rush casino starts to feel like a real pit — shared shoes,
            shared rails, and real players sweating every street together.
          </p>
          <p>
            Poker is our first live table. As we finalize multiplayer flows and integrate
            contracts, you&apos;ll see{' '}
            <span className="font-semibold text-amber-200">
              blackjack, craps, baccarat, and three-card poker
            </span>{' '}
            light up across this page.
          </p>
          <p>
            Jump into the poker room now, get a feel for how live Base tables move, and
            claim your spot on the rail before the rest of Base finds the floor.
          </p>
        </section>
      </main>
    </ArcadeWalletProvider>
  )
}
