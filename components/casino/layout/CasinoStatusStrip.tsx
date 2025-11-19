// components/casino/layout/CasinoStatusStrip.tsx
import Link from 'next/link'

type Mode = 'arcade' | 'onchain' | 'live'

export default function CasinoStatusStrip({ mode }: { mode: Mode }) {
  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-black/80 px-3 py-2 text-[11px] text-white/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold uppercase tracking-[0.18em] text-white/60">
          {mode === 'arcade' && 'Demo Arcade • Free Play'}
          {mode === 'onchain' && 'On-Chain Casino • Base Sepolia'}
          {mode === 'live' && 'Live Tables • Multiplayer Alpha'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px]">
        {mode === 'arcade' && (
          <>
            <span className="rounded-full border border-emerald-300/50 bg-emerald-900/40 px-2 py-0.5 text-emerald-100">
              Free BGRC demo credits
            </span>
            <span className="text-white/50">
              These exact flows will graduate to full on-chain tables on Base.
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
        {mode === 'live' && (
          <>
            <span className="rounded-full border border-amber-300/60 bg-amber-900/40 px-2 py-0.5 text-amber-100">
              Multiplayer tables in active development
            </span>
            <span className="text-white/55">
              WebSocket-powered, on-chain settled live tables are coming online soon.
            </span>
          </>
        )}
      </div>
    </div>
  )
}
