// app/live-tables/page.tsx
import Link from "next/link";
import Image from "next/image";

export default function LiveTablesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      {/* HERO */}
      <section className="relative border-b border-white/10">
        {/* Background wash */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/live-poker-hero.png"
            alt="Base Gold Rush casino floor"
            fill
            sizes="100vw"
            className="object-cover opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#facc15_0,transparent_40%),linear-gradient(to_bottom,rgba(0,0,0,0.9),rgba(0,0,0,0.985))]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-6">
          {/* Top pill */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/70 border border-[#FFD700]/70 px-4 py-1.5 text-[10px] sm:text-xs uppercase tracking-[0.24em] text-[#FFD700]/90 shadow-[0_0_20px_rgba(255,215,0,0.35)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Base Gold Rush • Casino Lobby
            </div>
          </div>

          {/* Headline */}
          <div className="flex flex-col items-center text-center space-y-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
              Welcome to the{" "}
              <span className="text-[#FFD700]">Base Gold Rush</span>{" "}
              Casino Floor
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-white/75">
              A clean, premium lobby for live tables and casino games. Pick your action,
              choose your stakes, and step onto the floor.
            </p>
          </div>

          {/* TWO PILLARS: Live Tables + Casino Floor */}
          <div className="grid gap-4 md:grid-cols-2 pt-2">
            {/* LIVE TABLES PILLAR */}
            <Link
              href="#live"
              className="group relative overflow-hidden rounded-3xl border border-white/15 bg-black/70 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.85)]"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,215,0,0.18),transparent_55%)]" />
              </div>

              <div className="relative flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-black/60 border border-[#FFD700]/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#FFD700]/85">
                    Live Gaming Tables
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-lg md:text-xl font-bold tracking-tight">
                    Poker &amp; Blackjack Pits
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/65 max-w-md">
                    Multiplayer tables with synced seats, timers, and chip flow — built to feel
                    like a real casino floor.
                  </p>
                </div>

                <span className="shrink-0 text-[11px] text-[#FFD700]/85 group-hover:translate-x-0.5 transition-transform">
                  Enter →
                </span>
              </div>

              <div className="relative mt-4 h-20 rounded-2xl overflow-hidden border border-white/10 bg-black/60">
                <Image
                  src="/images/poker-room-medium1.png"
                  alt="Live tables preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
              </div>
            </Link>

            {/* CASINO FLOOR PILLAR */}
            <Link
              href="/casino" // if your lobby is still /arcade, change this to "/arcade"
              className="group relative overflow-hidden rounded-3xl border border-white/15 bg-black/70 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.85)]"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(34,197,94,0.12),transparent_55%)]" />
              </div>

              <div className="relative flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-black/60 border border-emerald-400/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-200/90">
                    Casino Floor
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-lg md:text-xl font-bold tracking-tight">
                    Slots, Keno &amp; House Games
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/65 max-w-md">
                    A curated floor of fast-play casino games in the Base Gold Rush style —
                    clean UI, big wins, no clutter.
                  </p>
                </div>

                <span className="shrink-0 text-[11px] text-emerald-200/90 group-hover:translate-x-0.5 transition-transform">
                  Enter →
                </span>
              </div>

              <div className="relative mt-4 h-20 rounded-2xl overflow-hidden border border-white/10 bg-black/60">
                {/* Re-using an existing asset so we don't introduce new images */}
                <Image
                  src="/images/blackjack-live-hero.png"
                  alt="Casino floor preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* LIVE GAME CARDS: POKER + BLACKJACK */}
      <section
        id="live"
        className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-6 scroll-mt-24"
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              Live tables on{" "}
              <span className="text-[#FFD700]">Base Gold Rush</span>
            </h2>
            <p className="text-[11px] md:text-xs text-white/60 max-w-xl">
              Two featured pits on the floor today — with the same on-chain spine for
              seats, boards, chips, and timers across the room.
            </p>
          </div>

          <div className="text-[10px] md:text-[11px] text-white/45 uppercase tracking-[0.22em]">
            Clean lobby • Premium layout • MGM energy
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* POKER LIVE TABLES */}
          <Link
            href="/poker"
            className="group rounded-3xl border border-white/20 bg-gradient-to-b from-black/90 via-[#0b1220] to-black/95 p-5 flex flex-col justify-between shadow-[0_18px_60px_rgba(0,0,0,0.95)]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD700]/12 border border-[#FFD700]/45 px-2.5 py-1 text-[10px] font-semibold text-[#FFD700]/90">
                  Live Poker
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-[10px] text-white/50 uppercase tracking-[0.18em]">
                  Hold&apos;em Cash Tables
                </span>
              </div>

              <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-white/15 bg-black/70">
                <Image
                  src="/images/poker-room-medium1.png"
                  alt="Live poker tables"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain transform group-hover:scale-[1.03] transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-2 left-3 text-[10px] text-white/80 space-y-0.5">
                  <div className="font-semibold text-[#FFD700]">
                    Low / Medium / High stakes
                  </div>
                  <div className="font-mono text-[9px] text-white/70">
                    Room IDs: BGRC-holdem-room, club-codes
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] sm:text-xs text-white/75">
                <p>
                  2–9 seat Texas Hold&apos;em cash games with synced boards,
                  blinds, and action timers. Each browser / device = its own
                  chair at the felt.
                </p>
                <ul className="space-y-1">
                  <li>• Live PGLD chip stacks with seat buy-ins</li>
                  <li>• Low / Medium / High blind tables + private clubs</li>
                  <li>• Same table model later maps directly into BGLD/BGRC</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] text-[#FFD700]/90">
              <span className="group-hover:translate-x-0.5 transition-transform">
                Enter Poker Tables →
              </span>
              <span className="font-mono text-white/70">
                /poker &bull; BGRC
              </span>
            </div>
          </Link>

          {/* BLACKJACK LIVE TABLES */}
          <Link
            href="/blackjack-live"
            className="group rounded-3xl border border-white/20 bg-gradient-to-b from-black/90 via-[#0b1220] to-black/95 p-5 flex flex-col justify-between shadow-[0_18px_60px_rgba(0,0,0,0.95)]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 border border-emerald-400/40 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
                  Blackjack
                  <span className="ml-1 rounded-full border border-amber-400/60 bg-amber-500/12 px-1.5 py-0.5 text-[9px] text-amber-200">
                    Coming Soon
                  </span>
                </div>
                <span className="text-[10px] text-white/50 uppercase tracking-[0.18em]">
                  21 Live Tables
                </span>
              </div>

              <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-white/15 bg-black/70">
                <Image
                  src="/images/blackjack-live-hero.png"
                  alt="Live blackjack tables"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain transform group-hover:scale-[1.03] transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute bottom-2 left-3 text-[10px] text-white/80 space-y-0.5">
                  <div className="font-semibold text-emerald-200">
                    Single &amp; multi-hand tables
                  </div>
                  <div className="font-mono text-[9px] text-white/70">
                    Dealer-first, PGLD chips next
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] sm:text-xs text-white/75">
                <p>
                  Live 21 tables built on the same multiplayer spine: seats,
                  shoe, bets, and payouts all flow through the Base Gold Rush
                  cage.
                </p>
                <ul className="space-y-1">
                  <li>• Classic Vegas-style Blackjack</li>
                  <li>• Planned: side bets, streak trackers, hot seats</li>
                  <li>• PGLD / BGLD rails snap in after the poker launch</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] text-emerald-200/90">
              <span className="group-hover:translate-x-0.5 transition-transform">
                View Blackjack Tables →
              </span>
              <span className="font-mono text-white/60">
                /blackjack &bull; live soon
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* FUTURE GAMES STRIP */}
      <section className="mx-auto max-w-6xl px-4 pb-8 md:pb-10 space-y-3 text-[11px] md:text-sm text-white/65">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="uppercase tracking-[0.22em] text-white/60 text-[10px]">
            More live games loading
          </span>
          <span className="text-white/40 text-[10px]">
            Roadmap: Craps • Baccarat • Roulette • Specialty tables
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-[11px]">
          {["Craps", "Baccarat", "Roulette"].map((label) => (
            <div
              key={label}
              className="rounded-2xl border border-white/15 bg-black/70 px-3 py-3 flex flex-col justify-between opacity-60"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-white/80">{label}</span>
                <span className="rounded-full border border-white/25 bg-black/70 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-white/55">
                  In Design
                </span>
              </div>
              <p className="text-white/55 text-[10px]">
                This pit lights up once the math, dealers, and rails are ready
                to plug into the same live table spine.
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-white/60 text-[11px] md:text-sm">
          As each new table goes live, it shows up here with its own room grid,
          stakes filters, and direct links into the floor.
        </p>
      </section>
    </main>
  );
}
