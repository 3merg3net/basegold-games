// app/live-tables/page.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import CasinoLiveStats from '@/components/casino/layout/CasinoLiveStats'

export default function LiveTablesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <section className="relative border-b border-white/10">
        {/* SOFT PAGE BACKGROUND */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/live-poker-entrance.png"
            alt="Base Gold Rush live poker entrance"
            fill
            sizes="100vw"
            className="object-cover opacity-25"
            priority
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.35),transparent_50%),linear-gradient(to_bottom,rgba(0,0,0,0.9),rgba(0,0,0,0.98))]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-8">
          {/* HERO: POKER ROOM FOCUS, MOBILE-FIRST */}
          <div className="space-y-6">
            {/* TOP PILL */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-black/80 px-4 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-[0.22em] text-amber-100 shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                🃏 Base Gold Rush • Live Poker Room
              </div>
            </div>

            {/* CLICKABLE HERO CARD */}
            <Link
              href="/poker"
              className="group mx-auto w-full max-w-md rounded-[1.75rem] overflow-hidden border border-amber-300/80 bg-black/90 shadow-[0_0_60px_rgba(0,0,0,1)] ring-1 ring-[#FFD700]/40 animate-goldPulse"
            >
              {/* IMAGE TOP HALF */}
              <div className="relative w-full h-72 sm:h-80">
                <Image
                  src="/images/live-poker-entrance.png"
                  alt="Entrance to the live poker room"
                  fill
                  priority
                  sizes="(max-width: 640px) 100vw, 480px"
                  className="object-cover object-center"
                />
                {/* Darken edges for depth */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/70" />
              </div>

              {/* CONTENT BLOCK UNDER IMAGE */}
              <div className="flex flex-col items-center text-center gap-3 px-5 py-5 bg-black/90">
                <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                  Enter the <span className="text-[#FFD700]">Poker Room</span>
                </h1>

                <p className="text-xs sm:text-sm text-white/80 font-medium max-w-sm">
                  Live Texas Hold’em cash tables powered by PGLD chips. Built
                  for real casino flow, starting on Base chain.
                </p>

                {/* CTA */}
                <div className="w-full max-w-xs">
                  <div className="rounded-full border border-amber-300/85 bg-[#FFD700]/20 px-6 py-2.5 text-sm sm:text-base font-bold text-amber-50 shadow-[0_0_40px_rgba(255,215,0,0.6)] group-hover:bg-[#FFD700]/30 group-hover:shadow-[0_0_60px_rgba(255,215,0,0.9)] transition text-center">
                    ENTER HOLD’EM ROOM →
                  </div>
                </div>

                <p className="text-[10px] sm:text-xs text-white/65">
                  9-max • PGLD Chip Rail • Shared Room Vibes
                </p>

                <div className="w-full max-w-[260px] pt-1">
                  <CasinoLiveStats variant="live" />
                </div>
              </div>
            </Link>
          </div>

          {/* POKER FIRST. TABLES NEXT. */}
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Poker first. Everything else follows.
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Live now: Hold'em */}
              <div className="rounded-2xl border border-amber-300/60 bg-black/85 p-4 text-[11px] sm:text-xs space-y-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/95">
                  Live Now
                </div>
                <div className="text-sm sm:text-base font-semibold text-white">
                  Texas Hold’em Cash Tables
                </div>
                <ul className="mt-1 list-disc list-inside text-white/75 space-y-1">
                  <li>6-max and 9-max seats</li>
                  <li>PGLD chip rail and clean betting flow</li>
                  <li>Room coordinator keeping tables in sync</li>
                </ul>
              </div>

              {/* Coming: tournaments & featured tables */}
              <div className="rounded-2xl border border-white/15 bg-black/80 p-4 text-[11px] sm:text-xs space-y-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                  Next Up
                </div>
                <div className="text-sm sm:text-base font-semibold text-white">
                  Tournaments & Featured Tables
                </div>
                <ul className="mt-1 list-disc list-inside text-white/70 space-y-1">
                  <li>Sit & gos and nightly events</li>
                  <li>PGLD prize pools and brackets</li>
                  <li>Feature tables once streaming stack is wired</li>
                </ul>
              </div>

              {/* Roadmap: other live tables */}
              <div className="rounded-2xl border border-emerald-300/70 bg-black/80 p-4 text-[11px] sm:text-xs space-y-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/95">
                  Live Tables Roadmap
                </div>
                <div className="text-sm sm:text-base font-semibold text-white">
                  Blackjack, Baccarat & Craps
                </div>
                <ul className="mt-1 list-disc list-inside text-white/70 space-y-1">
                  <li>Multi-seat blackjack pits with shared shoes</li>
                  <li>Baccarat lanes with Player / Banker / Tie</li>
                  <li>Craps crews mapped to coordinated dice logic</li>
                </ul>
              </div>
            </div>
          </section>

          {/* CUSTOM ROOMS */}
          <section className="rounded-2xl border border-white/12 bg-black/80 p-4 md:p-5 text-[11px] md:text-sm text-white/75 space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <h3 className="text-sm md:text-base font-semibold text-white">
                  Run a poker room for your own community.
                </h3>
                <p className="text-[11px] md:text-sm text-white/70 max-w-xl">
                  Spin up a branded table with your logo on the felt and your
                  crew in the seats, all tracked in PGLD.
                </p>
              </div>
              <div className="mt-1 md:mt-0">
                <Link
                  href="/poker-rooms"
                  className="inline-flex items-center justify-center rounded-full border border-emerald-300/80 bg-emerald-500/15 px-4 py-2 text-[12px] sm:text-sm font-semibold text-emerald-200 hover:bg-emerald-400/25"
                >
                  Request a Custom Room →
                </Link>
              </div>
            </div>
          </section>

          {/* EARLY ACCESS NOTE – LIVE, NOT DEMO */}
          <section className="rounded-2xl border border-white/12 bg-black/85 p-4 md:p-5 text-[11px] md:text-sm text-white/70 space-y-2">
            <p>
              This is the{' '}
              <span className="font-semibold text-[#FFD700]">
                live poker floor
              </span>{' '}
              for Base Gold Rush. Cashier rails, profiles, and full PGLD
              accounting are being wired in around the same tables you&apos;re
              already playing on.
            </p>
            <p>
              As everything connects, your wallet, chip history, and table time
              roll into a single player profile. If you&apos;re here now,
              you&apos;re in the first orbit.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}
