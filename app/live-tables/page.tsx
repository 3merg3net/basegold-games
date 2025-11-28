// app/live-tables/page.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import CasinoLiveStats from '@/components/casino/layout/CasinoLiveStats'

export default function LiveTablesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <section className="relative border-b border-white/10">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/live-tables-card-bg.png"
            alt="Base Gold Rush live poker room"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.88),rgba(0,0,0,0.97))]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-6">
          {/* HEADER ROW */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-black/70 px-3 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100">
                🃏 Base Gold Rush • Poker Room & Live Tables
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                Take a seat in the{' '}
                <span className="text-[#FFD700]">Poker Room</span>.
              </h1>

              <p className="text-xs sm:text-sm md:text-base text-white/80">
                This is the live floor: Texas Hold’em, featured tables, and
                eventually blackjack, baccarat, and craps — all tied into PGLD
                chips and the Base Gold Rush cage.
              </p>

              <p className="text-[11px] md:text-xs text-white/65">
                Early on, you may see tables running with complimentary PGLD /
                GLD stacks while we dial in the cashier rails. The goal is
                simple: it should feel like a real room now, and only get
                tighter as we wire in more contracts.
              </p>

              <div className="mt-3 max-w-xs">
                <CasinoLiveStats variant="live" />
              </div>
            </div>

            {/* RIGHT-SIDE VISUAL CARD */}
            <div className="mt-4 md:mt-0 flex flex-1 justify-center md:justify-end">
              <div className="relative w-[260px] sm:w-[320px] md:w-[360px]">
                <div className="relative h-[220px] sm:h-[240px] rounded-3xl overflow-hidden border border-amber-300/60 bg-black/85 shadow-[0_28px_80px_rgba(0,0,0,0.95)]">
                  <Image
                    src="/images/live-tables-card-bg.png"
                    alt="Poker table"
                    fill
                    sizes="360px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  <div className="absolute left-4 bottom-4 space-y-1 text-[11px]">
                    <div className="uppercase tracking-[0.22em] text-amber-200/90">
                      PGLD Chip Rail
                    </div>
                    <div className="text-sm sm:text-base font-semibold">
                      Cash games, sit & gos, and featured tables all spin up
                      from this room.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BIG CTA: ENTER HOLD’EM ROOM */}
          <section className="space-y-4">
            <Link
              href="/poker-demo"
              className="group block rounded-3xl border border-amber-300/70 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.2),transparent_60%),#020617] px-4 py-4 sm:px-6 sm:py-5 shadow-[0_22px_70px_rgba(0,0,0,0.9)] hover:border-amber-300 hover:shadow-[0_0_40px_rgba(250,204,21,0.8)] transition"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-amber-200/90">
                    Main Room
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    Enter Hold’em Poker Room
                  </div>
                  <p className="text-[11px] sm:text-sm text-white/80 max-w-xl">
                    6-max and 9-max PGLD tables, clean betting flow, shared
                    rail energy, and a room coordinator keeping everything in
                    sync. Tap in, buy in at the cage, and play.
                  </p>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2">
                  <span className="rounded-full border border-amber-300/70 bg-amber-500/20 px-4 py-2 text-[12px] sm:text-sm font-semibold text-amber-100 group-hover:bg-amber-400/30">
                    Enter Poker Room →
                  </span>
                  <span className="text-[10px] text-white/55">
                    Optimized for mobile and desktop • PGLD chip rail
                  </span>
                </div>
              </div>
            </Link>
          </section>

          {/* ROOM / TABLE OVERVIEW */}
          <section className="space-y-5">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">
                Live floors now and next
              </h2>
              <p className="text-xs md:text-sm text-white/65">
                We&apos;re starting where the energy always is — Hold’em — and
                then lighting up everything around it.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Hold'em */}
              <div className="rounded-2xl border border-white/15 bg-black/80 p-4 text-[11px] sm:text-xs space-y-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/90">
                  Live Now
                </div>
                <div className="text-sm sm:text-base font-semibold text-white">
                  Texas Hold’em Cash
                </div>
                <p className="text-white/70">
                  6-max and 9-max tables with PGLD chips, clean betting flow,
                  dealer logic, and a shared coordinator so the room feels alive
                  instead of turn-based.
                </p>
                <ul className="mt-1 list-disc list-inside text-white/60 space-y-1">
                  <li>Standard blinds and structured stacks</li>
                  <li>Shared table history and hand outcomes</li>
                  <li>Room-level vibe tuned for real rail energy</li>
                </ul>
              </div>

              {/* Upcoming poker formats */}
              <div className="rounded-2xl border border-white/15 bg-black/80 p-4 text-[11px] sm:text-xs space-y-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                  Coming Up
                </div>
                <div className="text-sm sm:text-base font-semibold text-white">
                  Tournaments & Featured Tables
                </div>
                <p className="text-white/70">
                  Sit & gos, nightly tournaments, and occasional featured
                  tables where the lights get a little brighter and the stakes
                  climb.
                </p>
                <ul className="mt-1 list-disc list-inside text-white/60 space-y-1">
                  <li>Bracketed events with PGLD prize pools</li>
                  <li>Feature-table broadcasts once the stream stack is ready</li>
                  <li>Room promos tied back to the main casino floor</li>
                </ul>
              </div>

              {/* Other live tables */}
              <div className="rounded-2xl border border-white/15 bg-black/80 p-4 text-[11px] sm:text-xs space-y-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/90">
                  Live Tables Roadmap
                </div>
                <div className="text-sm sm:text-base font-semibold text-white">
                  Blackjack, Baccarat & Craps
                </div>
                <p className="text-white/70">
                  The same GLD casino tables you see on the main floor are
                  being wired for live, multi-seat play with synchronized rails.
                </p>
                <ul className="mt-1 list-disc list-inside text-white/60 space-y-1">
                  <li>Blackjack pits with shared shoes and betting rounds</li>
                  <li>Baccarat lanes with Player / Banker / Tie flows</li>
                  <li>Craps crews mapped to coordinated dice logic</li>
                </ul>
              </div>
            </div>
          </section>

          {/* CUSTOM ROOMS SECTION */}
          <section className="rounded-2xl border border-white/12 bg-black/80 p-4 md:p-5 text-[11px] md:text-sm text-white/70 space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm md:text-base font-semibold text-white">
                  Host a custom poker room for your own community
                </h3>
                <p className="text-[11px] md:text-sm text-white/70 max-w-xl">
                  Spin up a branded table for your project, crew, or community:
                  your logo on the felt, your rail in the seats, and PGLD chips
                  tracking every pot.
                </p>
              </div>
              <div className="mt-2 md:mt-0">
                <Link
                  href="/poker-rooms"
                  className="inline-flex items-center justify-center rounded-full border border-emerald-300/70 bg-emerald-500/15 px-4 py-2 text-[12px] sm:text-sm font-semibold text-emerald-200 hover:bg-emerald-400/25"
                >
                  Request a Custom Room →
                </Link>
              </div>
            </div>
            <ul className="list-disc list-inside text-[11px] md:text-sm text-white/60 space-y-1">
              <li>Dedicated tables for your own community events or seasons</li>
              <li>Seat reservations, blinds, and formats tuned to your group</li>
              <li>Clear path from “test night” to recurring featured games</li>
            </ul>
          </section>

          {/* EARLY ACCESS NOTE */}
          <section className="rounded-2xl border border-white/12 bg-black/80 p-4 md:p-5 text-[11px] md:text-sm text-white/70 space-y-2">
            <p>
              For now, think of this as the{' '}
              <span className="font-semibold text-[#FFD700]">
                early-access poker room
              </span>
              . The tables and flows are being treated as live from day one —
              the only thing still catching up is how the cage, profiles, and
              PGLD accounting plug into each other.
            </p>
            <p>
              When the cashier opens, your wallet, GLD / PGLD history, and
              table time all connect into a single player profile. If you&apos;re
              already playing here, you&apos;re sitting in the first orbit.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}
