'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'
import CrapsDemo from '@/components/casino/arcade/CrapsDemo'

export default function CrapsArcadePage() {
  const [fullscreen, setFullscreen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => {
      setIsMobile(window.innerWidth < 768)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
        <section className="relative border-b border-white/10">
          {/* background image */}
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/arcade-hero-main.png"
              alt="Base Gold Rush craps table"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.8),rgba(0,0,0,0.97))]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-6 md:py-8 space-y-4">
            {/* HEADER + COPY */}
            <div className="flex flex-col gap-2">
              <Link
                href="/arcade"
                className="w-fit rounded-full border border-white/20 bg-black/50 px-3 py-1 text-[11px] text-white/60 hover:bg-white/5"
              >
                ← Back to Arcade
              </Link>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    Craps • <span className="text-[#FFD700]">Casino Arcade</span>
                  </h1>
                  <p className="text-sm md:text-base text-white/80 max-w-2xl">
                    Roll the bones and run the classic Vegas{' '}
                    <span className="font-semibold text-[#FFD700]">Craps table</span>{' '}
                    in full BGRC free-play mode. This is the same layout the live
                    multiplayer craps pit will use when Base Gold Rush goes on-chain.
                  </p>
                </div>

                {/* Fullscreen button – MOBILE ONLY */}
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => setFullscreen(true)}
                    className="self-start md:self-auto rounded-full border border-[#facc15]/70 bg-[#facc15]/10 px-4 py-2 text-[11px] md:text-xs font-semibold uppercase tracking-[0.22em] text-[#fef9c3] hover:bg-[#facc15]/20 shadow-[0_0_18px_rgba(250,204,21,0.7)]"
                  >
                    ENTER FULLSCREEN TABLE
                  </button>
                )}
              </div>

              {/* HUD (BGRC shared credits / PnL) */}
              <ArcadeWalletHUD />
            </div>

            {/* GAME CARD */}
            <div className="rounded-3xl border border-emerald-300/40 bg-black/85 shadow-[0_20px_70px_rgba(0,0,0,0.95)] p-3 sm:p-4 md:p-6">
              <CrapsDemo />
            </div>

            {/* HOW TO PLAY */}
            <div className="mt-4 space-y-3 text-[11px] sm:text-xs md:text-sm text-white/70">
              <div>
                <span className="uppercase tracking-[0.22em] text-emerald-200/90">
                  How Craps Works
                </span>
                <p className="mt-1">
                  Players bet on the outcome of two dice. The{' '}
                  <strong>Pass Line</strong> is the main bet: hit a 7 or 11 on
                  the come-out roll to win, or avoid 2/3/12 (craps). If a point
                  is set, hit it again before a 7. This arcade table mirrors
                  Vegas pacing so you get the real flow before the on-chain pit
                  opens.
                </p>
              </div>

              <div>
                <span className="uppercase tracking-[0.22em] text-sky-300/90">
                  Live Tables Coming Soon
                </span>
                <p className="mt-1">
                  The multiplayer craps pit is already in development. Dice roll
                  proofs, table chat, and on-chain settlement will route through
                  the BGRC/BGLD cashier the moment live tables go online.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FULLSCREEN OVERLAY – MOBILE ONLY */}
      {isMobile && fullscreen && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="flex flex-col h-full">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/90">
              <div className="text-[10px] md:text-xs uppercase tracking-[0.26em] text-white/60">
                Base Gold Rush • Craps Arcade Table
              </div>
              <button
                type="button"
                onClick={() => setFullscreen(false)}
                className="rounded-full border border-white/40 px-3 py-1 text-[11px] text-white/80 hover:bg-white/10"
              >
                ✕ EXIT FULLSCREEN
              </button>
            </div>

            {/* Table area */}
            <div className="flex-1 flex items-center justify-center px-2 pb-3 pt-2">
              <div className="w-full max-w-6xl h-full max-h-[900px]">
                <CrapsDemo fullscreen />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
