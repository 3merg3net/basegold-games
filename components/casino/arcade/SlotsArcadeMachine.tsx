'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

/**
 * 3 reels • 3 visible rows per reel (top / middle / bottom) = 3 paylines
 * Emoji symbols, step-based reel animation, cabinet art frame.
 */

/* ---------- SYMBOL + PAYTABLE CONFIG ---------- */

// Order matters – circular order of symbols on each reel.
const SYMBOL_IDS = [
  'PICKAXE',
  'BAR',
  'CHIP',
  'SEVEN',
  'HORSESHOE',
  'NUGGET',
  'LANTERN',
] as const

type SymbolId = (typeof SYMBOL_IDS)[number]

const STRIP_SYMBOL_COUNT = SYMBOL_IDS.length

// Visuals for now (can swap to PNG <Image> per symbol later)
const SYMBOL_ART: Record<
  SymbolId,
  {
    emoji: string
    label: string
  }
> = {
  PICKAXE: { emoji: '⛏️', label: 'Pickaxe' },
  BAR: { emoji: '🟥', label: 'Gold Bar' },
  CHIP: { emoji: '🎰', label: 'BGRC Chip' },
  SEVEN: { emoji: '7️⃣', label: 'Lucky 7' },
  HORSESHOE: { emoji: '🍀', label: 'Horseshoe' },
  NUGGET: { emoji: '💰', label: 'Nugget' },
  LANTERN: { emoji: '🏮', label: 'Lantern' },
}

// 3-of-a-kind paytable per symbol (total payout multiplier, incl. stake)
const PAYTABLE: Record<SymbolId, number> = {
  PICKAXE: 2, // 1:1 net
  BAR: 3,
  CHIP: 4,
  SEVEN: 10,
  HORSESHOE: 5,
  NUGGET: 8,
  LANTERN: 6,
}

/* ---------- ANIMATION CONSTANTS ---------- */

const SPIN_TICK_MS = 55 // how fast the symbols step while spinning
const FIRST_REEL_SPIN_MS = 1100 // base total spin time for reel 1
const REEL_STAGGER_MS = 240 // additional time per reel (L → R)
const FORCED_HIT_CHANCE = 0.3 // ~30% of spins will hit at least 1 payline

/* ---------- HELPERS ---------- */

function evalLine(
  syms: SymbolId[],
  stake: number
): { payout: number; sym: SymbolId | null } {
  if (syms.length !== 3) return { payout: 0, sym: null }
  const [a, b, c] = syms
  if (a === b && b === c) {
    const mul = PAYTABLE[a] ?? 0
    const payout = stake * mul
    return { payout, sym: a }
  }
  return { payout: 0, sym: null }
}

function wrapIndex(i: number, n: number) {
  return ((i % n) + n) % n
}

/* ---------- MAIN COMPONENT ---------- */

export default function SlotsArcadeMachine() {
  const { credits, initialCredits, recordSpin } = useArcadeWallet()

  // reelCenter[i] is the index in SYMBOL_IDS that appears on the MIDDLE row
  const [reelCenters, setReelCenters] = useState<number[]>([0, 2, 4])

  const [betPerSpin, setBetPerSpin] = useState(5)
  const [spinning, setSpinning] = useState(false)

  const [status, setStatus] = useState('Select your bet and tap SPIN.')
  const [lastNet, setLastNet] = useState(0)
  const [lastWinGross, setLastWinGross] = useState(0)
  const [lastSymbolId, setLastSymbolId] = useState<SymbolId | null>(null)

  // mobile full-screen overlay state
  const [fullscreenMobile, setFullscreenMobile] = useState(false)

  const sessionPnL = useMemo(
    () => credits - initialCredits,
    [credits, initialCredits]
  )

  const reelIntervals = useRef<Array<ReturnType<typeof setInterval> | null>>([
    null,
    null,
    null,
  ])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      reelIntervals.current.forEach(id => {
        if (id) clearInterval(id)
      })
    }
  }, [])

  const betOptions = [1, 2, 5, 10, 25, 50]

  function spin() {
    if (spinning) return

    const stake = Math.max(1, betPerSpin)

    if (credits <= 0) {
      setStatus('Out of demo credits in your arcade wallet.')
      return
    }
    if (stake > credits) {
      setStatus('Not enough demo credits for that bet size.')
      return
    }

    setSpinning(true)
    setStatus('Spinning…')
    setLastNet(0)
    setLastWinGross(0)
    setLastSymbolId(null)

    // ----- CHOOSE FINAL CENTER INDEX FOR EACH REEL -----
    let stops: number[] = [0, 1, 2].map(
      () => Math.floor(Math.random() * STRIP_SYMBOL_COUNT)
    )

    // Force a win sometimes so it doesn't feel dead / rigged.
    if (Math.random() < FORCED_HIT_CHANCE) {
      const N = STRIP_SYMBOL_COUNT
      const winningLine = Math.floor(Math.random() * 3) // 0=top,1=mid,2=bot
      const symIndex = Math.floor(Math.random() * N)

      // We want the same symbol on that line across all 3 reels.
      // For our helper:
      //   topIdx = s-1, midIdx = s, botIdx = s+1 (all mod N),
      // where s = center index.
      const makeCenterForLine = (line: number): number => {
        if (line === 0) return wrapIndex(symIndex + 1, N) // top = symIndex
        if (line === 1) return wrapIndex(symIndex, N) // middle = symIndex
        return wrapIndex(symIndex - 1, N) // bottom = symIndex
      }

      const forcedCenter = makeCenterForLine(winningLine)
      stops = [forcedCenter, forcedCenter, forcedCenter]
    }

    // ----- REEL ANIMATION (DISCRETE STEP) -----
    const N = STRIP_SYMBOL_COUNT

    stops.forEach((finalCenter, i) => {
      // start stepping this reel
      reelIntervals.current[i] = setInterval(() => {
        setReelCenters(prev => {
          const next = [...prev]
          next[i] = wrapIndex(next[i] + 1, N)
          return next
        })
      }, SPIN_TICK_MS)

      // schedule stop for each reel with stagger
      const stopDelay = FIRST_REEL_SPIN_MS + i * REEL_STAGGER_MS
      setTimeout(() => {
        const intervalId = reelIntervals.current[i]
        if (intervalId) {
          clearInterval(intervalId)
          reelIntervals.current[i] = null
        }
        // snap to final center index
        setReelCenters(prev => {
          const next = [...prev]
          next[i] = wrapIndex(finalCenter, N)
          return next
        })
      }, stopDelay)
    })

    // ----- PAYLINES + PAYOUT MATH (3 HORIZONTAL LINES) -----
    const getTopIdx = (s: number) => wrapIndex(s - 1, N)
    const getMidIdx = (s: number) => wrapIndex(s, N)
    const getBotIdx = (s: number) => wrapIndex(s + 1, N)

    const topLineSyms: SymbolId[] = []
    const midLineSyms: SymbolId[] = []
    const botLineSyms: SymbolId[] = []

    for (let i = 0; i < 3; i++) {
      const s = stops[i]
      topLineSyms.push(SYMBOL_IDS[getTopIdx(s)])
      midLineSyms.push(SYMBOL_IDS[getMidIdx(s)])
      botLineSyms.push(SYMBOL_IDS[getBotIdx(s)])
    }

    const topRes = evalLine(topLineSyms, stake)
    const midRes = evalLine(midLineSyms, stake)
    const botRes = evalLine(botLineSyms, stake)

    const payout = topRes.payout + midRes.payout + botRes.payout
    const linesHit =
      (topRes.payout > 0 ? 1 : 0) +
      (midRes.payout > 0 ? 1 : 0) +
      (botRes.payout > 0 ? 1 : 0)

    const headlineSym = midRes.sym ?? topRes.sym ?? botRes.sym ?? null

    // Record in arcade wallet (chips move correctly)
    recordSpin({ wager: stake, payout })

    const net = payout - stake

    // Wait for reels to finish: base + 2 staggers + small buffer.
    const resultDelay = FIRST_REEL_SPIN_MS + 2 * REEL_STAGGER_MS + 220

    setTimeout(() => {
      setSpinning(false)
      setLastNet(net)
      setLastWinGross(payout)
      setLastSymbolId(headlineSym)

      if (payout > 0 && linesHit > 0) {
        setStatus(
          `Hit ${linesHit} payline${linesHit > 1 ? 's' : ''}! Total payout ${payout} credits (net ${
            net >= 0 ? '+' : ''
          }${net}).`
        )
      } else {
        setStatus(`No line hit. Net -${stake}.`)
      }
    }, resultDelay)
  }

  const canSpin = !spinning && credits > 0 && betPerSpin > 0

  return (
    <div
      className={[
        'mx-auto w-full max-w-4xl rounded-[32px] border border-yellow-500/50 bg-gradient-to-b from-[#020617] via-black to-[#111827] p-4 md:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)] space-y-4',
        fullscreenMobile
          ? 'fixed inset-0 z-40 max-w-none rounded-none overflow-y-auto flex flex-col p-3 bg-black'
          : '',
      ].join(' ')}
    >
      {/* HEADER STRIP – hidden in fullscreen for pure cabinet mode */}
      {!fullscreenMobile && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.45em] text-[#fde68a]/80">
              Base Gold Rush Casino
            </div>
            <div className="mt-1 text-xl md:text-3xl font-extrabold text-white">
              Triple Stake Slots <span className="text-[#facc15]">• Arcade</span>
            </div>
            <div className="text-xs text-white/60 mt-1 max-w-sm">
              Cinematic 3-reel cabinet with three horizontal paylines. Demo
              credits only — no real BGLD on this machine.
            </div>
          </div>
          <div className="flex flex-col items-stretch md:items-end gap-2 text-xs md:text-sm w-full md:w-auto">
            <div className="rounded-xl border border-white/15 bg-black/70 px-4 py-2 flex items-center justify-between md:justify-end gap-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                Demo Credits
              </div>
              <div className="text-2xl font-black text-[#fbbf24] tabular-nums">
                {credits.toLocaleString()}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full md:w-auto">
              <MiniStat label="Bet / Spin" value={betPerSpin} />
              <MiniStat label="Last Net" value={lastNet} colored />
              <MiniStat label="Session P&L" value={sessionPnL} colored />
            </div>
          </div>
        </div>
      )}

      {/* MAIN: CABINET + CONTROLS */}
      <div
        className={[
          'grid gap-4 md:gap-6 md:grid-cols-[minmax(260px,0.95fr)_minmax(260px,1.05fr)]',
          fullscreenMobile ? 'flex-1 grid-cols-1' : '',
        ].join(' ')}
      >
        {/* LEFT: CABINET + REELS + STATUS */}
        <div
          className={[
            'rounded-[24px] border border-white/12 bg-gradient-to-b from-black/40 via-[#020617] to-black p-3 sm:p-4 space-y-3',
            fullscreenMobile ? 'h-full flex flex-col' : '',
          ].join(' ')}
        >
          <div className="flex items-center justify-between text-[11px] mb-1">
            <div className="uppercase tracking-[0.3em] text-white/60">
              Cabinet View
            </div>
            <div className="flex items-center gap-2">
              {!fullscreenMobile && (
                <div className="text-white/50 hidden sm:block">
                  3 paylines • reels step downwards
                </div>
              )}
              {/* MOBILE FULLSCREEN TOGGLE */}
              <button
                type="button"
                onClick={() => setFullscreenMobile(fs => !fs)}
                className="md:hidden rounded-full border border-white/30 bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white/80"
              >
                {fullscreenMobile ? 'Exit Full Screen' : 'Full Screen'}
              </button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[360px] aspect-[3/4]">
            {/* Cabinet art */}
            <Image
              src="/images/slots/slots-cabinet-empty.png"
              alt="Slots cabinet"
              fill
              className="object-contain select-none pointer-events-none"
            />

            {/* Reel window */}
            <div className="absolute inset-x-0 top-[36%] mx-auto flex justify-center gap-1 sm:gap-1.5 px-4">
              {reelCenters.map((centerIndex, i) => (
                <ReelColumn key={i} centerIndex={centerIndex} />
              ))}
            </div>

            {/* 3 payline indicators */}
            <div className="pointer-events-none absolute inset-x-[12%] top-[41%] h-[2px] bg-gradient-to-r from-transparent via-yellow-300/80 to-transparent shadow-[0_0_10px_rgba(250,204,21,0.9)]" />
            <div className="pointer-events-none absolute inset-x-[12%] top-[51%] h-[2px] bg-gradient-to-r from-transparent via-yellow-300/70 to-transparent shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
            <div className="pointer-events-none absolute inset-x-[12%] top-[62%] h-[2px] bg-gradient-to-r from-transparent via-yellow-300/80 to-transparent shadow-[0_0_10px_rgba(250,204,21,0.9)]" />
          </div>

          {/* Spin button + status under cabinet */}
          <div className="space-y-1 mt-1">
            <button
              onClick={spin}
              disabled={!canSpin}
              className="w-full h-11 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 text-black text-sm font-extrabold tracking-[0.3em] uppercase shadow-[0_0_25px_rgba(250,204,21,0.9)] hover:from-yellow-300 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {spinning
                ? 'Spinning…'
                : credits <= 0
                ? 'No Demo Credits'
                : betPerSpin > credits
                ? 'Lower Bet'
                : 'Spin Reels'}
            </button>
            <div className="text-[10px] text-emerald-100/80 text-center">
              Each spin uses your arcade demo wallet balance and auto-credits
              any hits across all three paylines.
            </div>

            <div className="rounded-xl border border-white/10 bg-black/60 p-3 text-xs space-y-2">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                Spin Status
              </div>
              <div className="text-[13px] text-white/90 min-h-[1.4rem]">
                {status}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px]">
                <div className="flex-1">
                  <div className="uppercase tracking-[0.16em] text-white/50">
                    Last Net
                  </div>
                  <div
                    className={
                      lastNet > 0
                        ? 'text-emerald-400 text-lg font-bold'
                        : lastNet < 0
                        ? 'text-rose-400 text-lg font-bold'
                        : 'text-slate-200 text-lg font-bold'
                    }
                  >
                    {lastNet > 0 ? '+' : ''}
                    {lastNet.toLocaleString()}
                  </div>
                  {lastSymbolId && (
                    <div className="text-[11px] text-emerald-100/80">
                      Headline hit:{' '}
                      <span className="font-semibold">
                        {lastSymbolId}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="uppercase tracking-[0.16em] text-white/50">
                    Last Payout
                  </div>
                  <div
                    className={
                      lastWinGross > 0
                        ? 'text-emerald-300 text-lg font-bold'
                        : 'text-slate-200 text-lg font-bold'
                    }
                  >
                    {lastWinGross > 0 ? '+' : ''}
                    {lastWinGross.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: BETTING + PAYTABLE – hidden in fullscreen mode */}
        {!fullscreenMobile && (
          <div className="rounded-[24px] border border-emerald-400/40 bg-gradient-to-b from-[#064e3b] via-[#022c22] to-black p-4 md:p-5 text-xs text-white space-y-4">
            {/* Bet selector */}
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/80">
                Bet Per Spin
              </div>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {betOptions.map(v => {
                  const active = v === betPerSpin
                  const disabled = v > credits && credits > 0
                  return (
                    <button
                      key={v}
                      onClick={() => !disabled && setBetPerSpin(v)}
                      className={[
                        'rounded-full px-2.5 py-1.5 text-[11px] font-semibold border text-center',
                        active
                          ? 'border-yellow-300 bg-yellow-400/20 text-yellow-100 shadow-[0_0_12px_rgba(250,204,21,0.7)]'
                          : 'border-emerald-200/60 bg-emerald-900/40 text-emerald-100 hover:bg-emerald-800/60',
                        disabled ? 'opacity-40 cursor-not-allowed' : '',
                      ].join(' ')}
                    >
                      {v}
                    </button>
                  )
                })}
              </div>
              {credits <= 0 && (
                <div className="mt-1 text-[11px] text-rose-300">
                  You&apos;re out of demo credits. Top up from the arcade
                  wallet HUD to keep spinning.
                </div>
              )}
            </div>

            {/* Paytable */}
            <div className="rounded-2xl border border-emerald-200/60 bg-black/40 p-3 space-y-2">
              <div className="text-sm font-semibold text-emerald-50">
                Paytable — 3 Horizontal Paylines (3-of-a-kind)
              </div>
              <ul className="space-y-1 text-emerald-50/85 text-[11px] sm:text-xs list-disc list-inside">
                <li>PICKAXE • pays 2× total (1:1 net)</li>
                <li>GOLD BAR • pays 3× total</li>
                <li>BGRC CHIP • pays 4× total</li>
                <li>HORSESHOE • pays 5× total</li>
                <li>LANTERN • pays 6× total</li>
                <li>GOLD NUGGET • pays 8× total</li>
                <li>LUCKY 7 • pays 10× total (9:1 net)</li>
              </ul>
              <div className="text-[11px] text-emerald-100/80 pt-1">
                All three horizontal rows can hit. On-chain versions can add
                angled paylines, wilds, and bonus features.
              </div>
            </div>

            {/* Explainer */}
            <div className="rounded-2xl border border-white/12 bg-black/40 p-3 space-y-2">
              <div className="text-sm font-semibold text-white">
                How To Play
              </div>
              <ul className="space-y-1 text-white/75 list-disc list-inside">
                <li>
                  All spins use your shared BGRC demo credits from the arcade
                  wallet.
                </li>
                <li>
                  Any payline that shows 3-of-a-kind pays according to the
                  table above; multiple lines can hit at once.
                </li>
                <li>
                  Your arcade wallet tracks net wins/losses across all demo
                  games, including this cabinet.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- REEL COLUMN (3 VISIBLE ROWS) ---------- */

function ReelColumn({ centerIndex }: { centerIndex: number }) {
  const N = STRIP_SYMBOL_COUNT
  const topIdx = wrapIndex(centerIndex - 1, N)
  const midIdx = wrapIndex(centerIndex, N)
  const botIdx = wrapIndex(centerIndex + 1, N)

  const order = [topIdx, midIdx, botIdx]

  return (
    <div className="flex flex-col gap-1 sm:gap-1.5">
      {order.map((idx, row) => {
        const symId = SYMBOL_IDS[idx]
        const art = SYMBOL_ART[symId]
        return (
          <div
            key={`${idx}-${row}`}
            className="flex h-10 sm:h-11 items-center justify-center rounded-xl border border-yellow-400/60 bg-gradient-to-b from-slate-900 via-black to-slate-900 shadow-[0_10px_24px_rgba(0,0,0,0.9)] text-xl sm:text-2xl"
          >
            <span className="drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]">
              {art.emoji}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- MINI STAT CARD ---------- */

function MiniStat({
  label,
  value,
  colored,
}: {
  label: string
  value: number
  colored?: boolean
}) {
  const colorClass = !colored
    ? 'text-slate-100'
    : value > 0
    ? 'text-emerald-400'
    : value < 0
    ? 'text-rose-400'
    : 'text-slate-100'

  return (
    <div className="rounded-lg border border-white/15 bg-black/50 px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">
        {label}
      </div>
      <div className={`text-sm font-semibold tabular-nums ${colorClass}`}>
        {value > 0 ? '+' : ''}
        {value.toLocaleString()}
      </div>
    </div>
  )
}
