'use client'

import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'
import VideoPokerArcade from '@/components/casino/arcade/VideoPokerArcade'

export default function VideoPokerArcadePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Video Poker (Arcade Demo)
            </h1>
            <p className="text-xs md:text-sm text-white/65 max-w-xl">
              Free-play BGRC credits in a classic Jacks or Better bar-top machine. Hold your
              cards, hit draw, and chase that 4,000-credit royal on max bet.
            </p>
          </div>
          <ArcadeWalletHUD />
        </div>

        <VideoPokerArcade />
      </section>
    </main>
  )
}
