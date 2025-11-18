'use client'
import PokerTable from '@/components/casino/PokerTable'

export default function PokerRoomPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
        <h1 className="text-2xl md:text-3xl font-extrabold">Poker Room</h1>
        <p className="text-white/70 mt-1 text-sm">
          Sit down, bet, and test multiplayer play. Demo chips now; real escrow coming soon.
        </p>
      </div>
      <div className="mt-6">
        <PokerTable />
      </div>
    </main>
  )
}
