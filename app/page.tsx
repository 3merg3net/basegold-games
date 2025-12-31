// app/page.tsx
import Link from "next/link";
import Image from "next/image";
import CasinoLiveStats from "@/components/casino/layout/CasinoLiveStats";
import SiteFooter from '@/components/wallet/SiteFooter'


const CASINO_GAMES = [
  { title: "Casino Lobby", subtitle: "Full floor", href: "/arcade", icon: "/icons/game-slots.png" },
  { title: "Blackjack", subtitle: "Live tables", href: "/blackjack-live", icon: "/icons/game-blackjack.png" },
  { title: "Roulette", subtitle: "Coming soon", href: "/arcade", icon: "/icons/game-roulette.png" },
  { title: "Slots", subtitle: "Progressives", href: "/arcade", icon: "/icons/game-slots.png" },
  // Keep only icons/routes that actually exist in /public
 
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      {/* HERO – POKER FIRST */}
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
          {/* TITLE BLOCK */}
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/70 bg-black/80 px-4 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.24em] text-[#FFD700]/90 shadow-[0_0_20px_rgba(255,215,0,0.45)]">
              Base Gold Rush • On-Chain Casino
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              <span className="text-[#FFD700]">Poker</span> is Live.
              <span className="text-white/85"> The Floor is Loading.</span>
            </h1>

            <p className="text-[12px] sm:text-sm text-white/75 leading-relaxed">
              Sit in with PGLD poker chips. Blackjack and the casino lobby plug into the same rails.
            </p>

            <p className="text-[10px] sm:text-xs text-white/55">
              PGLD powers the poker pits. GLD runs the casino floor. One stack, one chain.
            </p>

            {/* PRIMARY CTAs – reduce clicks */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              <Link
                href="/poker"
                className="w-full sm:w-auto rounded-full bg-[#FFD700] px-6 py-2.5 text-sm font-semibold text-black shadow-[0_20px_55px_rgba(250,204,21,0.9)] hover:bg-yellow-400 transition text-center"
              >
                Enter Poker Lobby →
              </Link>

              <Link
                href="/blackjack-live"
                className="w-full sm:w-auto rounded-full border border-emerald-300/35 bg-black/70 px-6 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10 hover:border-emerald-300/60 transition text-center"
              >
                Play Blackjack →
              </Link>

              <Link
                href="/arcade"
                className="w-full sm:w-auto rounded-full border border-white/20 bg-black/60 px-6 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:border-white/30 transition text-center"
              >
                Casino Lobby →
              </Link>
            </div>
          </div>

          {/* LIVE STATS – use real Variant */}
          <div className="flex justify-center">
            <div className="w-full max-w-3xl">
              <CasinoLiveStats variant="live" />
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
                  Poker Room
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
                  Texas Hold’em cash tables with synced seats, blinds, boards, and action timers.
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
                  alt="Base Gold Rush Blackjack"
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
                  Vegas-style Live blackjack tables. Take a seat and stack that 21 Gold
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
          {/* MARQUEE CASINO RAIL */}
          <section className="pt-2">
            <div className="flex items-end justify-between gap-3 mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">
                  Casino Floor
                </div>
                <h3 className="text-lg md:text-xl font-bold">
                  More games on the floor
                </h3>
              </div>

              <Link
                href="/arcade"
                className="text-[11px] text-emerald-200/90 hover:text-emerald-200"
              >
                Enter casino lobby →
              </Link>
            </div>

            <div className="relative bgr-marquee-wrap rounded-2xl">
              <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-black to-transparent z-10" />
              <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-black to-transparent z-10" />

              {/* Track (duplicated list for seamless loop) */}
              <div className="bgr-marquee-track gap-3 pr-3 py-1">
                {[...CASINO_GAMES, ...CASINO_GAMES].map((g, idx) => (
                 <Link
  key={`${g.title}-${idx}`}
  href={g.href}
  className="
    min-w-[220px] sm:min-w-[260px]
    rounded-2xl
    border border-white/15
    bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.18),_transparent_55%),linear-gradient(to_bottom,#020617,#000)]
    hover:border-[#FFD700]/50
    transition
    shadow-[0_18px_50px_rgba(0,0,0,0.85)]
    group
  "
>
  {/* ICON HERO */}
  <div className="relative h-36 sm:h-40 flex items-center justify-center">
    <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/80" />

    <div className="relative h-24 w-24 sm:h-28 sm:w-28">
      <Image
        src={g.icon}
        alt={g.title}
        fill
        className="
          object-contain
          drop-shadow-[0_0_18px_rgba(255,215,0,0.45)]
          transition-transform
          duration-300
          group-hover:scale-110
        "
      />
    </div>
  </div>

  {/* TEXT BLOCK */}
  <div className="px-4 pb-4 pt-2">
    <div className="font-semibold text-white/95 text-sm truncate">
      {g.title}
    </div>
    <div className="text-[11px] text-white/55 truncate">
      {g.subtitle}
    </div>

    <div className="mt-2 flex items-center justify-between text-[11px]">
      <span className="text-white/45">Enter</span>
      <span className="text-emerald-200/90 group-hover:translate-x-0.5 transition-transform">
        →
      </span>
    </div>
  </div>
</Link>

                ))}
              </div>
            </div>

            <div className="mt-2 text-[10px] text-white/45">
              Tip: hover to pause (desktop). For accessibility, animation stops with reduced-motion.
            </div>
          </section>


          <div className="mx-auto max-w-3xl text-center text-[11px] sm:text-xs text-white/65">
            Poker is the fastest path to action. The casino rail shows what’s next.
          </div>
        </div>
      </section>

      {/* GLD / PGLD STRIP (kept) */}
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

      {/* SPINNING CHIP ELEMENT (kept) */}
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
              One chip that bridges poker pits and casino floor — all settled on Base.
            </div>
          </div>
        </div>
      </section>

      {/* RESPONSIBLE GAMING STRIP (kept) */}
      <section className="border-t border-white/10 bg-black/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-[11px] text-white/55 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-white/75">
              Play like you&apos;re in a real casino.
            </div>
            <div>
              Set limits, take breaks, and treat every spin, hand, and roll as entertainment first.
            </div>
          </div>
          <div className="text-right md:text-left">
            <div>Know your odds, and never chase losses.</div>
            <div>Some regions may be restricted once real chips go live.</div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
