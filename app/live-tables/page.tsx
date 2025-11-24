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

const liveGames: LiveGameCard[] = [
  {
    href: '/poker-demo',
    label: 'Poker Room',
    tag: 'Texas Hold’em',
    desc: 'Sit down, see the boards, and vibe with the first Base Gold Rush live table.',
    icon: '/icons/game-poker-room.png',
    status: 'live',
  },
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
              {/* LEFT: POKER ROOM CALLOUT */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                    Live Tables •{' '}
                    <span className="text-[#FFD700]">Poker Room</span>{' '}
                    is live.
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base text-white/80 max-w-xl">
                    Sit down in the{' '}
                    <span className="font-semibold text-[#FFD700]">
                      Base Gold Rush Poker Room
                    </span>
                    , watch the boards roll, and vibe at the first live table in the casino.
                    This is where the rail starts to fill up.
                  </p>
                  <p className="text-[11px] md:text-xs text-white/60 max-w-xl">
                    Live multiplayer logic is rolling out across poker and table games. Poker
                    is up first — blackjack, craps, baccarat and more are lining up in the pit
                    right behind it.
                  </p>
                </div>

                {/* BIG POKER ROOM HERO CARD */}
                <Link
                  href="/poker-demo"
                  className="group relative block overflow-hidden rounded-3xl border border-amber-300/70 bg-black/85 shadow-[0_26px_80px_rgba(0,0,0,0.95)]"
                >
                  <div className="relative h-40 sm:h-48 md:h-56">
                    <Image
                      src="/images/live-poker-hero.png"
                      alt="Base Gold Rush live poker room"
                      fill
                      sizes="480px"
                      className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
                    <div className="absolute left-4 bottom-3 right-4 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.28em] text-amber-200/90">
                          Live Play Now
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-white">
                          Poker Room • Texas Hold’em
                        </div>
                        <div className="mt-1 text-[11px] sm:text-xs text-white/75 max-w-xs">
                          Join the table, sweat the flop, and feel how Base live games are
                          going to run.
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <span className="rounded-full bg-amber-500/20 border border-amber-300/70 px-3 py-1 text-[11px] font-semibold text-amber-100">
                          Join the table & vibe →
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 text-[11px] sm:text-xs text-white/75 flex items-center justify-between gap-3">
                    <span>
                      This room is our live table blueprint — cards, seats, action, all
                      syncing through a shared room.
                    </span>
                    <span className="sm:hidden font-semibold text-amber-200 group-hover:translate-x-0.5 transition-transform">
                      Enter room →
                    </span>
                  </div>
                </Link>

                <div className="max-w-md">
                  <CasinoLiveStats variant="live" />
                </div>
              </div>

              {/* RIGHT: UPCOMING LIVE TABLES LIST */}
              <div className="space-y-4">
                <div className="rounded-3xl border border-amber-200/70 bg-black/85 shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.26em] text-amber-200/90">
                        Live Pit Roadmap
                      </div>
                      <div className="text-sm sm:text-base font-bold text-white">
                        Blackjack is next up on the felt.
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end text-[11px] text-amber-100/80">
                      <span>Live multiplayer</span>
                      <span className="text-amber-300 font-semibold">
                        Poker → Blackjack → Craps → Baccarat
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] sm:text-xs text-white/70 mb-3">
                    We&apos;re rolling out live tables one pit at a time. Poker is open,
                    blackjack is hot on its heels, and the dice/baccarat rails are lining
                    up for Base.
                  </p>

                  <div className="space-y-3">
                    {liveGames.map(game => {
                      const isLive = game.status === 'live'
                      const Wrapper: React.ElementType = game.href ? Link : 'div'
                      const wrapperProps = game.href
                        ? { href: game.href }
                        : {}

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
            Join the poker room now, get a feel for how live Base tables move, and claim your
            spot on the rail before the rest of Base finds the floor.
          </p>
        </section>
      </main>
    </ArcadeWalletProvider>
  )
}
