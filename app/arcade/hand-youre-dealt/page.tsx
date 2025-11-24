'use client'

import Link from 'next/link'
import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'
import HandYoureDealtArcadeMachine from '@/components/casino/arcade/HandYoureDealtArcadeMachine'

export default function HandYoureDealtPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <section className="mx-auto max-w-5xl px-3 py-4 space-y-4">
        {/* TOP STRIP */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            🃏 <span className="text-[#facc15]">Hand You&apos;re Dealt</span>
          </h1>

          <Link
            href="/arcade"
            className="rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:bg-white/5"
          >
            ← Arcade
          </Link>
        </div>

        {/* HUD */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-2">
          <ArcadeWalletHUD />
        </div>

        {/* MACHINE */}
        <HandYoureDealtArcadeMachine />
      </section>
    </main>
  )
}
