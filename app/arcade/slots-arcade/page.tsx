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
    desc: 'Original Base Gold Rush cabinet with clean spins and big hits.',
    icon: '/icons/game-slots.png',
  },
  {
    href: '/arcade/tri-wheel-fortune',
    label: 'Tri-Wheel Fortune',
    tag: 'Triple Wheel',
    desc: 'Three wheels firing at once — combos, streaks, and chaos.',
    icon: '/icons/game-roulette1.png',
  },
  {
    href: '/arcade/hand-youre-dealt',
    label: "Hand You’re Dealt",
    tag: 'Reel Poker',
    desc: 'Reel poker with a wild kicker on the last reel and boosted spins.',
    icon: '/icons/game-video-poker1.png',
  },
  {
    href: '/arcade/golden-alignment',
    label: 'Golden Alignment',
    tag: 'Puzzle Slots',
    desc: 'Line up coins, nuggets, and vaults for multipliers and ladders.',
    icon: '/icons/game-golden-alignment.png',
  },
]

export default function SlotsArcadePage() {
  // Duplicate items for marquee track (so the animation can loop seamlessly)
  const marqueeItems = [...slotGames, ...slotGames]

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#02050a] to-black text-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* Background image layer (guaranteed visible) */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/slots-room-hero-v2.png"
            alt="Slots Room hero"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Lighter wash so the image actually reads */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55),rgba(0,0,0,0.92))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_58%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.12),transparent_60%)]" />
        </div>

        {/* Animated layers */}
        <div className="pointer-events-none absolute inset-0">
          <div className="reelGlow" aria-hidden="true" />
          <div className="shimmer" aria-hidden="true" />
          <div className="coinRain" aria-hidden="true">
            {Array.from({ length: 26 }).map((_, i) => (
              <span
                key={i}
                className="coin"
                style={{
                  left: `${(i * 7) % 100}%`,
                  animationDelay: `${(i % 10) * 0.35}s`,
                  animationDuration: `${7 + (i % 6)}s`,
                  transform: `scale(${0.55 + (i % 6) * 0.12})`,
                  opacity: 0.15 + (i % 5) * 0.08,
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 py-6 sm:py-8 space-y-5">
          {/* Top line / back */}
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/40 bg-black/65 px-3 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.24em] text-[#FFD700]/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Base Gold Rush • Slots Room
            </div>

            <Link
              href="/arcade"
              className="hidden sm:inline-flex items-center rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white/75 hover:bg-white/5"
            >
              ← Casino Floor
            </Link>
          </div>

          {/* Mobile back */}
          <div className="sm:hidden">
            <Link
              href="/arcade"
              className="inline-flex items-center rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white/75 hover:bg-white/5"
            >
              ← Casino Floor
            </Link>
          </div>

          {/* Title + punchy copy */}
          <div className="rounded-3xl border border-white/10 bg-black/35 backdrop-blur-sm p-5 sm:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.75)]">
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
                <span className="text-[#FFD700] drop-shadow-[0_0_18px_rgba(250,204,21,0.45)]">
                  SLOTS
                </span>{' '}
                <span className="text-white/90">•</span>{' '}
                <span className="text-white">Gold Rush Edition</span>
              </h1>

              <p className="text-sm sm:text-[15px] text-white/75 max-w-2xl leading-relaxed">
                Neon saloon energy. Spinning reels. Big streaks. This is the loud room —
                fast hits, flashy cabinets, and that “one more spin” feeling.
              </p>

              <div className="flex flex-wrap gap-2 pt-1 text-[11px] sm:text-xs">
                <span className="rounded-full border border-[#FFD700]/40 bg-black/60 px-3 py-1 font-semibold text-[#FFD700]/90">
                  Vegas cabinet vibe
                </span>
                <span className="rounded-full border border-emerald-300/35 bg-emerald-900/30 px-3 py-1 font-semibold text-emerald-100/90">
                  Mobile-first • Tap & spin
                </span>
                <span className="rounded-full border border-sky-300/25 bg-sky-900/20 px-3 py-1 font-semibold text-sky-100/85">
                  Demo chips live now
                </span>
              </div>
            </div>

            {/* HUD */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/45 p-3">
              <ArcadeWalletHUD />
            </div>
          </div>

          {/* Marquee rail (NO desktop scrollbar pulse) */}
          <div className="pt-1">
            <div className="flex items-end justify-between gap-3 mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">
                  Cabinets on the floor
                </div>
                <h3 className="text-lg sm:text-xl font-bold">
                  Pick a machine and rip it
                </h3>
              </div>

              <span className="text-[11px] text-white/55">
                Hover to pause (desktop)
              </span>
            </div>

            <div className="bgr-marquee-wrap rounded-2xl border border-white/10 bg-black/35 backdrop-blur-sm">
              {/* edge fades */}
              <div className="pointer-events-none absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-black/80 to-transparent z-10 rounded-l-2xl" />
              <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-black/80 to-transparent z-10 rounded-r-2xl" />

              <div className="bgr-marquee-track gap-3 px-3 py-3">
                {marqueeItems.map((g, idx) => (
                  <Link
                    key={`${g.href}-${idx}`}
                    href={g.href}
                    className="min-w-[260px] sm:min-w-[320px] rounded-2xl border border-[#FFD700]/30 bg-black/70 hover:border-[#FFD700]/70 transition shadow-[0_18px_50px_rgba(0,0,0,0.65)] overflow-hidden"
                  >
                    <div className="p-4 flex items-center gap-4">
                      {/* BIG icon focus */}
                      <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border border-[#FFD700]/35 bg-black/80 overflow-hidden shadow-[0_0_28px_rgba(250,204,21,0.25)]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,0.45),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(56,189,248,0.25),transparent_55%)]" />
                        <Image
                          src={g.icon}
                          alt={g.label}
                          fill
                          className="object-contain p-2.5"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-extrabold text-white/90 truncate">
                            {g.label}
                          </div>
                          <span className="rounded-full border border-[#FFD700]/45 bg-[#FFD700]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FFD700]/90 whitespace-nowrap">
                            {g.tag}
                          </span>
                        </div>
                        <div className="mt-1 text-[12px] text-white/60 line-clamp-2">
                          {g.desc}
                        </div>
                        <div className="mt-2 text-[11px] font-semibold text-[#FFD700]">
                          Enter cabinet →
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Grid (everything clickable, clean layout) */}
          <div className="pt-2 grid gap-4 grid-cols-1 sm:grid-cols-2">
            {slotGames.map(game => (
              <Link
                key={game.href}
                href={game.href}
                className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-white/12 bg-black/55 backdrop-blur-sm px-5 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.8)] hover:border-[#FFD700]/70 hover:shadow-[0_0_34px_rgba(250,204,21,0.35)] transition"
              >
                {/* subtle “cabinet frame” glow */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_58%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.10),transparent_60%)] opacity-90" />

                <div className="relative flex items-center gap-4">
                  {/* Larger icon fills more of the tile */}
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 rounded-3xl border border-[#FFD700]/35 bg-black/80 overflow-hidden shadow-[0_0_34px_rgba(250,204,21,0.28)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,0.55),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(56,189,248,0.25),transparent_55%)]" />
                    <Image
                      src={game.icon}
                      alt={game.label}
                      fill
                      sizes="120px"
                      className="relative object-contain p-2 group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  <div className="relative flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
                        {game.label}
                      </h3>
                      <span className="rounded-full border border-[#FFD700]/45 bg-[#FFD700]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FFD700]/90 whitespace-nowrap">
                        {game.tag}
                      </span>
                    </div>

                    <p className="text-[12px] text-white/70 line-clamp-2">
                      {game.desc}
                    </p>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-white/55">
                      <span className="uppercase tracking-[0.18em]">
                        Slots Cabinet
                      </span>
                      <span className="font-semibold text-[#FFD700] group-hover:translate-x-0.5 transition-transform">
                        Spin →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="pt-2 text-center text-[11px] text-white/55">
            Responsible play: set limits, take breaks, and never chase losses.
          </div>
        </div>

        {/* Page-local wild CSS (only affects Slots page) */}
        <style jsx>{`
          /* Animated cabinet sweep */
          .reelGlow {
            position: absolute;
            inset: -18%;
            background: repeating-linear-gradient(
              90deg,
              rgba(250, 204, 21, 0) 0px,
              rgba(250, 204, 21, 0.12) 20px,
              rgba(56, 189, 248, 0.06) 44px,
              rgba(250, 204, 21, 0) 68px
            );
            opacity: 0.16;
            filter: blur(2px);
            transform: translateX(-30%);
            animation: reelSweep 9s ease-in-out infinite;
            pointer-events: none;
          }

          @keyframes reelSweep {
            0% {
              transform: translateX(-30%);
            }
            50% {
              transform: translateX(10%);
            }
            100% {
              transform: translateX(-30%);
            }
          }

          /* Subtle shimmer */
          .shimmer {
            position: absolute;
            inset: 0;
            background: radial-gradient(
              circle at 30% 15%,
              rgba(255, 255, 255, 0.06),
              transparent 40%
            );
            opacity: 0.6;
            animation: shimmerPulse 6.5s ease-in-out infinite;
            pointer-events: none;
          }

          @keyframes shimmerPulse {
            0% {
              opacity: 0.35;
            }
            50% {
              opacity: 0.75;
            }
            100% {
              opacity: 0.35;
            }
          }

          /* Coin rain */
          .coinRain {
            position: absolute;
            inset: 0;
            overflow: hidden;
            pointer-events: none;
            mix-blend-mode: screen;
          }

          .coin {
            position: absolute;
            top: -12%;
            width: 16px;
            height: 16px;
            border-radius: 999px;
            background: radial-gradient(
                circle at 30% 25%,
                rgba(255, 255, 255, 0.85),
                transparent 40%
              ),
              radial-gradient(
                circle at 70% 75%,
                rgba(255, 255, 255, 0.2),
                transparent 55%
              ),
              linear-gradient(
                180deg,
                rgba(255, 215, 0, 0.98),
                rgba(234, 179, 8, 0.92)
              );
            box-shadow: 0 0 18px rgba(250, 204, 21, 0.35),
              0 10px 26px rgba(0, 0, 0, 0.45);
            filter: saturate(1.2);
            animation-name: coinFall;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform;
          }

          @keyframes coinFall {
            0% {
              transform: translate3d(0, -10%, 0) rotate(0deg);
            }
            100% {
              transform: translate3d(0, 130vh, 0) rotate(720deg);
            }
          }

          /* Respect reduced motion */
          @media (prefers-reduced-motion: reduce) {
            .reelGlow,
            .shimmer,
            .coin {
              animation: none !important;
            }
          }
        `}</style>
      </section>
    </main>
  )
}
