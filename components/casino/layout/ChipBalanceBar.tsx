'use client'

import { useArcadeWallet } from '@/lib/useArcadeWallet'

const MINT_AMOUNT = 10_000

export default function ChipBalanceBar() {
  const { credits, addCredits } = useArcadeWallet()

  const handleMint = () => {
    addCredits(MINT_AMOUNT)
  }

  return (
    <div className="mb-3 rounded-2xl border border-emerald-300/40 bg-black/80 px-3 py-2 text-[11px] text-white/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-[0_12px_30px_rgba(0,0,0,0.9)]">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <div>
          <div className="uppercase tracking-[0.2em] text-emerald-200/85 text-[10px]">
            BGRC Arcade Chip Stack
          </div>
          <div className="text-xs text-white/70">
            Free-play GLD Chips shared across all Casino games.
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-end">
        <button
          type="button"
          onClick={handleMint}
          className="rounded-full border border-[#FFD700]/70 bg-[#FFD700]/15 px-3 py-1 text-[10px] font-semibold text-[#FFE58A] hover:bg-[#FFD700]/25 transition"
        >
          +{MINT_AMOUNT.toLocaleString()} Add GLD Chips
        </button>
        <div className="text-[10px] sm:text-[11px] text-white/60">
          Stack:{' '}
          <span className="font-semibold text-white/90">
            {credits.toLocaleString()} GLD
          </span>
        </div>
      </div>
    </div>
  )
}
