// app/poker/page.tsx
import Link from 'next/link'
import Image from 'next/image'

import CasinoLiveStats from '@/components/casino/layout/CasinoLiveStats'
import { ArcadeWalletProvider } from '@/lib/useArcadeWallet'

export default function PokerHubPage() {
  return (
    <ArcadeWalletProvider>
      <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
        {/* HERO */}
        <section className="relative border-b border-white/10">
          {/* Background wash */}
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/live-poker-hero.png"
              alt="Base Gold Rush poker felt"
              fill
              sizes="100vw"
              className="object-cover opacity-30"
              priority
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#facc15_0,transparent_40%),linear-gradient(to_bottom,rgba(0,0,0,0.9),rgba(0,0,0,0.98))]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-8">
            {/* HERO: POKER ROOM ENTRANCE CARD */}
            <div className="space-y-6">
              {/* Top pill */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-black/70 border border-[#FFD700]/70 px-4 py-1.5 text-[10px] sm:text-xs uppercase tracking-[0.24em] text-[#FFD700]/90 shadow-[0_0_20px_rgba(255,215,0,0.4)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Base Gold Rush • Poker Room
                </div>
              </div>

              {/* Clickable hero card */}
              <Link
                href="/poker-demo"
                className="group mx-auto w-full max-w-md rounded-[1.75rem] overflow-hidden border border-[#FFD700]/80 bg-black/90 shadow-[0_0_60px_rgba(0,0,0,1)] ring-1 ring-[#FFD700]/40 animate-goldPulse"
              >
                {/* Image top */}
                <div className="relative w-full h-72 sm:h-80">
                  <Image
                    src="/images/poker-hero-enter.png"
                    alt="Entrance to the live poker room"
                    fill
                    sizes="(max-width: 640px) 100vw, 480px"
                    priority
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-black/80" />
                </div>

                {/* Content under image */}
                <div className="flex flex-col items-center text-center gap-3 px-5 py-5 bg-black/90">
                  <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                    The <span className="text-[#FFD700]">Poker Room</span>{' '}
                    is your golden pit.
                  </h1>

                  <p className="text-xs sm:text-sm text-white/80 font-medium max-w-sm">
                    Sit down with PGLD Chip stacks, sweat full boards, and feel
                    how live Base cash games run when the cage and tables are
                    wired into one spine.
                  </p>

                  {/* CTA */}
                  <div className="w-full max-w-xs">
                    <div className="rounded-full bg-[#FFD700] px-6 py-2.5 text-sm sm:text-base font-semibold text-black shadow-[0_20px_55px_rgba(250,204,21,0.9)] group-hover:bg-yellow-400 transition text-center">
                      Enter Hold’em Room →
                    </div>
                  </div>

                  <p className="text-[10px] sm:text-xs text-white/65">
                    Each browser / device = its own seat. Share the link and
                    fill the rail.
                  </p>

                  <div className="w-full max-w-[260px] pt-1">
                    <CasinoLiveStats variant="live" />
                  </div>
                </div>
              </Link>
            </div>

            {/* GOLDEN STACK SUMMARY CARD (MOVED UNDER HERO) */}
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
                  A multiplayer Live Game keeps seats, dealer button, action
                  order, pots, and showdown in sync — no matter how many friends
                  join from different devices.
                </p>

                <ul className="space-y-1.5 text-[11px] sm:text-xs text-white/75">
                  <li>• 2–9 seat Hold’em cash game with live board + hole cards</li>
                  <li>• Action bar: Fold / Check / Call / Bet with timers</li>
                  <li>• Rake + promos map 1:1 into BGLD/BGRC rails when live</li>
                </ul>

                <div className="mt-3 rounded-2xl border border-white/15 bg-black/70 px-3 py-2 text-[10px] text-white/55">
                  <div className="font-semibold text-[#FFD700] mb-0.5">
                    Same table, upgraded rails
                  </div>
                  <p>
                    Today: live stacks + real flow. As the cashier and vault hooks
                    plug in, the same table routes real BGLD/BGRC chips, rake to
                    vaults, and jackpots back to the community.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* POKER APP GRID: CASH, TOURNEYS, PROFILE */}
        <section className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              Built on Base Chain Featuring the full{' '}
              <span className="text-[#FFD700]">Base Gold Rush Poker</span>{' '}
              Live Tables.
            </h2>
            <p className="text-[11px] md:text-xs text-white/60 max-w-xl">
              Cash games are the anchor. Next steps: club-style lobbies, sit &amp;
              go queues, and a clean identity layer so your rail name actually
              matters.
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
                  Live Cash Game • Texas Hold’em
                </h3>
                <p className="text-[11px] sm:text-xs text-white/70">
                  Jump straight into the current room. 2–9 seats, real-time
                  boards, and the exact flow that will wire into the on-chain
                  cashier.
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#FFD700]/90">
                <span className="group-hover:translate-x-0.5 transition-transform">
                  Enter poker room →
                </span>
                <span className="font-mono text-white/70">
                  Room: <span className="text-[#FFD700]">bgld-holdem-room</span>
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
                  Multi-table tourneys, fast sit &amp; gos, and warm-up single
                  tables — all on the same multiplayer spine powering the cash
                  game.
                </p>
              </div>
              <ul className="mt-3 space-y-1.5 text-[11px] sm:text-xs text-white/65">
                <li>• Scheduled &amp; on-demand sit &amp; go lobbies</li>
                <li>• Guaranteed prize pools mapped to BGLD vaults</li>
                <li>• “Golden marquee” feature events on big Base days</li>
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
                  Lock in your handle, avatar, and bio. The same persona shows up
                  at every table, every time you sit.
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
            is the live heart of the project — a place where chips, vaults, and
            vibes all converge at the same tables.
          </p>
          <p>
            Cash games are live. As we bring in the cashier and vault hooks, this
            hub becomes a full poker app: lobbies, queues, leaderboards, and
            golden marquee events for Base.
          </p>
          <p>
            For now: grab a seat, invite a few friends, and help us stress test
            the golden pit before the rest of Base even realizes there&apos;s a
            live room running.
          </p>
        </section>
      </main>
    </ArcadeWalletProvider>
  )
}
