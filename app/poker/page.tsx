// app/poker/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import CasinoStatusStrip from '@/components/casino/layout/CasinoStatusStrip'
import CasinoModeSwitcher from '@/components/casino/layout/CasinoModeSwitcher'
import CasinoLiveStats from '@/components/casino/layout/CasinoLiveStats'
import { ArcadeWalletProvider } from '@/lib/useArcadeWallet'

export default function PokerHubPage() {
  return (
    <ArcadeWalletProvider>
      <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
        {/* HERO */}
        <section className="relative border-b border-white/10">
          {/* Background */}
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/live-poker-hero.png"
              alt="Base Gold Rush Poker Room felt"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#facc15_0,transparent_40%),linear-gradient(to_bottom,rgba(0,0,0,0.88),rgba(0,0,0,0.97))]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10">
            <CasinoStatusStrip mode="live" />
            <CasinoModeSwitcher active="live" />

            <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
              {/* LEFT: POKER HERO */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-black/70 border border-[#FFD700]/60 px-3 py-1 text-[10px] uppercase tracking-[0.26em] text-[#FFD700]/90">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Base Gold Rush • Poker
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
                    <span className="block text-white">
                      The{' '}
                      <span className="text-[#FFD700]">
                        Poker Room
                      </span>{' '}
                      is your golden pit.
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base text-white/80 max-w-xl">
                    Sit down with BGRC free play chips, sweat full boards,
                    and feel how live Base cash games are going to run when
                    BGLD and BGRC are plugged into the same spine.
                  </p>
                  <p className="text-[11px] md:text-xs text-white/60 max-w-xl">
                    Right now you&apos;re jamming the flagship{' '}
                    <span className="font-semibold text-[#FFD700]">
                      Hold&apos;em cash table
                    </span>
                    . Next up: club-style lobbies, sit &amp; go, and full
                    tournaments — all mapped to the Base Gold Rush vaults.
                  </p>
                </div>

                {/* Primary CTAs */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] md:text-xs">
                  <Link
                    href="/poker-demo"
                    className="inline-flex items-center justify-center rounded-full bg-[#FFD700] px-5 py-2.5 font-semibold text-black shadow-[0_20px_55px_rgba(250,204,21,0.9)] hover:bg-yellow-400"
                  >
                    Enter Live Poker Room →
                  </Link>
                  <Link
                    href="/live-tables"
                    className="inline-flex items-center justify-center rounded-full border border-white/30 bg-black/60 px-4 py-2 font-semibold text-white/90 hover:border-[#FFD700]/70"
                  >
                    View all live tables
                  </Link>
                  <span className="text-white/50">
                    Each browser/device = its own seat. Share the link,
                    fill the rail.
                  </span>
                </div>

                {/* Quick live stats */}
                <div className="max-w-md">
                  <CasinoLiveStats variant="live" />
                </div>
              </div>

              {/* RIGHT: GOLDEN POKER STACK / SUMMARY */}
              <div className="space-y-4">
                <div className="rounded-3xl border border-[#FFD700]/70 bg-black/85 shadow-[0_24px_70px_rgba(0,0,0,1)] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.26em] text-[#FFD700]/90">
                        Live cash game spine
                      </div>
                      <div className="text-sm sm:text-base font-bold text-white">
                        Seats, boards, betting — all synced.
                      </div>
                    </div>
                    <div className="relative h-10 w-10 sm:h-12 sm:w-12">
                      <Image
                        src="/felt/bgrc-logo.png"
                        alt="BGRC chip"
                        fill
                        sizes="48px"
                        className="object-contain drop-shadow-[0_0_18px_rgba(250,204,21,0.7)]"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] sm:text-xs text-white/70 mb-3">
                    The live poker table is powered by a multiplayer coordinator:
                    seats, dealer button, action order, pots, and showdown all stay
                    in sync — no matter how many friends join from different
                    devices.
                  </p>

                  <ul className="space-y-1.5 text-[11px] sm:text-xs text-white/75">
                    <li>• 2–9 seat Hold&apos;em cash game with live board + hole cards</li>
                    <li>• Club-style action bar: Fold / Check / Call / Bet with timers</li>
                    <li>• Fake rake shown now — maps 1:1 to BGLD/BGRC when on-chain</li>
                  </ul>

                  <div className="mt-3 rounded-2xl border border-white/15 bg-black/70 px-3 py-2 text-[10px] text-white/55">
                    <div className="font-semibold text-[#FFD700] mb-0.5">
                      Live mode (now) vs on-chain mode (soon)
                    </div>
                    <p>
                      Today: free play stacks, pure vibe, zero risk. Soon: the same
                      flows will route real BGLD/BGRC chips, rake to vaults, and
                      jackpots back to the community.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* POKER APP GRID: CASH, TOURNEYS, PROFILE */}
        <section className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              Build out the full{' '}
              <span className="text-[#FFD700]">Base Gold Rush Poker</span>{' '}
              app stack.
            </h2>
            <p className="text-[11px] md:text-xs text-white/60 max-w-xl">
              Cash games are live. Next steps: ClubGG-style lobbies, sit &amp; go
              queues, and a clean identity layer so your rail name actually matters.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Cash Game Tile */}
            <Link
              href="/poker-demo"
              className="group rounded-2xl border border-[#FFD700]/70 bg-gradient-to-b from-black/80 via-[#111827] to-black/90 p-4 flex flex-col justify-between shadow-[0_16px_45px_rgba(0,0,0,0.9)]"
            >
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/70 px-2.5 py-1 text-[10px] font-semibold text-[#FFD700]">
                  Live
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <h3 className="text-sm sm:text-base font-bold">
                  Live Cash Game • Texas Hold&apos;em
                </h3>
                <p className="text-[11px] sm:text-xs text-white/70">
                  Jump straight into the demo room. 2–9 seats, free play BGRC, and
                  the exact flow we&apos;ll wire into the on-chain cashier.
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#FFD700]/90">
                <span className="group-hover:translate-x-0.5 transition-transform">
                  Enter poker room →
                </span>
                <span className="font-mono text-white/70">
                  Room: <span className="text-[#FFD700]">bgld-holdem-demo-room</span>
                </span>
              </div>
            </Link>

            {/* Tournaments / Sit & Go */}
            <div className="rounded-2xl border border-white/20 bg-gradient-to-b from-[#020617] to-black p-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-black/70 border border-white/30 px-2.5 py-1 text-[10px] font-semibold text-white/80">
                  Coming Soon
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Tournaments &amp; Sit &amp; Go
                </h3>
                <p className="text-[11px] sm:text-xs text-white/70">
                  Multi-table tourneys, fast sit &amp; gos, and warm-up single-table
                  dailies — all on the same multiplayer spine powering the cash
                  game.
                </p>
              </div>
              <ul className="mt-3 space-y-1.5 text-[11px] sm:text-xs text-white/65">
                <li>• Scheduled &amp; on-demand sit &amp; go lobbies</li>
                <li>• Guaranteed prize pools mapped to BGLD vaults</li>
                <li>• “Golden Nugget” feature events on big Base days</li>
              </ul>
            </div>

            {/* Profile / Identity */}
            <div className="rounded-2xl border border-white/20 bg-gradient-to-b from-[#020617] to-black p-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-black/70 border border-white/30 px-2.5 py-1 text-[10px] font-semibold text-white/80">
                  Rail Identity
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Player Profile &amp; Rail Presence
                </h3>
                <p className="text-[11px] sm:text-xs text-white/70">
                  Lock in your handle, avatar, and bio. The same persona shows up at
                  every table, every time you sit.
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] sm:text-xs text-white/70">
                <Link
                  href="/profile"
                  className="rounded-full border border-[#FFD700]/60 bg-black/70 px-3 py-1.5 font-semibold text-[#FFD700] hover:bg-[#111827]"
                >
                  Edit poker profile →
                </Link>
                <span className="text-white/45">
                  X / Telegram handles optional but welcome.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* LOWER COPY STRIP */}
        <section className="mx-auto max-w-6xl px-4 pb-8 md:pb-10 text-[11px] md:text-sm text-white/65 space-y-3">
          <p>
            <span className="font-semibold text-[#FFD700]">Base Gold Rush Poker</span>{' '}
            is the live heart of the project — a place where BGRC/BGLD, vaults, and
            vibes all converge at the same tables.
          </p>
          <p>
            Cash games are live in free play now. As we bring in the cashier and
            vault hooks, this hub becomes a full poker app: lobbies, queues,
            leaderboards, and golden marquee events for Base.
          </p>
          <p>
            For now: grab a seat, invite a few friends, and help us stress test the
            golden pit before the rest of Base even realizes there&apos;s a live
            room running.
          </p>
        </section>
      </main>
    </ArcadeWalletProvider>
  )
}
