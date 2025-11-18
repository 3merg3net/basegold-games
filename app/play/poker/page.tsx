'use client'

import PokerGame from '@/components/casino/PokerGame'

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      {/* How to play (thin strip) */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
        <div className="text-lg font-extrabold">Video Poker — Jacks or Better</div>
        <p className="text-sm text-white/70 mt-1">
          Choose your stake (1–5 BGLD). Press <b>Deal</b>, tap cards to <b>HOLD</b>, then press <b>Draw</b>.
          Payouts follow standard Jacks or Better rules (see paytable). This page runs in <b>demo mode</b> now; on-chain results coming after we add a Casino entrypoint.
        </p>
      </section>

      <PokerGame />
    </main>
  )
}
