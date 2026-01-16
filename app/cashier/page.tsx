'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { CashierPanel, ChipKind } from '@/components/casino/CashierPanel'
import CashierSwapBox from '@/components/casino/CashierSwapBox'


const UNISWAP_URL = 'https://app.uniswap.org/swap'

export default function CashierPage() {
  const [chip, setChip] = useState<ChipKind>('gld')

  const title = useMemo(() => {
    return chip === 'gld'
      ? 'GLD Chips (games)'
      : 'PGLD Chips (Poker Tables)'
  }, [chip])

  const subtitle = useMemo(() => {
    return chip === 'gld'
      ? 'GLD chips are used for arcade games and Blackjack.'
      : 'PGLD chips are used for live poker table stacks and poker gameplay.'
  }, [chip])

      const [playerId, setPlayerId] = useState<string | null>(null)
  const [balances, setBalances] = useState<{ gld: number; pgld: number } | null>(null)
  const [balLoading, setBalLoading] = useState(false)
  const [balErr, setBalErr] = useState<string | null>(null)

  // TEMP: derive Casino ID from localStorage (replace with your ProfileProvider later)
  useEffect(() => {
    const id = window.localStorage.getItem('casino_player_id')
    if (id) setPlayerId(id)
  }, [])

  const loadBalances = useCallback(async () => {
    if (!playerId) return
    setBalLoading(true)
    setBalErr(null)
    try {
      const res = await fetch(
        `/api/chips/balance?playerId=${encodeURIComponent(playerId)}`,
        { cache: 'no-store' }
      )
      const j = await res.json()
      if (j?.error) throw new Error(j.error)
      setBalances({
        gld: Math.floor(Number(j.balance_gld ?? 0)),
        pgld: Math.floor(Number(j.balance_pgld ?? 0)),
      })
    } catch (e: any) {
      setBalErr(e?.message ?? 'Unable to load balances')
    } finally {
      setBalLoading(false)
    }
  }, [playerId])

  useEffect(() => {
    if (!playerId) return
    void loadBalances()
  }, [playerId, loadBalances])



  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
            GLD Rush • Cashier
          </div>
          <h1 className="mt-1 text-2xl md:text-3xl font-extrabold">
            Cashier Window
          </h1>
          <p className="mt-2 text-sm text-white/70 max-w-2xl">
            Load chips for gameplay. In early access, balances may be demo credits while we finalize live settlement.
          </p>

          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-white/60">
            <Link href="/legal/terms" className="hover:text-white underline underline-offset-2">
              Terms & Disclosures
            </Link>
            <span className="opacity-40">•</span>
            <a
              href={UNISWAP_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white underline underline-offset-2"
            >
              Buy BGLD on Uniswap
            </a>
          </div>
        </div>

        {/* Chip Toggle */}
        <div className="mb-5 inline-flex items-center rounded-full border border-white/15 bg-black/60 p-1">
          <button
            onClick={() => setChip('gld')}
            className={[
              'rounded-full px-4 py-2 text-[12px] font-semibold transition',
              chip === 'gld'
                ? 'bg-[#FFD700]/90 text-black shadow-[0_0_14px_rgba(250,204,21,0.85)]'
                : 'text-white/75 hover:bg-white/10 hover:text-white',
            ].join(' ')}
          >
            GLD • Casino
          </button>
          <button
            onClick={() => setChip('pgld')}
            className={[
              'rounded-full px-4 py-2 text-[12px] font-semibold transition',
              chip === 'pgld'
                ? 'bg-[#FFD700]/90 text-black shadow-[0_0_14px_rgba(250,204,21,0.85)]'
                : 'text-white/75 hover:bg-white/10 hover:text-white',
            ].join(' ')}
          >
            PGLD • Poker
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          {/* Left panel */}
          {balErr && (
  <div className="mt-2 rounded-lg border border-red-500/20 bg-red-950/20 p-2 text-[11px] text-red-200">
    {balErr}
  </div>
)}
{balLoading && (
  <div className="mt-2 text-[11px] text-white/50">Loading balances…</div>
)}

          <CashierPanel chip={chip} playerId={playerId ?? undefined} />

          

          {/* Right info card */}
          <div className="rounded-2xl border border-white/10 bg-black/50 p-4 md:p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/50">
              Selected
            </div>
            <CashierSwapBox
  playerId={playerId ?? undefined}
  balances={{
    bgld: null,
    gld: balances?.gld ?? null,
    pgld: balances?.pgld ?? null,
  }}
  onBalances={(next) => setBalances(next)}
  onSwapPreview={() => {}}
/>




            <div className="mt-2 text-base md:text-lg font-semibold text-[#FFD700]">
              {title}
            </div>
            <p className="mt-2 text-sm text-white/70">
              {subtitle}
            </p>
            

            <div className="mt-4 rounded-xl border border-yellow-500/25 bg-black/60 p-3 text-[12px] text-white/70 space-y-2">
              <div className="font-semibold text-white/85">Important</div>
              <p>
                Chips are in-house gameplay credits tracked by your Gld ID during early access.
                You control what you wager and you are responsible for complying with local laws.
              </p>
              <p className="text-[11px] text-white/60">
                See Terms for full disclosures, restrictions, and responsible gaming guidelines.
              </p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                  GLD
                </div>
                <div className="mt-1 text-sm font-semibold">Gld chips</div>
                <p className="mt-1 text-[12px] text-white/65">
                  Arcade games, roulette-style games, and blackjack tables use GLD.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                  PGLD
                </div>
                <div className="mt-1 text-sm font-semibold">Poker table chips</div>
                <p className="mt-1 text-[12px] text-white/65">
                  Live poker stacks and table buy-ins use PGLD.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </main>
  )
}
