'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

/** European wheel numbers in order (same as RouletteArcadeMachine) */
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

function isRed(n: number) {
  return RED_NUMBERS.has(n)
}

type WheelColor = 'RED' | 'BLACK' | 'GREEN'

function getColor(n: number): WheelColor {
  if (n === 0) return 'GREEN'
  return isRed(n) ? 'RED' : 'BLACK'
}

type SideBetType = 'RED' | 'BLACK' | 'ODD' | 'EVEN'

type SpinSummary = {
  wheels: number[]
  net: number
  comboLabel: string | null
  sideBetHit: boolean | null
}

const BET_OPTIONS = [1, 2, 5, 10, 25, 50]

function evalTriWheelCombo(
  wheels: number[],
  stake: number
): { payout: number; multiplier: number; comboLabel: string | null } {
  const [a, b, c] = wheels
  const colors = wheels.map(getColor)
  const allEqual = a === b && b === c
  const anyPair = a === b || a === c || b === c
  const hasZero = wheels.includes(0)

  const nonZeroSorted = wheels.filter(n => n !== 0).sort((x, y) => x - y)
  const isStraightRun =
    nonZeroSorted.length === 3 &&
    new Set(nonZeroSorted).size === 3 &&
    nonZeroSorted[2] - nonZeroSorted[0] === 2

  const allSameColorNonZero =
    !hasZero &&
    colors.every(c => c === 'RED' || c === 'BLACK') &&
    new Set(colors).size === 1

  let multiplier = 0
  let comboLabel: string | null = null

  if (allEqual) {
    multiplier = 50
    comboLabel = 'TRIPLE MATCH JACKPOT'
  } else if (anyPair) {
    multiplier = 8
    comboLabel = 'DOUBLE MATCH'
  } else if (isStraightRun) {
    multiplier = 10
    comboLabel = 'STRAIGHT RUN'
  } else if (allSameColorNonZero) {
    multiplier = 4
    comboLabel = colors[0] === 'RED' ? 'ALL RED' : 'ALL BLACK'
  } else if (hasZero) {
    multiplier = 2
    comboLabel = 'ZERO MAGIC'
  } else {
    multiplier = 0
    comboLabel = null
  }

  const payout = stake * multiplier
  return { payout, multiplier, comboLabel }
}

function evalSideBet(
  sideBet: SideBetType | null,
  centerNumber: number,
  stake: number
): { payout: number; hit: boolean } {
  if (!sideBet || stake <= 0) return { payout: 0, hit: false }
  if (centerNumber === 0) return { payout: 0, hit: false }

  let hit = false
  switch (sideBet) {
    case 'RED':
      hit = isRed(centerNumber)
      break
    case 'BLACK':
      hit = !isRed(centerNumber)
      break
    case 'ODD':
      hit = centerNumber % 2 === 1
      break
    case 'EVEN':
      hit = centerNumber % 2 === 0
      break
  }

  return { payout: hit ? stake * 2 : 0, hit }
}

export default function TriWheelFortuneArcadeMachine() {
  const { credits, initialCredits, recordSpin } = useArcadeWallet()

  const [betPerSpin, setBetPerSpin] = useState(5)
  const [spinning, setSpinning] = useState(false)

  const [wheelAngles, setWheelAngles] = useState<[number, number, number]>([
    0, 0, 0,
  ])
  const [ballAngles, setBallAngles] = useState<[number, number, number]>([
    0, 0, 0,
  ])
  const [spinDurations, setSpinDurations] = useState<[number, number, number]>([
    2600, 2900, 3200,
  ])

  const [results, setResults] = useState<Array<number | null>>([
    null,
    null,
    null,
  ])

  const [status, setStatus] = useState(
    'Pick your bet, optional side bet, and spin all three wheels.'
  )
  const [lastNet, setLastNet] = useState(0)
  const [lastPayout, setLastPayout] = useState(0)
  const [lastCombo, setLastCombo] = useState<string | null>(null)
  const [lastSideBetHit, setLastSideBetHit] = useState<boolean | null>(null)

  const [spinHistory, setSpinHistory] = useState<SpinSummary[]>([])

  const [sideBetType, setSideBetType] = useState<SideBetType | null>(null)
  const [sideBetEnabled, setSideBetEnabled] = useState(false)

  const sessionPnL = useMemo(
    () => credits - initialCredits,
    [credits, initialCredits]
  )

  const canSpin = !spinning && credits > 0 && betPerSpin > 0

  function spin() {
    if (spinning) return

    const stakeMain = Math.max(1, betPerSpin)
    const stakeSide = sideBetEnabled && sideBetType ? stakeMain : 0
    const totalWager = stakeMain + stakeSide

    if (credits <= 0) {
      setStatus('Out of demo credits in your arcade wallet.')
      return
    }
    if (totalWager > credits) {
      setStatus('Not enough demo credits for that bet size.')
      return
    }

    setSpinning(true)
    setStatus('Spinning all three wheels…')
    setLastNet(0)
    setLastPayout(0)
    setLastCombo(null)
    setLastSideBetHit(null)

    const segment = 360 / WHEEL_NUMBERS.length

    const newAngles: [number, number, number] = [...wheelAngles] as any
    const newBallAngles: [number, number, number] = [...ballAngles] as any
    const newResults: number[] = []

    const durations: [number, number, number] = [2600, 2900, 3200]
    setSpinDurations(durations)

    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * WHEEL_NUMBERS.length)
      const n = WHEEL_NUMBERS[idx]
      newResults[i] = n

      const pocketDirection = (idx + 0.5) * segment - 90
      const spinsPerClick = 6
      const newWheelAngle = wheelAngles[i] - spinsPerClick * 360
      const ballOrbits = 4
      const newBallAngle =
        pocketDirection + newWheelAngle + 90 + ballOrbits * 360

      newAngles[i] = newWheelAngle
      newBallAngles[i] = newBallAngle
    }

    setWheelAngles(newAngles)
    setBallAngles(newBallAngles)

    const maxDuration = Math.max(...durations)
    setTimeout(() => {
      const finalResults = newResults as [number, number, number]
      setResults(finalResults)

      const { payout: mainPayout, comboLabel } = evalTriWheelCombo(
        finalResults,
        stakeMain
      )

      const centerNumber = finalResults[1]
      const { payout: sidePayout, hit: sideHit } = evalSideBet(
        sideBetEnabled && sideBetType ? sideBetType : null,
        centerNumber,
        stakeSide
      )

      const totalPayout = mainPayout + sidePayout
      const net = totalPayout - totalWager

      recordSpin({ wager: totalWager, payout: totalPayout })

      setSpinning(false)
      setLastNet(net)
      setLastPayout(totalPayout)
      setLastCombo(comboLabel)
      setLastSideBetHit(stakeSide > 0 ? sideHit : null)

      setSpinHistory(prev => {
        const next: SpinSummary[] = [
          {
            wheels: finalResults,
            net,
            comboLabel,
            sideBetHit: stakeSide > 0 ? sideHit : null,
          },
          ...prev,
        ]
        return next.slice(0, 10)
      })

      let msg = `Results: ${finalResults.join(' • ')}. `
      if (comboLabel && mainPayout > 0) {
        msg += `${comboLabel}! `
      }
      if (stakeSide > 0) {
        msg += sideHit
          ? `Side bet hit on center wheel! `
          : `Side bet missed on center wheel. `
      }
      msg += `Total payout ${totalPayout} credits (net ${
        net >= 0 ? '+' : ''
      }${net}).`
      setStatus(msg)
    }, maxDuration + 250)
  }

  return (
    <div className="mx-auto w-full max-w-5xl rounded-[32px] border border-yellow-500/50 bg-gradient-to-b from-[#020617] via-black to-[#111827] p-4 md:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)] space-y-4">
      {/* HEADER STRIP */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.45em] text-[#fde68a]/80">
            Base Gold Rush Casino
          </div>
          <div className="mt-1 text-xl md:text-3xl font-extrabold text-white">
            Tri-Wheel Fortune <span className="text-[#facc15]">• Arcade</span>
          </div>
          <div className="text-xs text-white/60 mt-1 max-w-sm">
            Three mini roulette wheels spin together. One main bet on the
            combo, plus an optional side bet on the center wheel (red/black
            or odd/even).
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

      {/* MAIN: CABINET + CONTROLS */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-[minmax(380px,1.3fr)_minmax(260px,0.7fr)]">
        {/* LEFT: CABINET + WHEELS + STATUS */}
        <div className="rounded-[24px] border border-white/12 bg-gradient-to-b from-black/40 via-[#020617] to-black p-1.5 sm:p-2 space-y-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <div className="uppercase tracking-[0.3em] text-white/60">
              Cabinet View
            </div>
            <div className="text-white/50">3 roulette wheels • fast spins</div>
          </div>

          {/* CABINET + WHEELS + OVERLAYS */}
          <div className="relative mx-auto w-full max-w-[620px] sm:max-w-[700px] aspect-[3/4]">
            {/* Cabinet PNG */}
            <Image
              src="/images/slots/tri-wheel-cabinet.png"
              alt="Tri-Wheel Cabinet"
              fill
              className="object-contain select-none pointer-events-none"
            />

            {/* WINNING NUMBERS — BIG + AT TOP OF CABINET */}
            <div className="absolute inset-x-[10%] top-[30%] flex flex-col items-center text-[11px]">
              <div className="rounded-full bg-black/75 border border-yellow-300/80 px-3 py-1.5 shadow-[0_0_18px_rgba(250,204,21,0.7)] flex items-center gap-2">
                <span className="hidden sm:inline text-[10px] uppercase tracking-[0.25em] text-yellow-100/80">
                  Results
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {results.map((n, idx) => {
                    if (n === null) {
                      return (
                        <span
                          key={idx}
                          className="inline-flex h-7 sm:h-8 min-w-[2.25rem] items-center justify-center rounded-full border border-slate-500/70 bg-black/80 text-[12px] sm:text-sm text-slate-200"
                        >
                          —
                        </span>
                      )
                    }
                    const col = getColor(n)
                    const colorClass =
                      col === 'GREEN'
                        ? 'bg-emerald-600/90 border-emerald-300'
                        : col === 'RED'
                        ? 'bg-red-700/90 border-red-300'
                        : 'bg-slate-700/90 border-slate-300'
                    return (
                      <span
                        key={idx}
                        className={`inline-flex h-7 sm:h-8 min-w-[2.25rem] items-center justify-center rounded-full border text-[12px] sm:text-sm font-bold tabular-nums text-slate-50 ${colorClass}`}
                      >
                        {n}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 3 mini wheels – placed where you liked them */}
            <div className="absolute inset-x-0 top-[39%] mx-auto flex justify-center gap-2 sm:gap-3 px-2">
              {[0, 1, 2].map(i => (
                <MiniRouletteWheel
                  key={i}
                  angle={wheelAngles[i]}
                  ballAngle={ballAngles[i]}
                  spinning={spinning}
                  durationMs={spinDurations[i]}
                />
              ))}
            </div>

            {/* SPIN BUTTON OVERLAYED ON CABINET */}
            <button
              onClick={spin}
              disabled={!canSpin}
              className="absolute inset-x-0 bottom-[31%] mx-auto w-[60%] max-w-xs h-10 sm:h-11 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 text-black text-xs sm:text-sm font-extrabold tracking-[0.3em] uppercase shadow-[0_0_25px_rgba(250,204,21,0.9)] hover:from-yellow-300 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {spinning
                ? 'Spinning…'
                : credits <= 0
                ? 'No Demo Credits'
                : betPerSpin > credits
                ? 'Lower Bet'
                : 'Spin All Three'}
            </button>
          </div>

          {/* STATUS + EXPLAINER UNDER CABINET */}
          <div className="space-y-1 mt-2">
            <div className="text-[10px] text-emerald-100/80 text-center">
              Uses your arcade demo wallet. Main bet pays combo hits; side bet
              pays on the center wheel only.
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
                  {lastCombo && (
                    <div className="text-[11px] text-emerald-100/80">
                      Combo:{' '}
                      <span className="font-semibold">
                        {lastCombo}
                      </span>
                    </div>
                  )}
                  {lastSideBetHit !== null && (
                    <div className="text-[11px] text-emerald-100/80">
                      Side bet:{' '}
                      <span className="font-semibold">
                        {lastSideBetHit ? 'HIT' : 'MISS'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="uppercase tracking-[0.16em] text-white/50">
                    Spin History
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {spinHistory.length === 0 && (
                      <span className="text-[11px] text-white/40">
                        Spin to build history.
                      </span>
                    )}
                    {spinHistory.map((h, i) => (
                      <span
                        key={i}
                        className={[
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border',
                          h.net > 0
                            ? 'border-emerald-300 text-emerald-200 bg-emerald-900/40'
                            : h.net < 0
                            ? 'border-rose-300 text-rose-200 bg-rose-900/40'
                            : 'border-slate-300 text-slate-100 bg-slate-800/40',
                        ].join(' ')}
                      >
                        {h.wheels.join('-')} · {h.comboLabel ?? '—'} ·{' '}
                        {h.net > 0 ? '+' : ''}
                        {h.net}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: BETTING + PAYTABLE */}
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
                You&apos;re out of demo credits. Top up from the arcade
                wallet HUD to keep spinning.
              </div>
            )}
          </div>

          {/* Side bet selector */}
          <div className="rounded-2xl border border-emerald-200/60 bg-black/35 p-3 space-y-2">
            <div className="flex items-center justify_between gap-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/80">
                Side Bet — Center Wheel
              </div>
              <button
                type="button"
                onClick={() => setSideBetEnabled(v => !v)}
                className={[
                  'text-[10px] px-2 py-1 rounded-full border',
                  sideBetEnabled
                    ? 'border-yellow-300 bg-yellow-400/20 text-yellow-100'
                    : 'border-slate-400/70 bg-slate-900/60 text-slate-200',
                ].join(' ')}
              >
                {sideBetEnabled ? 'On' : 'Off'}
              </button>
            </div>
            <div className="mt-1 grid grid-cols-4 gap-1.5">
              {(['RED', 'BLACK', 'ODD', 'EVEN'] as SideBetType[]).map(opt => {
                const active = sideBetType === opt && sideBetEnabled
                const colorClass =
                  opt === 'RED'
                    ? 'bg-red-700/80 border-red-300/80'
                    : opt === 'BLACK'
                    ? 'bg-black/80 border-slate-300/80'
                    : 'bg-emerald-900/80 border-emerald-300/80'
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSideBetType(opt)}
                    className={[
                      'rounded-full px-2 py-1 text-[10px] font-semibold border text-center',
                      colorClass,
                      active
                        ? 'ring-2 ring-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.9)]'
                        : 'hover:bg-emerald-800/70',
                    ].join(' ')}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            <div className="text-[11px] text-emerald-100/80">
              Side bet uses the same stake as Bet per Spin and pays 2× total
              (1:1 net) when correct. 0 always loses the side bet.
            </div>
          </div>

          {/* Combo paytable */}
          <div className="rounded-2xl border border-emerald-200/60 bg-black/40 p-3 space-y-2">
            <div className="text-sm font-semibold text-emerald-50">
              Combo Paytable — Main Bet
            </div>
            <ul className="space-y-1 text-emerald-50/85 text-[11px] sm:text-xs list-disc list-inside">
              <li>TRIPLE MATCH JACKPOT • all three same number • pays 50×</li>
              <li>DOUBLE MATCH • any two same number • pays 8×</li>
              <li>STRAIGHT RUN • three in a row (e.g. 7-8-9) • pays 10×</li>
              <li>ALL RED / ALL BLACK • three non-zero, same color • pays 4×</li>
              <li>ZERO MAGIC • any wheel hits 0 • pays 2×</li>
            </ul>
            <div className="text-[11px] text-emerald-100/80 pt-1">
              Only the highest combo per spin pays (no stacking). On-chain
              versions can add extra side bets for specific patterns.
            </div>
          </div>

          {/* How to play */}
          <div className="rounded-2xl border border-white/12 bg-black/40 p-3 space-y-2">
            <div className="text-sm font-semibold text-white">
              How To Play
            </div>
            <ul className="space-y-1 text-white/75 list-disc list-inside">
              <li>Choose your Bet per Spin and optional side bet.</li>
              <li>
                Hit <span className="font-semibold">Spin All Three</span> to
                fire all wheels at once; they settle left to right.
              </li>
              <li>
                Main bet pays based on tri-wheel combos. Side bet pays only on
                the center wheel.
              </li>
              <li>
                Your arcade wallet tracks wins/losses across all Base Gold Rush
                demo games.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- MINI ROULETTE WHEEL (SVG) ---------- */

function MiniRouletteWheel({
  angle,
  ballAngle,
  spinning,
  durationMs,
}: {
  angle: number
  ballAngle: number
  spinning: boolean
  durationMs: number
}) {
  const seg = 360 / WHEEL_NUMBERS.length
  const durationSec = durationMs / 1000

  const transition = spinning
    ? `transform ${durationSec}s cubic-bezier(.18,.7,.26,1.05)`
    : undefined

  return (
    <div className="relative h-24 w-24 sm:h-28 sm:w-28">
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full drop-shadow-[0_14px_32px_rgba(0,0,0,0.8)]"
      >
        <g
          style={{
            transformOrigin: '50% 50%',
            transform: `rotate(${angle}deg)`,
            transition,
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

        <g
          style={{
            transformOrigin: '50% 50%',
            transform: `rotate(${ballAngle}deg)`,
            transition,
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
