'use client'

import PokerGame from '@/components/PokerGame'

export default function VideoPokerPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FFD700] shadow-[0_0_10px_#FFD700]" />
          Video Poker — Live on Base (Sepolia demo)
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-extrabold">
          <span className="text-[#FFD700]">Base Gold</span> Video Poker
        </h1>
        <p className="mt-2 text-white/70">
          Approve once, choose a stake bet, confirm the bet to deal your hand.
        </p>
      </div>

      <PokerGame />
    </main>
  )
}
