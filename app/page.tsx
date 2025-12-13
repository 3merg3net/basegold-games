// app/page.tsx
import Link from "next/link";
import Image from "next/image";
import CasinoLiveStats from "@/components/casino/layout/CasinoLiveStats";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      {/* HERO – CLEAN CASINO LOBBY */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* Background wash */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/bg-goldrush-hero-V2.png"
            alt="Base Gold Rush casino floor"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.9),rgba(0,0,0,0.98))]" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.2),transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.16),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-7">
          {/* TITLE BLOCK – SHORT & BULLISH */}
          <div className="max-w-xl mx-auto text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/70 bg-black/80 px-4 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.24em] text-[#FFD700]/90 shadow-[0_0_20px_rgba(255,215,0,0.45)]">
              Base Gold Rush • On-Chain Casino
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Live Tables &amp; Casino Games on{" "}
              <span className="text-[#FFD700]">Base</span>.
            </h1>

            <p className="text-[12px] sm:text-sm text-white/75 leading-relaxed">
              A Vegas-style property where every seat, stack, and spin runs
              through chain-tracked chips.
            </p>

            <p className="text-[10px] sm:text-xs text-white/55">
              PGLD powers the poker pits. GLD runs the casino floor. One stack,
              one chain.
            </p>
          </div>

          {/* OPTIONAL: LIVE STATS (kept, just placed cleanly) */}
          <div className="flex justify-center">
            <div className="w-full max-w-3xl">
              <CasinoLiveStats />
            </div>
          </div>

          {/* FEATURED ENTRANCES – BALANCED (LIVE TABLES + CASINO FLOOR) */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* LIVE TABLES – FEATURE CARD */}
            <Link
              href="/live-tables"
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/18 bg-black/90 shadow-[0_20px_60px_rgba(0,0,0,0.95)]"
            >
              {/* Image */}
              <div className="relative w-full h-64 sm:h-72 md:h-[22rem]">
                <Image
                  src="/images/poker-hero-wide1.png"
                  alt="Live Tables at Base Gold Rush"
                  fill
                  sizes="(max-width:768px) 100vw, 50vw"
                  className="object-cover object-top"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/85" />

                {/* Corner pill */}
                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-[#FFD700]/45 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#FFD700]/85">
                  Live Gaming Tables
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col gap-3 px-5 py-5 bg-black/90">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">
                    Enter the{" "}
                    <span className="text-[#FFD700]">Live Table Lobby</span>.
                  </h2>
                  <p className="text-xs sm:text-sm text-white/80">
                    Poker is live now. Blackjack tables are next — same multiplayer
                    spine, synced seats, and casino pacing.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] sm:text-xs text-white/70">
                  <div className="rounded-2xl border border-white/12 bg-black/70 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                      Poker
                    </div>
                    <div className="font-semibold text-white/85">Live</div>
                  </div>
                  <div className="rounded-2xl border border-white/12 bg-black/70 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                      Blackjack
                    </div>
                    <div className="font-semibold text-amber-200/90">
                      Coming Soon
                    </div>
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-white/60">
                  <span>Pick a table and take a seat.</span>
                  <span className="font-semibold text-[#FFD700]/90 group-hover:translate-x-0.5 transition-transform">
                    Enter live tables →
                  </span>
                </div>
              </div>
            </Link>

            {/* CASINO FLOOR – FEATURE CARD */}
            <Link
              href="/arcade" // swap to "/casino" if that’s your new lobby path
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/18 bg-black/90 shadow-[0_20px_60px_rgba(0,0,0,0.95)]"
            >
              {/* Image */}
              <div className="relative w-full h-64 sm:h-72 md:h-[22rem] bg-black">
                <Image
                  src="/images/casino-floor-wide.png"
                  alt="Base Gold Rush casino floor"
                  fill
                  sizes="(max-width:768px) 100vw, 50vw"
                  className="object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/85" />

                {/* Corner pill */}
                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-200/90">
                  Casino Floor
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col gap-3 px-5 py-5 bg-black/90">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">
                    Walk the{" "}
                    <span className="text-emerald-200">Main Casino Floor</span>.
                  </h2>
                  <p className="text-xs sm:text-sm text-white/80">
                    House games, fast-play action, and the full Base Gold Rush vibe —
                    designed like a premium casino lobby.
                  </p>
                </div>

                {/* Small icon cluster (kept from your card) */}
                <div className="flex items-center justify-between gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="relative h-10 w-10 rounded-xl border border-white/15 bg-black/90 overflow-hidden">
                      <Image
                        src="/icons/game-roulette1.png"
                        alt="Roulette"
                        fill
                        className="object-contain p-1.5"
                      />
                    </div>
                    <div className="relative h-10 w-10 rounded-xl border border-white/15 bg-black/90 overflow-hidden">
                      <Image
                        src="/icons/game-blackjack1.png"
                        alt="Blackjack"
                        fill
                        className="object-contain p-1.5"
                      />
                    </div>
                    <div className="relative h-10 w-10 rounded-xl border border-white/15 bg-black/90 overflow-hidden">
                      <Image
                        src="/icons/game-slots.png"
                        alt="Slots"
                        fill
                        className="object-contain p-1.5"
                      />
                    </div>
                  </div>

                  <div className="text-right text-[11px] sm:text-xs text-white/65">
                    <div className="font-semibold text-white/85">
                      Roulette, Blackjack, Slots
                    </div>
                    <div className="text-white/50">
                      Craps &amp; Baccarat loading
                    </div>
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-white/60">
                  <span>Tap to enter the casino lobby.</span>
                  <span className="font-semibold text-emerald-200 group-hover:translate-x-0.5 transition-transform">
                    Enter casino →
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Small neutral guidance line (kept concept, less poker-biased) */}
          <div className="mx-auto max-w-3xl text-center text-[11px] sm:text-xs text-white/65">
            Start at the tables or hit the casino floor — everything routes through the same chip rails on Base.
          </div>
        </div>
      </section>

      {/* REBALANCED SECTION HEADER (kept your section, made neutral) */}
      <section className="mx-auto max-w-6xl px-4 pt-6 pb-4 md:pt-8 md:pb-6 space-y-4">
        <div className="flex flex-col gap-2 text-center sm:text-left sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg md:text-xl font-bold">
            One property. Two rails.
          </h3>
          <p className="text-[11px] md:text-xs text-white/65">
            Live poker pits + casino floor games — all tied to the same wallet and chip spine.
          </p>
        </div>
      </section>

      {/* GLD / PGLD STRIP (UNCHANGED) */}
      <section className="mx-auto max-w-6xl px-4 pb-6 md:pb-8 text-[11px] md:text-sm text-white/75 space-y-3">
        <div className="rounded-2xl border border-white/12 bg-black/85 p-4 md:p-5 shadow-[0_18px_50px_rgba(0,0,0,0.85)] space-y-2">
          <div className="text-xs md:text-sm font-semibold text-[#FFD700] mb-1">
            GLD casino chips &amp; PGLD poker chips
          </div>
          <p>
            <span className="font-semibold text-[#FACC15]">GLD</span> runs the
            casino floor — roulette, blackjack, craps, baccarat, and side games.
          </p>
          <p>
            <span className="font-semibold text-sky-300">PGLD</span> runs the
            poker room so stacks, pots, and promos stay clean while everything
            still ties back to the same wallet.
          </p>
          <p>
            One protocol, two rails, all on Base. Chips move between cashier,
            tables, and poker pits on the same spine.
          </p>
        </div>
      </section>

      {/* SPINNING CHIP ELEMENT NEAR BOTTOM (UNCHANGED) */}
      <section className="mx-auto max-w-6xl px-4 pb-8 md:pb-10">
        <div className="relative mx-auto w-[260px] sm:w-[320px]">
          <div className="relative h-[220px] sm:h-[260px] rounded-3xl overflow-hidden border border-[#FFD700]/35 bg-black shadow-[0_30px_90px_rgba(0,0,0,0.95)]">
            <Image
              src="/images/hero-pedestal.png"
              alt="Base Gold Rush chip pedestal"
              fill
              sizes="320px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.35),transparent_65%)]" />
            <div className="absolute inset-x-0 bottom-14 flex justify-center">
              <div className="relative h-36 w-36 sm:h-40 sm:w-40">
                <Image
                  src="/chips/chip-bgrc-main.png"
                  alt="GLD casino chip"
                  fill
                  className="object-contain chip-hero-anim select-none drop-shadow-[0_18px_40px_rgba(0,0,0,0.9)]"
                />
              </div>
            </div>
          </div>

          <div className="relative -mt-4 rounded-2xl border border-white/15 bg-black/90 px-4 py-3 text-[11px] sm:text-xs text-white/80 shadow-[0_12px_30px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/50">
                GLD Casino Chip
              </span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                Base • L2
              </span>
            </div>
            <div className="mt-2 text-[11px] sm:text-xs">
              One chip that bridges poker pits and casino floor — all settled on
              Base.
            </div>
          </div>
        </div>
      </section>

      {/* RESPONSIBLE GAMING STRIP (UNCHANGED) */}
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
  );
}
