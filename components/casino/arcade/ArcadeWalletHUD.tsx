// components/casino/arcade/ArcadeWalletHUD.tsx
'use client'

import { useArcadeWallet } from '@/lib/useArcadeWallet'

export default function ArcadeWalletHUD() {
  const { credits, initialCredits, net, resets, recordReset } = useArcadeWallet()


  const starting = initialCredits ?? 0
  const pnl = net ?? 0

  const pnlLabel =
    pnl > 0 ? `+${pnl.toFixed(2)} BGRC` : pnl < 0 ? `${pnl.toFixed(2)} BGRC` : '0.00 BGRC'

  const pnlClass =
    pnl > 0
      ? 'text-emerald-300'
      : pnl < 0
      ? 'text-rose-300'
      : 'text-white/70'

  return (
    <div className="mb-4 rounded-2xl border border-white/15 bg-black/70 px-4 py-3 text-xs text-white/70 shadow-[0_12px_30px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
            Demo Arcade Wallet
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            Free-play BGRC credits shared across all arcade games.
          </div>
        </div>
        <div className="rounded-xl border border-[#FFD700]/50 bg-black/70 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#FFD700]/80">
            Current Stack
          </div>
          <div className="text-lg font-extrabold text-[#FFD700] leading-tight">
            {credits.toLocaleString()} <span className="text-xs text-[#fef3c7]">BGRC</span>
          </div>
          <div className={`text-[10px] ${pnlClass}`}>
            Session P&amp;L: {pnlLabel}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/55">
        <div>
          Starting stack:{' '}
          <span className="font-semibold text-white/80">
            {starting.toLocaleString()} BGRC
          </span>
        </div>
        <div className="hidden md:inline text-white/40">•</div>
        <div className="text-white/60">
          Wins and losses in arcade games update this bar in real time.
        </div>
      </div>
    </div>
  )
}
