'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CashierPanel, ChipKind } from '@/components/casino/CashierPanel'
import CashierSwapBox from '@/components/casino/CashierSwapBox'

const UNISWAP_URL = 'https://app.uniswap.org/swap'

// ✅ Pricing rule: 100 chips = $1.00
// => 1 chip = $0.01
const CHIPS_PER_USD = 100
const USD_PER_CHIP = 1 / CHIPS_PER_USD

// Adjust if your API route differs (or remove if CashierSwapBox already shows price)
const BGLD_USD_API = '/api/bgld-price'

export default function CashierPage() {
  const [chip, setChip] = useState<ChipKind>('gld')

  const title = useMemo(() => {
    return chip === 'gld' ? 'GLD Chips (games)' : 'PGLD Chips (Poker Tables)'
  }, [chip])

  const subtitle = useMemo(() => {
    return chip === 'gld'
      ? 'GLD chips are used for arcade games and Blackjack.'
      : 'PGLD chips are used for live poker table stacks and poker gameplay.'
  }, [chip])

  const [playerId, setPlayerId] = useState<string | null>(null)
  const [balances, setBalances] = useState<{ gld: number; pgld: number } | null>(
    null
  )
  const [balLoading, setBalLoading] = useState(false)
  const [balErr, setBalErr] = useState<string | null>(null)

  // Optional: BGLD price in USD (for preview + disclosure)
  const [bgldUsd, setBgldUsd] = useState<number | null>(null)
  const [priceErr, setPriceErr] = useState<string | null>(null)

  // TEMP: derive Casino ID from localStorage (replace with your ProfileProvider later)
  useEffect(() => {
    if (typeof window === 'undefined') return
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

  // Load BGLD USD price (optional, won’t block UI if missing)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setPriceErr(null)
        const res = await fetch(BGLD_USD_API, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Price API ${res.status}`)
        const j = await res.json()

        // Accept a couple common shapes:
        // { usd: 1.23 } OR { priceUsd: 1.23 } OR { data: { usd: 1.23 } }
        const usd =
          Number(j?.usd) ||
          Number(j?.priceUsd) ||
          Number(j?.data?.usd) ||
          null

        if (!cancelled) setBgldUsd(Number.isFinite(usd as any) ? (usd as any) : null)
      } catch (e: any) {
        if (!cancelled) {
          setBgldUsd(null)
          setPriceErr(e?.message ?? 'Unable to load BGLD price')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const gldUsdValue = useMemo(() => {
    const g = balances?.gld ?? 0
    return g * USD_PER_CHIP
  }, [balances])

  const pgldUsdValue = useMemo(() => {
    const p = balances?.pgld ?? 0
    return p * USD_PER_CHIP
  }, [balances])

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
            BGLD Rush • Cashier
          </div>
          <h1 className="mt-1 text-2xl md:text-3xl font-extrabold">
            Cashier Window
          </h1>
          <p className="mt-2 text-sm text-white/70 max-w-2xl">
            Load chips for gameplay. In early access, balances may be demo credits while we finalize live settlement.
          </p>

          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-white/60">
            <Link
              href="/legal/terms"
              className="hover:text-white underline underline-offset-2"
            >
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
          <div>
            {balErr && (
              <div className="mb-3 rounded-lg border border-red-500/20 bg-red-950/20 p-2 text-[11px] text-red-200">
                {balErr}
              </div>
            )}
            {balLoading && (
              <div className="mb-3 text-[11px] text-white/50">Loading balances…</div>
            )}

            {/* Small rate card */}
            <div className="mb-4 rounded-2xl border border-white/10 bg-black/50 p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
                Rates
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    Chips
                  </div>
                  <div className="mt-1 text-[12px] font-semibold text-white/85">
                    {CHIPS_PER_USD} chips = $1.00
                  </div>
                  <div className="mt-1 text-[11px] text-white/60">
                    1 chip = ${USD_PER_CHIP.toFixed(2)}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    BGLD
                  </div>
                  <div className="mt-1 text-[12px] font-semibold text-white/85">
                    {bgldUsd !== null ? `$${bgldUsd.toLocaleString()}` : '—'}
                    <span className="ml-1 text-white/55 text-[11px]">USD</span>
                  </div>
                  {priceErr ? (
                    <div className="mt-1 text-[10px] text-white/40">Price feed unavailable</div>
                  ) : (
                    <div className="mt-1 text-[10px] text-white/40">Spot price (for preview)</div>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    GLD value
                  </div>
                  <div className="mt-1 text-[12px] font-semibold text-white/85">
                    ${gldUsdValue.toFixed(2)}
                  </div>
                  <div className="mt-1 text-[10px] text-white/40">
                    Based on {CHIPS_PER_USD}/$1
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    PGLD value
                  </div>
                  <div className="mt-1 text-[12px] font-semibold text-white/85">
                    ${pgldUsdValue.toFixed(2)}
                  </div>
                  <div className="mt-1 text-[10px] text-white/40">
                    Based on {CHIPS_PER_USD}/$1
                  </div>
                </div>
              </div>
            </div>

            <CashierPanel chip={chip} playerId={playerId ?? undefined} />
          </div>

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
            <p className="mt-2 text-sm text-white/70">{subtitle}</p>

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
