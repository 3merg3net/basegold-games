// components/casino/layout/CasinoStatusStrip.tsx
'use client'

import Link from 'next/link'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

type Mode = 'arcade' | 'onchain' | 'live'

const MINT_AMOUNT = 10_000

export default function CasinoStatusStrip({ mode }: { mode: Mode }) {
  const { credits, addCredits } = useArcadeWallet()

  const handleMint = () => {
    addCredits(MINT_AMOUNT)
  }

  const isDemoMode = mode === 'arcade' || mode === 'live'

  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-black/80 px-3 py-2 text-[11px] text-white/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold uppercase tracking-[0.18em] text-white/60">
          {mode === 'arcade' && 'Casino Arcade • Free Play BGRC Chips'}
          {mode === 'onchain' && 'On-Chain Casino • Base Sepolia'}
          {mode === 'live' && 'Live Tables • Poker Room Demo Chips'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px]">
        {isDemoMode && (
          <>
            <span className="rounded-full border border-emerald-300/50 bg-emerald-900/40 px-2 py-0.5 text-emerald-100">
              Free BGRC chips • Shared across all Arcade Casino Games
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMint}
                className="rounded-full border border-[#FFD700]/70 bg-[#FFD700]/15 px-3 py-1 text-[10px] font-semibold text-[#FFE58A] hover:bg-[#FFD700]/25 transition"
              >
                Mint {MINT_AMOUNT.toLocaleString()} Add Chips
              </button>
              <span className="text-white/60">
                Stack:{' '}
                <span className="font-semibold text-white/85">
                  {credits.toLocaleString()} BGRC
                </span>
              </span>
            </div>

            <span className="basis-full text-white/50">
              These BGRC chips are the same flows that will plug into the BGRC / BGLD
              cashier when the Base Gold Rush casino goes live.
            </span>
          </>
        )}

        {mode === 'onchain' && (
          <>
            <span className="rounded-full border border-sky-300/50 bg-sky-900/40 px-2 py-0.5 text-sky-100">
              Smart contracts live on testnet
            </span>
            <span className="text-white/55">
              All games here will roll into the Base Gold Rush mainnet casino.
            </span>
          </>
        )}
      </div>
    </div>
  )
}
