'use client'

import { useEffect, useMemo, useState } from 'react'

type Asset = 'bgld' | 'gld' | 'pgld'

type Props = {
  balances?: {
    bgld?: number | null // optional UI-only (on-chain handled elsewhere)
    gld?: number | null
    pgld?: number | null
  }
  /**
   * Optional hook: you can wire this later to a real swap endpoint.
   * For now, Account can pass a stub (or omit).
   */
  onSwapPreview?: (args: { from: Asset; to: Asset; amountIn: number; amountOut: number | null; usdValue: number | null }) => void
}

/**
 * Chips pricing rule:
 * 100 chips = $1.00 USD
 * => 1 chip = $0.01 USD
 */
const CHIPS_PER_USD = 100

const ASSET_LABEL: Record<Asset, string> = {
  bgld: 'BGLD',
  gld: 'GLD',
  pgld: 'PGLD',
}

const ASSET_SUB: Record<Asset, string> = {
  bgld: 'Token',
  gld: 'Casino chips',
  pgld: 'Poker chips',
}

// BGLD price can be { priceUsd } or { usd } depending on which route you kept
async function fetchBgldUsd(): Promise<number | null> {
  try {
    const res = await fetch('/api/bgld-price', { cache: 'no-store' })
    const j = await res.json().catch(() => ({}))
    const p = Number(j?.priceUsd ?? j?.usd)
    return Number.isFinite(p) && p > 0 ? p : null
  } catch {
    return null
  }
}

function isChip(a: Asset) {
  return a === 'gld' || a === 'pgld'
}

function formatUsd(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function fmtBal(n: number | null | undefined) {
  if (n === null || n === undefined) return '—'
  if (!Number.isFinite(Number(n))) return '—'
  return Math.floor(Number(n)).toLocaleString()
}

export default function CashierSwapBox({ balances, onSwapPreview }: Props) {
  const [from, setFrom] = useState<Asset>('bgld')
  const [to, setTo] = useState<Asset>('gld')
  const [amountIn, setAmountIn] = useState<string>('')

  const [priceUsd, setPriceUsd] = useState<number | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [priceErr, setPriceErr] = useState<string | null>(null)

  // Fetch BGLD/USD once
  useEffect(() => {
    let alive = true
    async function load() {
      setLoadingPrice(true)
      setPriceErr(null)
      const p = await fetchBgldUsd()
      if (!alive) return
      setPriceUsd(p)
      if (!p) setPriceErr('Unable to fetch BGLD/USD right now.')
      setLoadingPrice(false)
    }
    void load()
    return () => {
      alive = false
    }
  }, [])

  // Keep pairs valid: disallow from===to
  useEffect(() => {
    if (from === to) {
      setTo(from === 'bgld' ? 'gld' : 'bgld')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from])

  const parsedIn = useMemo(() => {
    const n = Number(amountIn)
    return Number.isFinite(n) && n > 0 ? n : 0
  }, [amountIn])

  const quote = useMemo(() => {
    if (!parsedIn) return { out: 0, usd: null as number | null, note: 'Enter an amount to preview.' }

    // Chip ↔ Chip (GLD <-> PGLD): 1:1
    if (isChip(from) && isChip(to)) {
      const usd = parsedIn / CHIPS_PER_USD
      return {
        out: Math.floor(parsedIn),
        usd,
        note: `1:1 chip swap (USD parity).`,
      }
    }

    // BGLD -> Chips
    if (from === 'bgld' && isChip(to)) {
      if (!priceUsd) {
        return { out: 0, usd: null, note: loadingPrice ? 'Fetching BGLD/USD…' : (priceErr ?? 'Price unavailable.') }
      }
      const usdValue = parsedIn * priceUsd
      const chipsOut = Math.floor(usdValue * CHIPS_PER_USD)
      return {
        out: chipsOut,
        usd: usdValue,
        note: `You’ll receive chips priced at 100 chips = $1.`,
      }
    }

    // Chips -> BGLD
    if (isChip(from) && to === 'bgld') {
      if (!priceUsd) {
        return { out: 0, usd: null, note: loadingPrice ? 'Fetching BGLD/USD…' : (priceErr ?? 'Price unavailable.') }
      }
      const usdValue = parsedIn / CHIPS_PER_USD
      const bgldOut = usdValue / priceUsd
      return {
        out: bgldOut,
        usd: usdValue,
        note: `Chips redeem at USD parity when settlement is enabled.`,
      }
    }

    return { out: 0, usd: null, note: 'Select a valid pair.' }
  }, [parsedIn, from, to, priceUsd, loadingPrice, priceErr])

  useEffect(() => {
    if (!onSwapPreview) return
    onSwapPreview({
      from,
      to,
      amountIn: parsedIn,
      amountOut: parsedIn ? (Number.isFinite(Number(quote.out)) ? Number(quote.out) : null) : null,
      usdValue: quote.usd,
    })
  }, [from, to, parsedIn, quote.out, quote.usd, onSwapPreview])

  const onFlip = () => {
    const prevFrom = from
    setFrom(to)
    setTo(prevFrom)
    setAmountIn('')
  }

  const outDisplay = useMemo(() => {
    if (!parsedIn || !quote.out) return '—'
    if (to === 'bgld') return Number(quote.out).toFixed(6)
    return Math.floor(Number(quote.out)).toLocaleString()
  }, [parsedIn, quote.out, to])

  const usdLine = useMemo(() => {
    if (!parsedIn) return ''
    if (loadingPrice && (from === 'bgld' || to === 'bgld')) return '…'
    if (!quote.usd) return ''
    return `≈ ${formatUsd(quote.usd)}`
  }, [parsedIn, loadingPrice, from, to, quote.usd])

  const balanceFor = (a: Asset) => {
    if (a === 'bgld') return balances?.bgld == null ? '—' : String(balances?.bgld)
    if (a === 'gld') return fmtBal(balances?.gld)
    return fmtBal(balances?.pgld)
  }

  const disableSwap =
    !parsedIn || ((from === 'bgld' || to === 'bgld') && !priceUsd)

  return (
    <div className="rounded-3xl border border-white/10 bg-black/60 p-4 md:p-5 shadow-[0_0_50px_rgba(250,204,21,0.08)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/50">Swap</div>
          <div className="mt-1 text-base md:text-lg font-semibold text-[#FFD700]">
            Exchange BGLD ⇄ Chips
          </div>
          <div className="mt-1 text-xs text-white/60">
            GLD / PGLD are in-house credits (not ERC-20). Chips are priced at 100 chips = $1.
          </div>
        </div>

        <div className="text-right text-[11px] text-white/55">
          <div className="uppercase tracking-[0.18em] text-white/45">Price</div>
          <div className="font-mono">{priceUsd ? `$${priceUsd.toFixed(6)}` : loadingPrice ? '…' : '—'}</div>
        </div>
      </div>

      {/* Swap Box */}
      <div className="relative mt-4 space-y-3">
        {/* FROM */}
        <div className="rounded-3xl border border-white/10 bg-black/70 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="flex items-center justify-between text-xs text-white/55">
            <span>You pay</span>
            <span className="font-mono text-white/45">Balance: {balanceFor(from)}</span>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value as Asset)}
              className="min-w-[120px] rounded-2xl border border-white/10 bg-black/80 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-[#FFD700]/50"
            >
              <option value="bgld">BGLD</option>
              <option value="gld">GLD</option>
              <option value="pgld">PGLD</option>
            </select>

            <div className="flex-1">
              <input
                inputMode="decimal"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent text-right text-2xl md:text-3xl font-mono outline-none placeholder:text-white/15"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-white/45">
                <span>{ASSET_SUB[from]}</span>
                <span className="font-mono">{usdLine}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FLIP */}
        <button
          type="button"
          onClick={onFlip}
          aria-label="Flip"
          className="
            absolute left-1/2 top-[calc(50%-18px)] -translate-x-1/2
            h-10 w-10 rounded-2xl border border-white/10 bg-black/90
            shadow-[0_0_22px_rgba(250,204,21,0.18)]
            hover:border-[#FFD700]/40 hover:shadow-[0_0_28px_rgba(250,204,21,0.25)]
            transition flex items-center justify-center
          "
        >
          <span className="text-[#FFD700] text-lg leading-none">↕</span>
        </button>

        {/* TO */}
        <div className="rounded-3xl border border-white/10 bg-black/70 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="flex items-center justify-between text-xs text-white/55">
            <span>You receive</span>
            <span className="font-mono text-white/45">Balance: {balanceFor(to)}</span>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <select
              value={to}
              onChange={(e) => setTo(e.target.value as Asset)}
              className="min-w-[120px] rounded-2xl border border-white/10 bg-black/80 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-[#FFD700]/50"
            >
              <option value="bgld" disabled={from === 'bgld'}>BGLD</option>
              <option value="gld" disabled={from === 'gld'}>GLD</option>
              <option value="pgld" disabled={from === 'pgld'}>PGLD</option>
            </select>

            <div className="flex-1">
              <div className="w-full text-right text-2xl md:text-3xl font-mono text-white/80">
                {outDisplay}
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-white/45">
                <span>{ASSET_SUB[to]}</span>
                <span className="font-mono">{quote.usd ? `≈ ${formatUsd(quote.usd)}` : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl border border-yellow-500/20 bg-black/60 p-3 text-[12px] text-white/70">
          <div className="font-semibold text-white/85">Preview</div>
          <div className="mt-1">{quote.note}</div>
          <div className="mt-2 text-[11px] text-white/55">
            Final settlement may include fees/spread and will require wallet confirmation when enabled.
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          disabled={disableSwap}
          className={[
            'w-full rounded-2xl px-4 py-3 text-sm font-extrabold transition',
            disableSwap ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-[#FFD700] text-black hover:bg-yellow-400',
          ].join(' ')}
        >
          {parsedIn ? `Swap ${ASSET_LABEL[from]} → ${ASSET_LABEL[to]} (Preview)` : 'Enter amount'}
        </button>
      </div>
    </div>
  )
}
