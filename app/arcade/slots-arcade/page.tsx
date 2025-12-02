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
    desc: 'Original Base Gold Rush cabinet with three paylines and clean BGRC spins.',
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
    desc: 'Five-card reel poker with a wild kicker on the last reel and boosted spins.',
    icon: '/icons/game-video-poker1.png',
  },
  {
    href: '/arcade/golden-alignment',
    label: 'Golden Alignment',
    tag: 'Puzzle Slots',
    desc: 'Line up BGLD coins, nuggets, and vaults across all reels for big multipliers.',
    icon: '/icons/game-golden-alignment.png',
  },
]

export default function SlotsArcadePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <section className="mx-auto max-w-5xl px-4 py-6 space-y-5">
        {/* HEADER STRIP */}
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/40 bg-black/70 px-3 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-[#FFD700]/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Base Gold Rush • Slots Room
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              🎰 <span className="text-[#FACC15]">Slots Room</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-white/70 max-w-md">
              A dedicated lane for Base Gold Rush slot variants — classic 3-reel,
              roulette mashups, reel poker, and puzzle-style alignment.
            </p>
          </div>

          <Link
            href="/arcade"
            className="hidden sm:inline-flex items-center rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white/75 hover:bg-white/5"
          >
            ← Casino Floor
          </Link>
        </div>

        {/* MOBILE BACK LINK */}
        <div className="sm:hidden">
          <Link
            href="/arcade"
            className="inline-flex items-center rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white/75 hover:bg-white/5"
          >
            ← Casino Floor
          </Link>
        </div>

        {/* HUD */}
        <div className="rounded-2xl border border-white/10 bg-black/50 p-3">
          <ArcadeWalletHUD />
        </div>

        {/* SLOTS GRID – matches card vibe from other pages */}
        <div className="mt-2 grid gap-4 grid-cols-1 sm:grid-cols-2">
          {slotGames.map(game => (
            <Link
              key={game.href}
              href={game.href}
              className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-[#FFD700]/60 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.28),transparent_60%),radial-gradient(circle_at_0%_100%,rgba(15,23,42,0.96),#020617)] px-4 py-4 sm:px-5 sm:py-5 shadow-[0_18px_50px_rgba(0,0,0,0.9)] hover:border-[#FFD700] hover:shadow-[0_0_32px_rgba(250,204,21,0.75)] transition"
            >
              <div className="flex items-center gap-3">
                {/* ICON / CABINET BLOCK */}
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 rounded-2xl border border-[#FFD700]/80 bg-black/95 shadow-[0_0_24px_rgba(250,204,21,0.9)] overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,0.7),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(59,130,246,0.5),transparent_55%)] opacity-90" />
                  <Image
                    src={game.icon}
                    alt={game.label}
                    fill
                    sizes="96px"
                    className="relative object-contain p-1.5 group-hover:scale-110 transition-transform duration-300"
                  />
                </div>

                {/* TEXT SIDE */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-semibold text-white truncate">
                      {game.label}
                    </h3>
                    <span className="rounded-full border border-[#FACC15]/70 bg-[#FACC15]/15 px-2 py-0.5 text-[10px] font-semibold text-[#FACC15] whitespace-nowrap">
                      {game.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/70 line-clamp-2">
                    {game.desc}
                  </p>
                </div>
              </div>

              {/* FOOTER ROW */}
              <div className="mt-3 flex items-center justify-between text-[11px] text-white/60">
                <span className="uppercase tracking-[0.18em] text-white/45">
                  Slot Machine
                </span>
                <span className="font-semibold text-[#FACC15] group-hover:translate-x-0.5 transition-transform">
                  Enter cabinet →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
