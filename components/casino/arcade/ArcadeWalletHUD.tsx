// components/casino/layout/CasinoChipStack.tsx
'use client'

import { useArcadeWallet } from '@/lib/useArcadeWallet'

export default function CasinoChipStack() {
  const { credits, initialCredits, net } = useArcadeWallet()

  const pnlLabel =
    net > 0 ? `+${net.toFixed(2)} BGRC` :
    net < 0 ? `${net.toFixed(2)} BGRC` :
    '0.00 BGRC'

  const pnlClass =
    net > 0
      ? 'text-emerald-300'
      : net < 0
      ? 'text-rose-300'
      : 'text-white/70'

  return (
    <aside className="rounded-2xl border border-white/12 bg-black/80 px-4 py-3 text-xs text-white/70 shadow-[0_12px_30px_rgba(0,0,0,0.9)] space-y-2">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">
          BGRC Chip Stack
        </div>
        <div className="mt-0.5 text-[11px] text-white/60">
          Shared BGRC chips across the casino — arcade now, on-chain next.
        </div>
      </div>

      <div className="mt-2 rounded-xl border border-[#FFD700]/50 bg-black/70 px-3 py-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#FFD700]/80">
            Current Stack
          </div>
          <div className="mt-0.5 text-lg font-extrabold text-[#FFD700] tabular-nums">
            {credits.toLocaleString()} <span className="text-xs text-[#fef3c7]">BGRC</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">
            Session P&amp;L (Arcade)
          </div>
          <div className={`mt-0.5 text-sm font-semibold tabular-nums ${pnlClass}`}>
            {pnlLabel}
          </div>
        </div>
      </div>

      <div className="text-[11px] text-white/60 space-y-1">
        <div>
          Starting arcade stack:{' '}
          <span className="font-semibold text-white/85">
            {initialCredits.toLocaleString()} BGRC
          </span>
        </div>
        <div className="text-white/40">•</div>
        <div>
          Arcade wins &amp; losses update your P&amp;L here, while your main BGRC
          stack stays in sync with the chip HUD and mint button.
        </div>
      </div>
    </aside>
  )
}
