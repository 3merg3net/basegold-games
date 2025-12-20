'use client'

import Link from 'next/link'
import Image from 'next/image'
import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'

type SlotGame = {
  href: string
  label: string
  tag: string
  desc: string
  icon: string
}

const slotGames: SlotGame[] = [
  {
    href: '/arcade/gold-rush-slots',
    label: 'Gold Rush Slots',
    tag: 'Classic 3-Reel',
    desc: 'Old-school reels with modern pacing. Pull the lever and chase the motherlode.',
    icon: '/icons/game-slots.png',
  },
  {
    href: '/arcade/tri-wheel-fortune',
    label: 'Tri-Wheel Fortune',
    tag: 'Triple Wheel',
    desc: 'Three mini wheels firing at once. Combos, streaks, and chaos payouts.',
    icon: '/icons/game-roulette1.png',
  },
  {
    href: '/arcade/hand-youre-dealt',
    label: "Hand You’re Dealt",
    tag: 'Reel Poker',
    desc: 'Five-card reel poker with a wild kicker. Saloon rules apply.',
    icon: '/icons/game-video-poker1.png',
  },
  {
    href: '/arcade/golden-alignment',
    label: 'Golden Alignment',
    tag: 'Puzzle Slots',
    desc: 'Line up coins, nuggets, and vaults across reels for nasty multipliers.',
    icon: '/icons/game-golden-alignment.png',
  },
]

export default function SlotsArcadePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Page-only “wild” CSS */}
      <style jsx>{`
        /* ---------- HERO FX LAYERS ---------- */
        .heroWrap { position: relative; overflow: hidden; }
        .heroOverlay {
          position: absolute; inset: 0;
          background:
            radial-gradient(circle at 20% 10%, rgba(250,204,21,0.40), transparent 55%),
            radial-gradient(circle at 85% 30%, rgba(56,189,248,0.16), transparent 55%),
            linear-gradient(to bottom, rgba(0,0,0,0.52), rgba(0,0,0,0.92));
          pointer-events: none;
        }

        .scanlines {
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0.04),
            rgba(255,255,255,0.04) 1px,
            rgba(0,0,0,0) 3px,
            rgba(0,0,0,0) 7px
          );
          opacity: 0.10;
          mix-blend-mode: overlay;
          pointer-events: none;
        }

        .goldDust {
          position: absolute; inset: -20%;
          background-image:
            radial-gradient(circle, rgba(250,204,21,0.22) 0 1px, transparent 1px),
            radial-gradient(circle, rgba(250,204,21,0.12) 0 1px, transparent 1px);
          background-size: 18px 18px, 34px 34px;
          opacity: 0.45;
          filter: blur(0.2px);
          animation: dustDrift 14s linear infinite;
          pointer-events: none;
        }
        @keyframes dustDrift {
          from { transform: translate3d(-2%, 2%, 0); }
          to   { transform: translate3d( 2%,-2%, 0); }
        }

        .heatShimmer {
          position: absolute; inset: 0;
          background: linear-gradient(
            115deg,
            transparent 0%,
            rgba(255,215,0,0.14) 42%,
            transparent 60%,
            rgba(56,189,248,0.10) 78%,
            transparent 100%
          );
          transform: translateX(-35%);
          animation: shimmer 6.25s ease-in-out infinite;
          mix-blend-mode: screen;
          pointer-events: none;
        }
        @keyframes shimmer {
          0%   { transform: translateX(-35%); opacity: 0.30; }
          50%  { transform: translateX(15%);  opacity: 0.62; }
          100% { transform: translateX(-35%); opacity: 0.30; }
        }

        /* ---------- NEON SIGN ---------- */
        .neonSign {
          text-shadow:
            0 3px 18px rgba(0,0,0,0.85),
            0 0 24px rgba(250,204,21,0.35),
            0 0 60px rgba(250,204,21,0.22);
          letter-spacing: 0.08em;
        }

        .neonFlicker { animation: flicker 3.6s infinite; }
        @keyframes flicker {
          0%, 100% { opacity: 1; filter: brightness(1); }
          7% { opacity: 0.85; filter: brightness(0.95); }
          9% { opacity: 1; }
          42% { opacity: 0.92; }
          45% { opacity: 1; }
          74% { opacity: 0.88; }
          76% { opacity: 1; }
        }

        /* ---------- MARQUEE STRIP ---------- */
        .marqueeWrap { overflow: hidden; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); }
        .marqueeTrack {
          display: flex;
          width: max-content;
          animation: marquee 18s linear infinite;
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        /* ---------- CABINET TILES ---------- */
        .cabinet {
          position: relative;
          border-radius: 26px;
          overflow: hidden;
          border: 1px solid rgba(250,204,21,0.35);
          background:
            radial-gradient(circle at 20% 0%, rgba(250,204,21,0.18), transparent 55%),
            radial-gradient(circle at 100% 100%, rgba(56,189,248,0.10), transparent 55%),
            linear-gradient(to bottom, #06070b, #020617);
          box-shadow: 0 18px 60px rgba(0,0,0,0.9);
          transform: translateZ(0);
        }

        .cabinet::before {
          content: "";
          position: absolute; inset: -2px;
          background: conic-gradient(
            from 180deg,
            rgba(250,204,21,0.0),
            rgba(250,204,21,0.55),
            rgba(56,189,248,0.25),
            rgba(250,204,21,0.55),
            rgba(250,204,21,0.0)
          );
          filter: blur(10px);
          opacity: 0.0;
          transition: opacity 250ms ease;
          pointer-events: none;
        }
        .cabinet:hover::before { opacity: 0.55; }

        .edgeLights {
          position: absolute; inset: 0;
          background: linear-gradient(90deg,
            rgba(250,204,21,0.0),
            rgba(250,204,21,0.22),
            rgba(56,189,248,0.10),
            rgba(250,204,21,0.22),
            rgba(250,204,21,0.0)
          );
          opacity: 0.16;
          transform: translateX(-20%);
          animation: edgeSweep 3.8s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes edgeSweep {
          0%   { transform: translateX(-30%); opacity: 0.10; }
          50%  { transform: translateX(20%);  opacity: 0.22; }
          100% { transform: translateX(-30%); opacity: 0.10; }
        }

        .cabIconWrap {
          position: relative;
          border-radius: 22px;
          border: 1px solid rgba(250,204,21,0.45);
          background: rgba(0,0,0,0.75);
          box-shadow:
            0 0 26px rgba(250,204,21,0.20),
            0 0 60px rgba(250,204,21,0.08);
          overflow: hidden;
        }

        .cabIconGlow {
          position: absolute; inset: 0;
          background:
            radial-gradient(circle at 30% 15%, rgba(250,204,21,0.55), transparent 60%),
            radial-gradient(circle at 80% 90%, rgba(56,189,248,0.25), transparent 60%);
          opacity: 0.95;
          pointer-events: none;
        }

        .leverBtn {
          background: linear-gradient(180deg, rgba(250,204,21,1), rgba(234,179,8,1));
          box-shadow:
            0 18px 55px rgba(250,204,21,0.35),
            0 0 18px rgba(250,204,21,0.30);
        }
        .leverBtn:hover { filter: brightness(1.03); transform: translateY(-1px); }

        /* Reduce motion */
        @media (prefers-reduced-motion: reduce) {
          .goldDust, .heatShimmer, .marqueeTrack, .edgeLights, .neonFlicker { animation: none !important; }
        }
      `}</style>

      {/* HERO */}
      <section className="heroWrap">
        {/* Cinematic background image (guaranteed visible) */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/slots-room-hero.png"
            alt="Slots Room — Gold Rush cinematic"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="heroOverlay" />
          <div className="goldDust" />
          <div className="heatShimmer" />
          <div className="scanlines" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-7 sm:py-10">
          {/* Top row */}
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/45 bg-black/65 px-3 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-[#FFD700]/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Base Gold Rush • Slots Room
            </div>

            <Link
              href="/arcade"
              className="inline-flex items-center rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/5"
            >
              ← Casino Floor
            </Link>
          </div>

          {/* Big neon title + copy + HUD */}
          <div className="mt-7 grid gap-5 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
            <div className="space-y-3">
              <div className="neonFlicker">
                <h1 className="neonSign text-4xl sm:text-5xl md:text-6xl font-extrabold">
                  SLOTS ROOM
                </h1>
                <div className="mt-1 text-[#FACC15] text-lg sm:text-xl font-extrabold tracking-wide">
                  Spin Hard • Hit Gold • Repeat
                </div>
              </div>

              <p className="max-w-xl text-sm sm:text-base text-white/85 leading-relaxed">
                The loudest room in the property — western grit, neon heat, and reel chaos.
                Step into the saloon, pull the lever, and chase the rush.
              </p>

              <div className="flex flex-wrap gap-2 pt-1 text-[11px] sm:text-xs">
                <span className="rounded-full border border-[#FFD700]/50 bg-black/55 px-3 py-1 font-semibold text-[#FFD700]/90">
                  Vegas pacing
                </span>
                <span className="rounded-full border border-emerald-300/40 bg-emerald-900/35 px-3 py-1 font-semibold text-emerald-100">
                  Demo chips live
                </span>
                <span className="rounded-full border border-sky-300/30 bg-sky-950/30 px-3 py-1 font-semibold text-sky-100">
                  Mobile-first
                </span>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Link
                  href="/arcade/gold-rush-slots"
                  className="leverBtn inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-extrabold text-black transition"
                >
                  Enter Gold Rush Slots →
                </Link>
                <a
                  href="#cabinets"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-black/55 px-6 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/5"
                >
                  View all cabinets ↓
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-white/12 bg-black/55 p-3 sm:p-4 shadow-[0_18px_70px_rgba(0,0,0,0.85)]">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/55 mb-2">
                Your Stack
              </div>
              <ArcadeWalletHUD />
              <div className="mt-3 flex items-center justify-between text-[11px] text-white/60">
                <span>Ready when you are.</span>
                <span className="text-[#FACC15] font-extrabold">Pull the lever →</span>
              </div>
            </div>
          </div>
        </div>

        {/* SALOON MARQUEE STRIP */}
        <div className="marqueeWrap bg-black/70 backdrop-blur">
          <div className="px-4 py-2 text-[11px] sm:text-xs text-white/70">
            <div className="marqueeTrack">
              {/* duplicate content twice so it loops clean */}
              {[0, 1].map(loop => (
                <div key={loop} className="flex items-center gap-6 pr-6">
                  <span className="text-[#FACC15] font-extrabold tracking-[0.22em] uppercase">
                    🔥 JACKPOTS
                  </span>
                  <span className="text-white/80">•</span>
                  <span className="text-white/80 font-semibold">Reel Streaks</span>
                  <span className="text-white/80">•</span>
                  <span className="text-emerald-200 font-semibold">Bonus Wheels</span>
                  <span className="text-white/80">•</span>
                  <span className="text-white/80 font-semibold">Wild Cards</span>
                  <span className="text-white/80">•</span>
                  <span className="text-[#FACC15] font-semibold">Gold Hits</span>
                  <span className="text-white/80">•</span>
                  <span className="text-sky-200 font-semibold">Fast Spins</span>
                  <span className="text-white/80">•</span>
                  <span className="text-white/80 font-semibold">Saloon Chaos</span>
                  <span className="text-white/80">•</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CABINETS */}
      <section id="cabinets" className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
              Cabinets
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              Pick a machine and light it up
            </h2>
          </div>

          <div className="hidden sm:block text-[11px] text-white/55">
            Every tile is clickable.
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {slotGames.map((game) => (
            <Link
              key={game.href}
              href={game.href}
              className="cabinet group"
            >
              <div className="edgeLights" />

              <div className="relative p-4 sm:p-5 flex items-center gap-4">
                <div className="cabIconWrap h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0">
                  <div className="cabIconGlow" />
                  <Image
                    src={game.icon}
                    alt={game.label}
                    fill
                    sizes="140px"
                    className="relative object-contain p-3 group-hover:scale-110 transition-transform duration-300"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
                      {game.label}
                    </h3>
                    <span className="rounded-full border border-[#FACC15]/60 bg-[#FACC15]/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#FACC15] whitespace-nowrap">
                      {game.tag}
                    </span>
                  </div>

                  <p className="mt-1 text-[12px] sm:text-[13px] text-white/75 line-clamp-2">
                    {game.desc}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-white/60">
                    <span className="uppercase tracking-[0.18em] text-white/45">
                      Tap to play
                    </span>
                    <span className="font-extrabold text-[#FACC15] group-hover:translate-x-0.5 transition-transform">
                      Pull lever →
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#FACC15]/70 to-transparent opacity-70" />
            </Link>
          ))}
        </div>

        <div className="mt-7 rounded-2xl border border-white/10 bg-black/60 p-4 text-[12px] text-white/70 shadow-[0_18px_60px_rgba(0,0,0,0.65)]">
          <div className="font-semibold text-white/85">Casino note</div>
          <div className="mt-1">
            This Slots Room is built to feel like a real online casino — fast entry, huge visuals,
            loud energy, clean pacing. If it doesn’t feel dangerous, it’s not done yet.
          </div>
        </div>
      </section>
    </main>
  )
}
