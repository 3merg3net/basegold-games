'use client'

import { useEffect, useMemo, useState } from 'react'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

/** European wheel numbers in order */
const WHEEL_NUMBERS = [
  0,
  32,
  15,
  19,
  4,
  21,
  2,
  25,
  17,
  34,
  6,
  27,
  13,
  36,
  11,
  30,
  8,
  23,
  10,
  5,
  24,
  16,
  33,
  1,
  20,
  14,
  31,
  9,
  22,
  18,
  29,
  7,
  28,
  12,
  35,
  3,
  26,
]

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

type BetType =
  | 'STRAIGHT'
  | 'RED'
  | 'BLACK'
  | 'ODD'
  | 'EVEN'
  | 'LOW'
  | 'HIGH'
  | 'DOZEN1'
  | 'DOZEN2'
  | 'DOZEN3'
  | 'COL1'
  | 'COL2'
  | 'COL3'

type Bet = {
  type: BetType
  amount: number
  /** For STRAIGHT bets */
  number?: number
}

function isRed(n: number) {
  return RED_NUMBERS.has(n)
}

function isInDozen(n: number, dozen: 1 | 2 | 3) {
  if (n === 0) return false
  if (dozen === 1) return n >= 1 && n <= 12
  if (dozen === 2) return n >= 13 && n <= 24
  return n >= 25 && n <= 36
}

function isInColumn(n: number, column: 1 | 2 | 3) {
  if (n === 0) return false
  // Column 1: 1,4,7,... ; Column 2: 2,5,8,... ; Column 3: 3,6,9,...
  const mod = n % 3
  if (column === 1) return mod === 1
  if (column === 2) return mod === 2
  return mod === 0
}

/**
 * Returns total payout multiplier (including returning stake).
 * - Straight 35:1 → 36x total
 * - Dozen/Column 2:1 → 3x total
 * - Even money 1:1 → 2x total
 */
function getPayoutMultiplier(bet: Bet, result: number): number {
  switch (bet.type) {
    case 'STRAIGHT': {
      if (bet.number === result) return 36
      return 0
    }
    case 'RED':
      if (result !== 0 && isRed(result)) return 2
      return 0
    case 'BLACK':
      if (result !== 0 && !isRed(result)) return 2
      return 0
    case 'ODD':
      if (result !== 0 && result % 2 === 1) return 2
      return 0
    case 'EVEN':
      if (result !== 0 && result % 2 === 0) return 2
      return 0
    case 'LOW':
      if (result >= 1 && result <= 18) return 2
      return 0
    case 'HIGH':
      if (result >= 19 && result <= 36) return 2
      return 0
    case 'DOZEN1':
      return isInDozen(result, 1) ? 3 : 0
    case 'DOZEN2':
      return isInDozen(result, 2) ? 3 : 0
    case 'DOZEN3':
      return isInDozen(result, 3) ? 3 : 0
    case 'COL1':
      return isInColumn(result, 1) ? 3 : 0
    case 'COL2':
      return isInColumn(result, 2) ? 3 : 0
    case 'COL3':
      return isInColumn(result, 3) ? 3 : 0
    default:
      return 0
  }
}

export default function RouletteArcadeMachine() {
  const { credits, initialCredits, recordSpin } = useArcadeWallet()

  const [bets, setBets] = useState<Bet[]>([])
  const [currentChip, setCurrentChip] = useState(5)

  const [spinning, setSpinning] = useState(false)
  const [angle, setAngle] = useState(0)
  const [ballAngle, setBallAngle] = useState(0)
  const [resultNumber, setResultNumber] = useState<number | null>(null)
  const [status, setStatus] = useState('Place your bets and tap Spin.')
  const [lastWin, setLastWin] = useState(0)
  const [lastResultColor, setLastResultColor] = useState<
    'RED' | 'BLACK' | 'GREEN' | null
  >(null)
  const [history, setHistory] = useState<number[]>([])

  const totalBet = useMemo(
    () => bets.reduce((sum, b) => sum + b.amount, 0),
    [bets]
  )

  const sessionPnL = useMemo(
    () => credits - initialCredits,
    [credits, initialCredits]
  )

  const addBet = (bet: Omit<Bet, 'amount'>) => {
    if (spinning) return
    if (currentChip <= 0) return

    setBets(prev => {
      // STRAIGHT: merge on same number
      if (bet.type === 'STRAIGHT') {
        const idx = prev.findIndex(
          b => b.type === 'STRAIGHT' && b.number === bet.number
        )
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = {
            ...next[idx],
            amount: next[idx].amount + currentChip,
          }
          return next
        }
        return [...prev, { ...bet, amount: currentChip }]
      }

      // outside bets: merge by type
      const idx = prev.findIndex(b => b.type === bet.type)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = {
          ...next[idx],
          amount: next[idx].amount + currentChip,
        }
        return next
      }

      return [...prev, { ...bet, amount: currentChip }]
    })
  }

  const clearBets = () => {
    if (spinning) return
    setBets([])
    setStatus('Bets cleared. Place new bets.')
    setLastWin(0)
  }

  const spin = () => {
    if (spinning) return
    if (totalBet <= 0) {
      setStatus('No bets placed. Tap the board to add chips.')
      return
    }
    if (totalBet > credits) {
      setStatus('Not enough demo credits for that total bet.')
      return
    }

    setStatus('Spinning… Good luck!')
    setSpinning(true)

    // random result
    const idx = Math.floor(Math.random() * WHEEL_NUMBERS.length)
    const n = WHEEL_NUMBERS[idx]

    const segment = 360 / WHEEL_NUMBERS.length
    const centerOffset = segment / 2
    const targetAngle = idx * segment + centerOffset
    const totalRotation = 5 * 360 + targetAngle

    // wheel + ball animation
    requestAnimationFrame(() => {
      setAngle(-totalRotation)
      setBallAngle(prev => prev + 720)
    })

    setTimeout(() => {
      // compute payouts
      let totalPayout = 0
      for (const b of bets) {
        const mul = getPayoutMultiplier(b, n)
        if (mul > 0) {
          totalPayout += b.amount * mul
        }
      }

      // update global demo wallet
      recordSpin({ wager: totalBet, payout: totalPayout })

      const net = totalPayout - totalBet
      setLastWin(net)
      setResultNumber(n)
      setLastResultColor(
        n === 0 ? 'GREEN' : isRed(n) ? 'RED' : 'BLACK'
      )

      setHistory(prev => {
        const next = [n, ...prev]
        return next.slice(0, 12)
      })

      if (net > 0) {
        setStatus(
          `Hit ${n}! You won ${totalPayout} credits (net +${net}).`
        )
      } else if (net === 0) {
        setStatus(`Hit ${n}. You broke even on that spin.`)
      } else {
        setStatus(`Hit ${n}. Net ${net} this spin.`)
      }

      setSpinning(false)
      // keep bets if you want "repeat"
      // setBets([])
    }, 3200)
  }

  const resetTable = () => {
    if (spinning) return
    setHistory([])
    setLastWin(0)
    setResultNumber(null)
    setLastResultColor(null)
    setStatus('Table cleared. Demo credits unchanged.')
    setBets([])
  }

  const getStraightBetFor = (num: number) =>
    bets.find(b => b.type === 'STRAIGHT' && b.number === num)

  return (
    <div className="mx-auto w-full max-w-5xl rounded-[32px] border border-yellow-500/50 bg-gradient-to-b from-[#020617] via-black to-[#111827] p-4 md:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)] space-y-4">
      {/* TOP: TITLE + DEMO STRIP */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.45em] text-[#fde68a]/80">
            Base Gold Rush Casino
          </div>
          <div className="mt-1 text-xl md:text-3xl font-extrabold text-white">
            Golden Wheel Roulette <span className="text-[#facc15]">• Arcade</span>
          </div>
          <div className="text-xs text-white/60 mt-1 max-w-sm">
            European wheel. Free demo credits only. Same multipliers you&apos;ll see
            on the on-chain roulette table.
          </div>
        </div>
        <div className="flex flex-col items-stretch md:items-end gap-2 text-xs md:text-sm w-full md:w-auto">
          <div className="rounded-xl border border-white/15 bg-black/60 px-4 py-2 flex items-center justify-between md:justify-end gap-4">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
              Demo Credits
            </div>
            <div className="text-2xl font-black text-[#fbbf24] tabular-nums">
              {credits.toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
            <MiniStat label="Total Bet" value={totalBet} />
            <MiniStat label="Last Net" value={lastWin} colored />
            <MiniStat label="Session P&L" value={sessionPnL} colored />
          </div>
        </div>
      </div>

      {/* MAIN: WHEEL LEFT, BOARD RIGHT (STACK ON MOBILE) */}
      <div className="grid gap-5 lg:grid-cols-[minmax(320px,1.05fr)_minmax(260px,0.95fr)]">
        {/* LEFT: WHEEL + STATUS */}
        <div className="rounded-[24px] border border-white/12 bg-gradient-to-b from-black/40 via-[#020617] to-black p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <div className="uppercase tracking-[0.3em] text-white/60">
              Golden Wheel Display
            </div>
            <div className="text-white/50">
              Demo arcade • RNG local
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative w-full max-w-[320px] sm:max-w-[360px] aspect-square">
              <div className="absolute inset-0 rounded-full bg-[#020617] flex items-center justify-center">
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full drop-shadow-[0_14px_32px_rgba(0,0,0,0.8)]"
                >
                  {/* WHEEL GROUP */}
                  <g
                    style={{
                      transformOrigin: '50% 50%',
                      transform: `rotate(${angle}deg)`,
                      transition: spinning
                        ? 'transform 3.2s cubic-bezier(.18,.7,.26,1.05)'
                        : undefined,
                    }}
                  >
                    <circle
                      cx="100"
                      cy="100"
                      r="98"
                      fill="#050509"
                      stroke="#1f2937"
                      strokeWidth="3"
                    />

                    {WHEEL_NUMBERS.map((num, i) => {
                      const seg = 360 / WHEEL_NUMBERS.length
                      const a0 = (i * seg - 90) * (Math.PI / 180)
                      const a1 = ((i + 1) * seg - 90) * (Math.PI / 180)
                      const x0 = 100 + 98 * Math.cos(a0)
                      const y0 = 100 + 98 * Math.sin(a0)
                      const x1 = 100 + 98 * Math.cos(a1)
                      const y1 = 100 + 98 * Math.sin(a1)
                      const isZero = num === 0
                      const fill = isZero
                        ? '#047857'
                        : isRed(num)
                        ? '#b91c1c'
                        : '#020617'
                      const textColor = isZero ? '#ecfdf3' : '#f9fafb'
                      const largeArc = seg > 180 ? 1 : 0
                      return (
                        <g key={i}>
                          <path
                            d={`M100,100 L${x0},${y0} A98,98 0 ${largeArc} 1 ${x1},${y1} Z`}
                            fill={fill}
                            stroke="#020617"
                            strokeWidth="1.1"
                          />
                          <text
                            x="100"
                            y="100"
                            transform={`rotate(${
                              i * seg + seg / 2
                            } 100 100) translate(0 -80)`}
                            textAnchor="middle"
                            fontSize="9"
                            fill={textColor}
                            fontWeight={700}
                          >
                            {num}
                          </text>
                        </g>
                      )
                    })}

                    <circle
                      cx="100"
                      cy="100"
                      r="70"
                      fill="#020617"
                      stroke="#334155"
                      strokeWidth="2"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="20"
                      fill="#020617"
                      stroke="#facc15"
                      strokeWidth="2"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="7"
                      fill="#fbbf24"
                      stroke="#fef3c7"
                      strokeWidth="1"
                    />
                  </g>

                  {/* BALL */}
                  <g
                    style={{
                      transformOrigin: '50% 50%',
                      transform: `rotate(${ballAngle}deg)`,
                      transition: spinning
                        ? 'transform 3.2s cubic-bezier(.18,.7,.26,1.05)'
                        : undefined,
                    }}
                  >
                    <circle
                      cx="100"
                      cy="32"
                      r="5.5"
                      fill="#f9fafb"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  </g>
                </svg>
              </div>
            </div>
          </div>

          {/* STATUS & LAST RESULT */}
          <div className="rounded-xl border border-white/10 bg-black/50 p-3 text-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                Spin Status
              </div>
              {resultNumber !== null && (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-white/60 uppercase tracking-wide">
                    Last Hit
                  </span>
                  <span
                    className={[
                      'inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-full border px-2 text-sm font-bold tabular-nums',
                      lastResultColor === 'GREEN'
                        ? 'border-emerald-400 text-emerald-200'
                        : lastResultColor === 'RED'
                        ? 'border-red-500 bg-red-600/20 text-red-200'
                        : 'border-slate-400 bg-slate-700/40 text-slate-100',
                    ].join(' ')}
                  >
                    {resultNumber}
                  </span>
                </div>
              )}
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
                    lastWin > 0
                      ? 'text-emerald-400 text-lg font-bold'
                      : lastWin < 0
                      ? 'text-rose-400 text-lg font-bold'
                      : 'text-slate-200 text-lg font-bold'
                  }
                >
                  {lastWin > 0 ? '+' : ''}
                  {lastWin.toLocaleString()}
                </div>
              </div>
              <div className="flex-1">
                <div className="uppercase tracking-[0.16em] text-white/50">
                  Recent Numbers
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {history.map((n, i) => {
                    const c =
                      n === 0
                        ? 'bg-emerald-600/70 border-emerald-300'
                        : isRed(n)
                        ? 'bg-red-700/80 border-red-300'
                        : 'bg-slate-700/80 border-slate-300'
                    return (
                      <span
                        key={i}
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold text-slate-50 ${c}`}
                      >
                        {n}
                      </span>
                    )
                  })}
                  {history.length === 0 && (
                    <span className="text-[11px] text-white/40">
                      Spin to build history.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: BETTING BOARD / CHIPS */}
        <div className="rounded-[24px] border border-emerald-400/40 bg-gradient-to-b from-[#064e3b] via-[#022c22] to-black p-4 md:p-5 text-xs text-white space-y-3">
          {/* Chip selector + controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/80">
                Chip Value
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {[1, 5, 10, 25, 100].map(v => {
                  const active = v === currentChip
                  return (
                    <button
                      key={v}
                      onClick={() => setCurrentChip(v)}
                      className={[
                        'rounded-full px-3 py-1.5 text-[11px] font-semibold border shadow-sm',
                        active
                          ? 'border-yellow-300 bg-yellow-400/20 text-yellow-100 shadow-[0_0_12px_rgba(250,204,21,0.7)]'
                          : 'border-emerald-200/60 bg-emerald-900/40 text-emerald-100 hover:bg-emerald-800/60',
                      ].join(' ')}
                    >
                      {v}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1">
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/80">
                Table Controls
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={clearBets}
                  disabled={spinning || bets.length === 0}
                  className="rounded-full border border-emerald-200/60 bg-black/30 px-3 py-1.5 text-[11px] hover:bg-emerald-900/60 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear Bets
                </button>
                <button
                  onClick={resetTable}
                  disabled={spinning}
                  className="rounded-full border border-yellow-300/60 bg-black/30 px-3 py-1.5 text-[11px] hover:bg-yellow-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reset Table
                </button>
              </div>
            </div>
          </div>

          {/* OUTSIDE BETS */}
          <div className="grid grid-cols-2 gap-2">
            <BetPill
              label="1 to 18"
              subtitle="1:1"
              active={!!bets.find(b => b.type === 'LOW')}
              onClick={() => addBet({ type: 'LOW' })}
            />
            <BetPill
              label="19 to 36"
              subtitle="1:1"
              active={!!bets.find(b => b.type === 'HIGH')}
              onClick={() => addBet({ type: 'HIGH' })}
            />
            <BetPill
              label="EVEN"
              subtitle="1:1"
              active={!!bets.find(b => b.type === 'EVEN')}
              onClick={() => addBet({ type: 'EVEN' })}
            />
            <BetPill
              label="ODD"
              subtitle="1:1"
              active={!!bets.find(b => b.type === 'ODD')}
              onClick={() => addBet({ type: 'ODD' })}
            />
            <BetPill
              label="RED"
              subtitle="1:1"
              color="red"
              active={!!bets.find(b => b.type === 'RED')}
              onClick={() => addBet({ type: 'RED' })}
            />
            <BetPill
              label="BLACK"
              subtitle="1:1"
              color="black"
              active={!!bets.find(b => b.type === 'BLACK')}
              onClick={() => addBet({ type: 'BLACK' })}
            />
          </div>

          {/* NUMBER GRID + DOZENS/COLUMNS */}
          <div className="rounded-2xl border border-emerald-200/50 bg-black/30 p-3 space-y-2">
            {/* Zero row */}
            <div className="flex">
              <button
                onClick={() => addBet({ type: 'STRAIGHT', number: 0 })}
                className="flex-1 rounded-xl bg-emerald-700/80 border border-emerald-300/80 py-1.5 text-center text-xs font-semibold shadow-[0_0_12px_rgba(16,185,129,0.7)]"
              >
                0
                {getStraightBetFor(0) && (
                  <span className="block text-[10px] text-emerald-50 mt-0.5">
                    {getStraightBetFor(0)?.amount}
                  </span>
                )}
              </button>
            </div>

            {/* 1–36 grid (3 columns) */}
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 36 }, (_, i) => i + 1).map(n => {
                const straight = getStraightBetFor(n)
                const isRedNum = isRed(n)
                return (
                  <button
                    key={n}
                    onClick={() =>
                      addBet({ type: 'STRAIGHT', number: n })
                    }
                    className={[
                      'relative h-9 sm:h-10 rounded-md border text-[11px] font-semibold flex flex-col items-center justify-center',
                      isRedNum
                        ? 'bg-red-700/80 border-red-300/80'
                        : 'bg-slate-800/80 border-slate-300/80',
                    ].join(' ')}
                  >
                    <span className="leading-none">{n}</span>
                    {straight && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400/90 text-[10px] px-2 py-0.5 text-black font-bold shadow-sm">
                        {straight.amount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Dozens */}
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              <DozenButton
                label="1st 12"
                range="1–12"
                active={!!bets.find(b => b.type === 'DOZEN1')}
                onClick={() => addBet({ type: 'DOZEN1' })}
              />
              <DozenButton
                label="2nd 12"
                range="13–24"
                active={!!bets.find(b => b.type === 'DOZEN2')}
                onClick={() => addBet({ type: 'DOZEN2' })}
              />
              <DozenButton
                label="3rd 12"
                range="25–36"
                active={!!bets.find(b => b.type === 'DOZEN3')}
                onClick={() => addBet({ type: 'DOZEN3' })}
              />
            </div>

            {/* Columns */}
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              <ColumnButton
                label="2 to 1"
                sub="Col 1"
                active={!!bets.find(b => b.type === 'COL1')}
                onClick={() => addBet({ type: 'COL1' })}
              />
              <ColumnButton
                label="2 to 1"
                sub="Col 2"
                active={!!bets.find(b => b.type === 'COL2')}
                onClick={() => addBet({ type: 'COL2' })}
              />
              <ColumnButton
                label="2 to 1"
                sub="Col 3"
                active={!!bets.find(b => b.type === 'COL3')}
                onClick={() => addBet({ type: 'COL3' })}
              />
            </div>
          </div>

          {/* SPIN BUTTON */}
          <div className="pt-1">
            <button
              onClick={spin}
              disabled={spinning}
              className="w-full h-11 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 text-black text-sm font-extrabold tracking-[0.3em] uppercase shadow-[0_0_25px_rgba(250,204,21,0.9)] hover:from-yellow-300 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {spinning
                ? 'Spinning…'
                : totalBet > 0
                ? 'Spin Wheel'
                : 'Place Bet & Spin'}
            </button>
            <div className="mt-1 text-[10px] text-emerald-100/80 text-center">
              Demo arcade only – no real BGLD used. On-chain roulette
              games will be wired up on a separate page.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ----- SMALL UI HELPERS ----- */

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

function BetPill({
  label,
  subtitle,
  active,
  onClick,
  color,
}: {
  label: string
  subtitle: string
  active: boolean
  onClick: () => void
  color?: 'red' | 'black'
}) {
  const base =
    color === 'red'
      ? 'bg-red-700/80 border-red-300/80'
      : color === 'black'
      ? 'bg-black/70 border-slate-300/80'
      : 'bg-emerald-900/60 border-emerald-300/80'
  const activeStyles =
    'ring-2 ring-yellow-300 ring-offset-2 ring-offset-emerald-900 shadow-[0_0_14px_rgba(250,204,21,0.9)]'
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center justify-between rounded-xl px-3 py-2 text-[11px] font-semibold border',
        base,
        active ? activeStyles : 'hover:bg-emerald-800/70',
      ].join(' ')}
    >
      <span>{label}</span>
      <span className="text-[10px] text-emerald-100/80">
        {subtitle}
      </span>
    </button>
  )
}

function DozenButton({
  label,
  range,
  active,
  onClick,
}: {
  label: string
  range: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex flex-col items-center justify-center rounded-lg border border-emerald-200/70 bg-emerald-900/60 px-2 py-1.5',
        active
          ? 'ring-2 ring-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.9)]'
          : 'hover:bg-emerald-800/80',
      ].join(' ')}
    >
      <span className="text-[11px] font-semibold">{label}</span>
      <span className="text-[10px] text-emerald-100/80">{range}</span>
      <span className="text-[9px] text-emerald-200/80 mt-0.5">
        2:1
      </span>
    </button>
  )
}

function ColumnButton({
  label,
  sub,
  active,
  onClick,
}: {
  label: string
  sub: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex flex-col items-center justify-center rounded-lg border border-emerald-200/70 bg-emerald-900/60 px-2 py-1.5',
        active
          ? 'ring-2 ring-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.9)]'
          : 'hover:bg-emerald-800/80',
      ].join(' ')}
    >
      <span className="text-[11px] font-semibold">{label}</span>
      <span className="text-[10px] text-emerald-100/80">{sub}</span>
      <span className="text-[9px] text-emerald-200/80 mt-0.5">
        2:1
      </span>
    </button>
  )
}
