'use client'

import Link from 'next/link'
import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'
import Image from 'next/image'

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
    desc: 'Original Base Gold Rush cabinet with three paylines and pure BGRC demo action.',
    icon: '/icons/game-slots.png',
  },
  {
    href: '/arcade/tri-wheel-fortune',
    label: 'Tri-Wheel Fortune',
    tag: 'Triple Roulette',
    desc: 'Three mini roulette wheels firing at once with combo payouts and side bets.',
    icon: '/icons/game-roulette1.png',
  },
  {
    href: '/arcade/hand-youre-dealt',
    label: "Hand You're Dealt",
    tag: 'Reel Poker',
    desc: 'Five-card reel poker with WILD bonus on the last reel and free boosted spins.',
    icon: '/icons/game-video-poker1.png',
  },
  {
    href: '/arcade/golden-alignment',
    label: 'Golden Alignment',
    tag: 'Puzzle Slots',
    desc: 'Line up BGLD coins, nuggets, and vaults as full images across all reels for big multipliers.',
    icon: '/icons/game-golden-alignment.png', // swap to whatever icon you like
  },
]

export default function SlotsArcadePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <section className="mx-auto max-w-5xl px-3 py-4 space-y-4">
        {/* TOP STRIP */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              🎰 <span className="text-[#facc15]">Slots Room</span>
            </h1>
            <p className="mt-1 text-[11px] sm:text-xs text-white/70 max-w-md">
              A dedicated lane for Base Gold Rush slot variants — classic 3-reel,
              roulette mashups, reel poker, and puzzle-style image alignment.
            </p>
          </div>

          <Link
            href="/arcade"
            className="rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:bg-white/5"
          >
            ← Arcade Floor
          </Link>
        </div>

        {/* HUD */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-2">
          <ArcadeWalletHUD />
        </div>

        {/* SLOTS GRID */}
        <div className="mt-2 grid gap-4 grid-cols-1 sm:grid-cols-2">
          {slotGames.map(game => (
            <Link
              key={game.href}
              href={game.href}
              className="group relative overflow-hidden rounded-2xl border border-yellow-300/50 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.22),transparent_60%),radial-gradient(circle_at_0%_100%,rgba(15,23,42,0.95),#020617)] p-4 sm:p-5 hover:border-yellow-300 hover:shadow-[0_0_32px_rgba(250,204,21,0.7)] transition"
            >
              <div className="flex items-center gap-3">
                {/* ICON TILE */}
                <div className="relative w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 flex-shrink-0 rounded-2xl border border-yellow-300/80 bg-black/90 shadow-[0_0_22px_rgba(250,204,21,0.85)] overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,0.7),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(59,130,246,0.45),transparent_55%)] opacity-90" />
                  {game.icon && (
                    <Image
                      src={game.icon}
                      alt={game.label}
                      fill
                      sizes="96px"
                      className="relative object-contain p-1.5 group-hover:scale-110 transition-transform duration-300"
                    />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm md:text-base font-semibold text-white">
                      {game.label}
                    </h3>
                    <span className="rounded-full border border-yellow-300/70 bg-yellow-400/15 px-2 py-0.5 text-[10px] font-semibold text-yellow-100">
                      {game.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/70 line-clamp-2">
                    {game.desc}
                  </p>
                  <div className="text-[11px] text-yellow-200 flex items-center gap-1">
                    <span className="group-hover:translate-x-0.5 transition-transform">
                      Enter cabinet →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
