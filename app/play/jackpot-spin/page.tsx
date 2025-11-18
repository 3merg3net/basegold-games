// app/play/jackpot-spin/page.tsx
'use client'

import JackpotSpin from '@/components/casino/JackpotSpin'
import Link from 'next/link'

export default function JackpotSpinPage() {
  return (
    <main className="min-h-[calc(100vh-80px)] bg-[radial-gradient(circle_at_top,#111827,#020617_55%,#000000)] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.32em] text-[#FFD700]/80 uppercase">
              Base Gold Rush
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-wide">
              Jackpot Spin
            </h1>
            <p className="mt-2 text-sm text-white/70 max-w-xl">
              Drop a stake, spin the wheel, and hunt for the{' '}
              <span className="text-[#FFD700] font-semibold">progressive jackpot</span>.
              On-chain RNG, transparent payouts, all settled in BGRC/BGLD.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="hidden md:inline">Navigate:</span>
            <Link
              href="/"
              className="rounded-full border border-white/20 px-3 py-1 hover:border-[#FFD700]/50 hover:text-[#FFD700]"
            >
              ⟵ Back to Home
            </Link>
          </div>
        </div>

        <div className="rounded-[26px] border border-[#FFD700]/35 bg-gradient-to-br from-[#101322] via-[#05060f] to-black p-4 md:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
          <JackpotSpin />
        </div>

        <div className="text-[11px] text-white/50">
          Demo UX only if you&apos;re still on testnet. Mainnet mode will show live
          jackpot pool, last winners, and on-chain spin history.
        </div>
      </div>
    </main>
  )
}
