'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

/* ---------- SYMBOL + STRIPS ---------- */

type SymbolId = 'BGLD' | 'NUGGET' | 'VAULT'
type ReelSide = 'LEFT' | 'CENTER' | 'RIGHT'

const STRIP_SYMBOLS: SymbolId[] = [
  'BGLD',
  'NUGGET',
  'VAULT',
  'NUGGET',
  'VAULT',
  'BGLD',
  'NUGGET',
  'VAULT',
  'BGLD',
  'NUGGET',
  'VAULT',
  'NUGGET',
]

const STRIP_LENGTH = STRIP_SYMBOLS.length

function getSliceSrc(symbol: SymbolId, side: ReelSide): string {
  switch (symbol) {
    case 'BGLD':
      return `/images/slots/bgld-${side.toLowerCase()}.png`
    case 'NUGGET':
      return `/images/slots/nugget-${side.toLowerCase()}.png`
    case 'VAULT':
      return `/images/slots/vault-${side.toLowerCase()}.png`
  }
}

/* ---------- PAYTABLE & HELPERS ---------- */

const PAYTABLE: Record<SymbolId, number> = {
  // multipliers on total bet per spin, per payline
  BGLD: 12, // main BGLD alignment
  VAULT: 8,
  NUGGET: 5,
}

// slightly cooled down from 0.22 → 0.12
const FORCED_ALIGN_CHANCE = 0.12

// Slightly slower tick so the spin reads more clearly on mobile
const SPIN_TICK_MS = 90
const FIRST_REEL_SPIN_MS = 1100
const REEL_STAGGER_MS = 260

function wrapIndex(i: number, n: number) {
  return ((i % n) + n) % n
}

type LineResult = {
  payout: number
  symbol: SymbolId | null
}

/**
 * Given symbol ids for a single horizontal row (L, C, R) and stake,
 * returns payout + which symbol hit (if any).
 */
function evalLine(symbols: SymbolId[], stake: number): LineResult {
  if (symbols.length !== 3) return { payout: 0, symbol: null }
  const [a, b, c] = symbols
  if (a === b && b === c) {
    const mul = PAYTABLE[a] ?? 0
    return { payout: mul * stake, symbol: a }
  }
  return { payout: 0, symbol: null }
}

/* ---------- MAIN COMPONENT ---------- */

const BET_OPTIONS = [1, 2, 5, 10, 25, 50]

export default function GoldenAlignmentArcadeMachine() {
  const { credits, initialCredits, recordSpin } = useArcadeWallet()

  // reelCenters[i] is the index in STRIP_SYMBOLS that appears on the MIDDLE row
  const [reelCenters, setReelCenters] = useState<number[]>([0, 4, 8])

  const [betPerSpin, setBetPerSpin] = useState(5)
  const [spinning, setSpinning] = useState(false)

  const [status, setStatus] = useState(
    'Set your bet and spin — line up full BGLD, nugget, or vault images across any row to get paid.'
  )
  const [lastNet, setLastNet] = useState(0)
  const [lastPayout, setLastPayout] = useState(0)
  const [lastMainSymbol, setLastMainSymbol] = useState<SymbolId | null>(null)
  const [lastLinesHit, setLastLinesHit] = useState(0)

  const sessionPnL = useMemo(
    () => credits - initialCredits,
    [credits, initialCredits]
  )

  const reelIntervals = useRef<Array<ReturnType<typeof setInterval> | null>>([
    null,
    null,
    null,
  ])

  // mobile fullscreen overlay
  const [fullscreenMobile, setFullscreenMobile] = useState(false)

  useEffect(() => {
    return () => {
      reelIntervals.current.forEach(id => {
        if (id) clearInterval(id)
      })
    }
  }, [])

  const canSpin = !spinning && credits > 0 && betPerSpin > 0

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
  setStatus('Spinning reels… aligning gold…')
  setLastNet(0)
  setLastPayout(0)
  setLastMainSymbol(null)
  setLastLinesHit(0)

  // Choose raw stops
  let stops: number[] = [0, 1, 2].map(
    () => Math.floor(Math.random() * STRIP_LENGTH)
  )

  // Occasionally force a full alignment on one of the three rows
  if (Math.random() < FORCED_ALIGN_CHANCE) {
    const targetRow = Math.floor(Math.random() * 3) // 0 top,1 mid,2 bottom
    const targetIndex = Math.floor(Math.random() * STRIP_LENGTH)

    const makeCenterForRow = (row: number): number => {
      if (row === 0) return wrapIndex(targetIndex + 1, STRIP_LENGTH) // top row shows targetIndex
      if (row === 1) return wrapIndex(targetIndex, STRIP_LENGTH) // mid
      return wrapIndex(targetIndex - 1, STRIP_LENGTH) // bottom
    }

    const forcedCenter = makeCenterForRow(targetRow)
    stops = [forcedCenter, forcedCenter, forcedCenter]
  }

  // Animate reels
  const N = STRIP_LENGTH

  // 🔥 Make fullscreen mobile a bit more “Las Vegas”
  const tickMs = fullscreenMobile ? 70 : SPIN_TICK_MS
  const baseFullSpins = fullscreenMobile ? 3 : 2 // slightly longer spin on fullscreen

  stops.forEach((finalCenter, i) => {
    reelIntervals.current[i] = setInterval(() => {
      setReelCenters(prev => {
        const next = [...prev]
        // always rotate at least; full spin feel over time
        next[i] = wrapIndex(next[i] + 1, N)
        return next
      })
    }, tickMs)

    const fullSpins = baseFullSpins + i // later reels spin a bit longer
    const stopDelay =
      FIRST_REEL_SPIN_MS +
      i * REEL_STAGGER_MS +
      fullSpins * 200 // extra time for more rotations

    setTimeout(() => {
      const intervalId = reelIntervals.current[i]
      if (intervalId) {
        clearInterval(intervalId)
        reelIntervals.current[i] = null
      }

      setReelCenters(prev => {
        const next = [...prev]
        next[i] = wrapIndex(finalCenter, N)
        return next
      })
    }, stopDelay)
  })

  // Precompute final symbols for eval (top/mid/bottom for each reel)
  const getTopIdx = (s: number) => wrapIndex(s - 1, N)
  const getMidIdx = (s: number) => wrapIndex(s, N)
  const getBotIdx = (s: number) => wrapIndex(s + 1, N)

  const topRowSyms: SymbolId[] = []
  const midRowSyms: SymbolId[] = []
  const botRowSyms: SymbolId[] = []

  for (let i = 0; i < 3; i++) {
    const s = stops[i]
    topRowSyms.push(STRIP_SYMBOLS[getTopIdx(s)])
    midRowSyms.push(STRIP_SYMBOLS[getMidIdx(s)])
    botRowSyms.push(STRIP_SYMBOLS[getBotIdx(s)])
  }

  const topRes = evalLine(topRowSyms, stake)
  const midRes = evalLine(midRowSyms, stake)
  const botRes = evalLine(botRowSyms, stake)

  const payout = topRes.payout + midRes.payout + botRes.payout
  const linesHit =
    (topRes.payout > 0 ? 1 : 0) +
    (midRes.payout > 0 ? 1 : 0) +
    (botRes.payout > 0 ? 1 : 0)

  const mainSymbol: SymbolId | null =
    midRes.symbol ?? topRes.symbol ?? botRes.symbol ?? null

  const net = payout - stake

  // Record with arcade wallet
  recordSpin({ wager: stake, payout })

  // make sure result text lands AFTER the last reel stops
  const lastReelIndex = 2
  const lastReelFullSpins = baseFullSpins + lastReelIndex
  const resultDelay =
    FIRST_REEL_SPIN_MS +
    lastReelIndex * REEL_STAGGER_MS +
    lastReelFullSpins * 200 +
    260

  setTimeout(() => {
    setSpinning(false)
    setLastNet(net)
    setLastPayout(payout)
    setLastMainSymbol(mainSymbol)
    setLastLinesHit(linesHit)

    if (payout > 0 && linesHit > 0) {
      const symLabel =
        mainSymbol === 'BGLD'
          ? 'BGLD Coin'
          : mainSymbol === 'VAULT'
          ? 'Vault'
          : 'Nugget'

      setStatus(
        `Golden Alignment hit! ${linesHit} payline${
          linesHit > 1 ? 's' : ''
        } with ${symLabel} slices aligned. Total payout ${payout} credits (net ${
          net >= 0 ? '+' : ''
        }${net}).`
      )
    } else {
      setStatus(`No full image alignment this spin. Net -${stake}.`)
    }
  }, resultDelay)
}


  /* ---------- CABINET PANEL (re-used in normal + fullscreen) ---------- */

  const cabinetPanel = (
    <div
      className={[
        'rounded-[24px] border border-white/12 bg-gradient-to-b from-black/40 via-[#020617] to-black p-2 sm:p-3 space-y-3',
        fullscreenMobile ? 'h-full flex flex-col' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between text-[11px] mb-1">
        <div className="uppercase tracking-[0.3em] text-white/60">
          Cabinet View
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-white/50">
            3×3 grid • image alignment paylines
          </div>
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

      {/* CABINET + REELS + SPIN BUTTON */}
      <div className="relative mx-auto w-full max-w-[560px] sm:max-w-[620px] aspect-[3/4]">
        {/* Cabinet Art */}
        <Image
          src="/images/slots/golden-alignment-cabinet.png"
          alt="Golden Alignment cabinet"
          fill
          className="object-contain select-none pointer-events-none"
        />

        {/* TOP RESULT PILL */}
        <div className="absolute inset-x-[22%] top-[24%] flex justify-center">
          <div
            className={[
              'rounded-full border px-3 py-1.5 text-[11px] sm:text-xs font-semibold flex items-center gap-2 bg-black/75 shadow-[0_0_18px_rgba(0,0,0,0.9)]',
              lastNet > 0
                ? 'border-emerald-300 text-emerald-100 animate-pulse'
                : lastNet < 0
                ? 'border-rose-300 text-rose-100'
                : 'border-slate-400/80 text-slate-100',
            ].join(' ')}
          >
            <span className="uppercase tracking-[0.24em] text-[9px] text-white/60">
              Last Spin
            </span>
            <span className="tabular-nums">
              {lastNet > 0
                ? `WIN +${lastNet.toLocaleString()}`
                : lastNet < 0
                ? `LOSS ${lastNet.toLocaleString()}`
                : spinning
                ? 'Spinning…'
                : '—'}
            </span>
          </div>
        </div>

        {/* Reel Window (your exact tweaked values) */}
        <div className="absolute inset-x-[5%] top-[30%] mx-auto flex justify-center gap-3 sm:gap-4">
          {(['LEFT', 'CENTER', 'RIGHT'] as ReelSide[]).map((side, i) => (
            <ReelColumn
              key={side}
              side={side}
              centerIndex={reelCenters[i]}
            />
          ))}
        </div>

        {/* Payline indicator glows (your exact tweaked values) */}
        <div className="pointer-events-none absolute inset-x-[20%] top-[35%] h-[2px] bg-gradient-to-r from-transparent via-yellow-300/80 to-transparent shadow-[0_0_10px_rgba(250,204,21,0.9)]" />
        <div className="pointer-events-none absolute inset-x-[20%] top-[42%] h-[2px] bg-gradient-to-r from-transparent via-yellow-300/70 to-transparent shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
        <div className="pointer-events-none absolute inset-x-[20%] top-[49%] h-[2px] bg-gradient-to-r from-transparent via-yellow-300/80 to-transparent shadow-[0_0_10px_rgba(250,204,21,0.9)]" />

        {/* SPIN BUTTON SITTING ON CABINET UNDER REELS */}
        <button
          onClick={spin}
          disabled={!canSpin}
          className="absolute inset-x-[0%] bottom-[17%] mx-auto w-[28%] max-w-sm h-9 sm:h-14 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 text-black text-[11px] sm:text-sm font-extrabold tracking-[0.26em] uppercase shadow-[0_0_22px_rgba(250,204,21,0.95)] hover:from-yellow-300 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {spinning
            ? 'Spinning…'
            : credits <= 0
            ? 'No Demo Credits'
            : betPerSpin > credits
            ? 'Lower Bet'
            : 'Spin'}
        </button>
      </div>

      {/* STATUS + EXPLAINER UNDER CABINET – NO HISTORY, JUST CURRENT RESULT INFO */}
      <div className="space-y-1 mt-2">
        <div className="text-[10px] text-emerald-100/80 text-center">
          Each spin uses your arcade wallet. Only rows with all slices aligned
          into a full BGLD coin, nugget, or vault image pay.
        </div>

        <div className="rounded-xl border border-white/10 bg-black/60 p-3 text-xs space-y-2">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/60">
            Spin Status
          </div>
          <div className="text-[13px] text-white/90 min-h-[1.6rem]">
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
              {lastLinesHit > 0 && lastMainSymbol && (
                <div className="text-[11px] text-emerald-100/80">
                  {lastLinesHit} line{lastLinesHit > 1 ? 's' : ''} of{' '}
                  {lastMainSymbol === 'BGLD'
                    ? 'BGLD Coin'
                    : lastMainSymbol === 'VAULT'
                    ? 'Vault'
                    : 'Nugget'}{' '}
                  aligned.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COMPACT BET BUTTONS WHEN IN FULLSCREEN MOBILE */}
        {fullscreenMobile && (
          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/80 text-center mb-1">
              Bet Per Spin
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {BET_OPTIONS.map(v => {
                const active = v === betPerSpin
                const disabled = v > credits && credits > 0
                return (
                  <button
                    key={v}
                    onClick={() => !disabled && setBetPerSpin(v)}
                    className={[
                      'rounded-full px-3 py-1 text-[11px] font-semibold border',
                      active
                        ? 'border-yellow-300 bg-yellow-400/20 text-yellow-100 shadow-[0_0_8px_rgba(250,204,21,0.7)]'
                        : 'border-emerald-200/60 bg-emerald-900/40 text-emerald-100 hover:bg-emerald-800/60',
                      disabled ? 'opacity-40 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    {v}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  /* ---------- FULLSCREEN MOBILE OVERLAY ---------- */

  if (fullscreenMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center px-2 py-2">
        <div className="w-full max-w-md sm:max-w-xl">{cabinetPanel}</div>
      </div>
    )
  }

  /* ---------- NORMAL LAYOUT (DESKTOP + NON-FS MOBILE) ---------- */

  return (
    <div className="mx-auto w-full max-w-5xl rounded-[32px] border border-yellow-500/50 bg-gradient-to-b from-[#020617] via-black to-[#111827] p-4 md:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)] space-y-4">
      {/* HEADER STRIP (hidden in fullscreen mode) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.45em] text-[#fde68a]/80">
            Base Gold Rush Casino
          </div>
          <div className="mt-1 text-xl md:text-3xl font-extrabold text-white">
            Golden Alignment <span className="text-[#facc15]">• Arcade</span>
          </div>
          <div className="text-xs text-white/60 mt-1 max-w-sm">
            Three reels, three rows. Line up matching slices of BGLD coin, gold
            nugget, or the vault across any row to complete the image and get
            paid. Near-miss tease, full-image dopamine.
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

      {/* MAIN: CABINET + RIGHT PANEL */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-[minmax(360px,1.25fr)_minmax(260px,0.75fr)]">
        {/* LEFT: CABINET + STATUS */}
        {cabinetPanel}

        {/* RIGHT: BETTING + PAYTABLE / HOW TO PLAY */}
        <div className="rounded-[24px] border border-emerald-400/40 bg-gradient-to-b from-[#064e3b] via-[#022c22] to-black p-4 md:p-5 text-xs text-white space-y-4">
          {/* Bet selector */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/80">
              Bet Per Spin
            </div>
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {BET_OPTIONS.map(v => {
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
                You&apos;re out of demo credits. Top up from the arcade wallet
                HUD to keep spinning.
              </div>
            )}
          </div>

          {/* Paytable */}
          <div className="rounded-2xl border border-emerald-200/60 bg-black/40 p-3 space-y-2">
            <div className="text-sm font-semibold text-emerald-50">
              Paytable — Golden Alignment (per payline)
            </div>
            <ul className="space-y-1 text-emerald-50/85 text-[11px] sm:text-xs list-disc list-inside">
              <li>
                <span className="font-semibold">BGLD Coin</span> — complete coin
                across a row • pays 12× bet per spin
              </li>
              <li>
                <span className="font-semibold">Vault</span> — complete vault
                door across a row • pays 8×
              </li>
              <li>
                <span className="font-semibold">Gold Nugget</span> — complete
                nugget across a row • pays 5×
              </li>
              <li>Multiple rows can hit at once; all paying lines stack.</li>
            </ul>
            <div className="text-[11px] text-emerald-100/80 pt-1">
              Only perfectly aligned slices (left / center / right) count — no
              partial image credit. Forced-align logic occasionally nudges reels
              into a full image to keep the cabinet feeling hot without being
              reckless.
            </div>
          </div>

          {/* How to play */}
          <div className="rounded-2xl border border-white/12 bg-black/40 p-3 space-y-2">
            <div className="text-sm font-semibold text-white">How To Play</div>
            <ul className="space-y-1 text-white/75 list-disc list-inside">
              <li>Choose your Bet per Spin with the buttons above.</li>
              <li>
                Hit <span className="font-semibold">Spin for Alignment</span> to
                fire all three reels. They spin vertically and settle
                left-to-right like a real slot cabinet.
              </li>
              <li>
                Watch for the full BGLD coin, nugget, or vault image landing
                across any horizontal row — that&apos;s Golden Alignment.
              </li>
              <li>
                This is a demo-only cabinet using BGRC-style credits; mainnet
                BGLD play will wire this exact cabinet into Base contracts.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- REEL COLUMN ---------- */

function ReelColumn({
  side,
  centerIndex,
}: {
  side: ReelSide
  centerIndex: number
}) {
  const N = STRIP_LENGTH
  const topIdx = wrapIndex(centerIndex - 1, N)
  const midIdx = wrapIndex(centerIndex, N)
  const botIdx = wrapIndex(centerIndex + 1, N)

  const order = [topIdx, midIdx, botIdx]

  return (
    <div className="flex flex-col gap-1 sm:gap-1.5 h-[10rem] sm:h-[11.5rem] w-[4.9rem] sm:w-[5.3rem] rounded-2xl bg-black/80 border border-yellow-500/40 shadow-[0_16px_30px_rgba(0,0,0,0.85)] px-0.5 py-1">
      {order.map((idx, row) => {
        const symbol = STRIP_SYMBOLS[idx]
        const src = getSliceSrc(symbol, side)
        return (
          <div
            key={`${idx}-${row}`}
            className="relative flex-1 rounded-md overflow-hidden bg-black"
          >
            <Image
              src={src}
              alt={`${symbol} slice`}
              fill
              className="object-cover"
            />
          </div>
        )
      })}
    </div>
  )
}

/* ---------- MINI STAT ---------- */

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
