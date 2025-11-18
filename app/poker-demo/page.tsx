import PokerRoomArcade from '@/components/casino/arcade/PokerRoomArcade'
import { ArcadeWalletProvider } from '@/lib/useArcadeWallet'

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
              Multiplayer Texas Hold’em arcade table running on BGRC demo credits. 
              This room is wired for Multi-Player Online vibbes and designed to 
              graduate into full on-chain poker on Base.
            </p>
          </div>
          <div className="text-xs text-white/55">
            Demo only • No real chips • Gameplay and flow subject to change before mainnet.
          </div>
        </header>

        <ArcadeWalletProvider>
          <PokerRoomArcade />
        </ArcadeWalletProvider>
      </section>
    </main>
  )
}
