// app/arcade/roulette/page.tsx

import RouletteArcadeMachine from '@/components/casino/arcade/RouletteArcadeMachine'
import Link from 'next/link'
import { ArcadeWalletProvider } from '@/lib/useArcadeWallet'
import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'

const TOKEN_SYMBOL = process.env.NEXT_PUBLIC_TOKEN_SYMBOL ?? 'BGRC'

export default function RouletteArcadePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.16),_transparent_50%)]">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-black/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Demo Arcade • Roulette
              </div>
              <h1 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Golden Wheel Roulette{' '}
                <span className="text-emerald-300">Demo Machine</span>
              </h1>
              <p className="mt-2 max-w-xl text-xs md:text-sm text-white/70">
                This is the full-featured arcade version of Base Gold Rush roulette. All
                multipliers, all bets, all vibes — using free demo credits instead of real{' '}
                {TOKEN_SYMBOL}. On-chain testnet and future Base mainnet contracts will
                follow this exact flow.
              </p>
            </div>
            <div className="text-right text-[11px] md:text-xs text-white/60 space-y-1">
              <div>
                <Link
                  href="/"
                  className="rounded-full border border-white/30 bg-black/60 px-3 py-1.5 text-[11px] font-semibold hover:bg-white/5"
                >
                  ← Back to Casino Lobby
                </Link>
              </div>
              <div>
                On-chain roulette is live on{' '}
                <Link
                  href="/play/roulette"
                  className="text-[#FFD700] underline-offset-2 hover:underline"
                >
                  Base Sepolia
                </Link>
                . This page is pure demo: no wallet required.
              </div>
            </div>
          </div>
        </div>
      </section>

      <ArcadeWalletProvider>
        <section className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <ArcadeWalletHUD />
          <RouletteArcadeMachine />
        </section>
      </ArcadeWalletProvider>
    </main>
  )
}
