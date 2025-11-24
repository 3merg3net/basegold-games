// app/poker-demo/page.tsx
'use client'

import PokerRoomArcade from '@/components/casino/arcade/PokerRoomArcade'

export default function PokerDemoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-4">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Base Gold Rush • Hold’em Poker Room
            </h1>
            <p className="mt-1 text-sm text-white/70 max-w-xl">
              Multiplayer Texas Hold’em Free Play table running on BGRC credits. This room
              is wired for full multi-player flow and designed to graduate into live
              on-chain poker on Base using BGLD.
            </p>
          </div>
          <div className="text-xs text-white/55 text-right">
            Free Play only • No real-value tokens yet • Gameplay and flow may evolve
            before mainnet.
          </div>
        </header>

        <PokerRoomArcade />
      </section>
    </main>
  )
}
