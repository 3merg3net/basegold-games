// app/page.tsx
import Link from "next/link";
import Image from "next/image";
import SiteFooter from "@/components/wallet/SiteFooter";

// NOTE: update this to your real tournaments lobby route if different.
const TOURNAMENTS_HREF = "/poker/tournaments";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      {/* HERO – LIVE TABLES (POKER DEFAULT) */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* Background wash */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/bg-goldrush-hero-V2.png"
            alt="Base Gold Rush live tables"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.9),rgba(0,0,0,0.98))]" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.2),transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.16),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-7">
          {/* TITLE BLOCK */}
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/70 bg-black/80 px-4 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.24em] text-[#FFD700]/90 shadow-[0_0_20px_rgba(255,215,0,0.45)]">
              Gld Rush • Live Tables
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              <span className="text-[#FFD700]">Peer-to-peer OnChain Live Tables</span>
              <span className="text-white/85"> Driven with BGLD.</span>
            </h1>

            <p className="text-[12px] sm:text-sm text-white/75 leading-relaxed">
              Real-time tables with on-chain execution. Poker is player-to-player; blackjack is a live
              table experience.
            </p>

            <p className="text-[10px] sm:text-xs text-white/55">
              Smart-contract verified on <span className="text-sky-200/90 font-semibold">Base</span> — Coinbase’s L2 network.
            </p>

            {/* PRIMARY CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              <Link
                href="/poker"
                className="w-full sm:w-auto rounded-full bg-[#FFD700] px-6 py-2.5 text-sm font-semibold text-black shadow-[0_20px_55px_rgba(250,204,21,0.9)] hover:bg-yellow-400 transition text-center"
              >
                Enter Poker (Cash) →
              </Link>

              <Link
                href="/blackjack-live"
                className="w-full sm:w-auto rounded-full border border-emerald-300/35 bg-black/70 px-6 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10 hover:border-emerald-300/60 transition text-center"
              >
                Play Blackjack →
              </Link>
            </div>

            {/* TOURNAMENTS (SUBTLE) */}
            <div className="pt-1 text-[11px] text-white/60">
              <Link
                href={TOURNAMENTS_HREF}
                className="text-sky-200/90 hover:text-sky-200 underline underline-offset-4"
              >
                Tournament lobby →
              </Link>
              <span className="mx-2 text-white/35">•</span>
              <span>More live tables unlock over time.</span>
            </div>
          </div>

          {/* FEATURED: Poker (primary) + Blackjack (secondary) */}
          <div className="grid gap-5 md:grid-cols-3">
            {/* POKER PRIMARY */}
            <Link
              href="/poker"
              className="group md:col-span-2 relative flex flex-col overflow-hidden rounded-3xl border border-[#FFD700]/40 bg-black/90 shadow-[0_20px_60px_rgba(0,0,0,0.95)]"
            >
              <div className="relative w-full h-72 sm:h-80 md:h-[24rem]">
                <Image
                  src="/images/poker-card-hero.png"
                  alt="Base Gold Rush Poker Lobby"
                  fill
                  sizes="(max-width:768px) 100vw, 66vw"
                  className="object-cover object-top group-hover:scale-[1.02] transition-transform duration-500"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/90" />

                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-[#FFD700]/45 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#FFD700]/90">
                  P2P Poker
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 px-5 py-5 bg-black/90">
                <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">
                  Sit down. Buy in. <span className="text-[#FFD700]">Play Hold’em.</span>
                </h2>
                <p className="text-xs sm:text-sm text-white/80">
                  Player-to-player Texas Hold’em cash tables with synced seats, blinds, boards, and action timers.
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-white/60">
                  <span>Fastest path to action.</span>
                  <span className="font-semibold text-[#FFD700]/90 group-hover:translate-x-0.5 transition-transform">
                    Enter poker →
                  </span>
                </div>
              </div>
            </Link>

            {/* BLACKJACK SECONDARY */}
            <Link
              href="/blackjack-live"
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/18 bg-black/90 shadow-[0_20px_60px_rgba(0,0,0,0.95)]"
            >
              <div className="relative w-full h-72 sm:h-80 md:h-[24rem] bg-black">
                <Image
                  src="/images/blackjack-live-hero2.png"
                  alt="Blackjack live table"
                  fill
                  sizes="(max-width:768px) 100vw, 34vw"
                  className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/90" />

                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-200/90">
                  LIVE TABLE
                </div>
              </div>

              <div className="flex flex-col gap-2 px-5 py-5 bg-black/90">
                <h3 className="text-lg sm:text-xl font-extrabold leading-tight">
                  Play <span className="text-emerald-200">21</span>.
                </h3>
                <p className="text-[11px] sm:text-xs text-white/75">
                  Real-time blackjack tables with crisp UI, fast hands, and smooth flow.
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-white/60">
                  <span>Jump straight in.</span>
                  <span className="font-semibold text-emerald-200 group-hover:translate-x-0.5 transition-transform">
                    Play blackjack →
                  </span>
                </div>
              </div>
            </Link>
          </div>

          <div className="mx-auto max-w-3xl text-center text-[11px] sm:text-xs text-white/65">
            Poker is player-to-player. Live tables execute on-chain on Base.
          </div>
        </div>
      </section>

      {/* RESPONSIBLE PLAY STRIP (cleaned wording) */}
      <section className="border-t border-white/10 bg-black/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-[11px] text-white/55 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-white/75">Play responsibly.</div>
            <div>Set limits, take breaks, and treat every session as entertainment first.</div>
          </div>
          <div className="text-right md:text-left">
            <div>Know your odds and never chase losses.</div>
            <div>Some regions may be restricted once real chips go live.</div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
