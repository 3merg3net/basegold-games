'use client'

import ThreeCardPokerArcade from '@/components/casino/arcade/ThreeCardPokerArcade'
import { ArcadeWalletProvider } from '@/lib/useArcadeWallet'
import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'

export default function ThreeCardPokerArcadePage() {
  return (
    <ArcadeWalletProvider>
      <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
        <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                Three Card Poker (Arcade)
              </h1>
              <p className="mt-1 text-sm text-white/70 max-w-xl">
                Multi-seat Three Card Poker with Ante, Play, and Pair Plus side bets,
                running on BGRC demo credits. This is the exact flow we&apos;ll promote
                to a dedicated Base Gold Rush contract in V4.
              </p>
            </div>
            <div className="w-full md:w-auto">
              <ArcadeWalletHUD />
            </div>
          </div>

          <ThreeCardPokerArcade />
        </div>
      </main>
    </ArcadeWalletProvider>
  )
}
