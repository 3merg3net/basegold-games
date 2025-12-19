'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

/* ---------- ASSET PATHS (swap to your real filenames) ---------- */

const ASSET_BG = '/images/slots/goldpan/cabinet-bg.png'
const ASSET_CABINET = '/images/slots/goldpan/cabinet-frame.png' // your “cabinet png”
const ASSET_HUD = '/images/slots/goldpan/hud-panel.png' // optional; can be blank/placeholder

/* ---------- SYMBOLS + STRIPS ---------- */

type SymbolId = 'BGLD' | 'NUGGET' | 'VAULT' | 'PAN' // PAN = wheel trigger
type ReelSide = 'LEFT' | 'CENTER' | 'RIGHT'

const BASE_STRIP: SymbolId[] = [
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

// Only RIGHT reel can land PAN (keeps math simple and matches your ask)
const RIGHT_STRIP: SymbolId[] = [
  ...BASE_STRIP,
  'PAN', // add 1 PAN entry → ~1 / 13 chance on the right reel (tune later)
]

function getSymbolSrc(symbol: SymbolId): string {
  switch (symbol) {
    case 'BGLD':
      return `/images/slots/goldpan/sym-bgld.png`
    case 'NUGGET':
      return `/images/slots/goldpan/sym-nugget.png`
    case 'VAULT':
      return `/images/slots/goldpan/sym-vault.png`
    case 'PAN':
      return `/images/slots/goldpan/sym-goldpan.png`
  }
}

/* ---------- PAYTABLE & HELPERS ---------- */

const PAYTABLE: Record<Exclude<SymbolId, 'PAN'>, number> = {
  BGLD: 12,
  VAULT: 8,
  NUGGET: 5,
}

// PAN doesn’t pay by itself; it triggers wheel
const FORCED_ALIGN_CHANCE = 0.12

const SPIN_TICK_MS = 55
const FIRST_REEL_SPIN_MS = 1100
const REEL_STAGGER_MS = 260

function wrapIndex(i: number, n: number) {
  return ((i % n) + n) % n
}

type LineResult = {
  payout: number
  symbol: Exclude<SymbolId, 'PAN'> | null
}

function evalLine(symbols: SymbolId[], stake: number): LineResult {
  if (symbols.length !== 3) return { payout: 0, symbol: null }
  const [a, b, c] = symbols

  // Ignore PAN in paylines (wheel trigger only)
  if (a === 'PAN' || b === 'PAN' || c === 'PAN') return { payout: 0, symbol: null }

  if (a === b && b === c) {
    const mul = PAYTABLE[a] ?? 0
    return { payout: mul * stake, symbol: a }
  }
  return { payout: 0, symbol: null }
}

/* ---------- WHEEL ---------- */

type WheelSlice = { id: 'X2' | 'X3' | 'X5' | 'PLUS10' | 'PLUS25' | 'JACKPOT'; weight: number }

const WHEEL: WheelSlice[] = [
  { id: 'X2', weight: 36 },
  { id: 'X3', weight: 26 },
  { id: 'X5', weight: 14 },
  { id: 'PLUS10', weight: 14 },
  { id: 'PLUS25', weight: 8 },
  { id: 'JACKPOT', weight: 2 },
]

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, it) => s + it.weight, 0)
  let r = Math.random() * total
  for (const it of items) {
    r -= it.weight
    if (r <= 0) return it
  }
  return items[items.length - 1]
}

/* ---------- MAIN COMPONENT ---------- */

const BET_OPTIONS = [1, 2, 5, 10, 25, 50]

export default function GoldPanWheelSlot() {
  const { credits, initialCredits, recordSpin } = useArcadeWallet()

  // reelCenters: index that appears on the MIDDLE row
  const [reelCenters, setReelCenters] = useState<number[]>([0, 4, 8])

  const [betPerSpin, setBetPerSpin] = useState(5)
  const [spinning, setSpinning] = useState(false)

  const [status, setStatus] = useState(
    'Spin the reels. Align BGLD, Nugget, or Vault across any row to get paid. Land the Gold Pan on the last reel center to spin the wheel.'
  )
  const [lastNet, setLastNet] = useState(0)
  const [lastPayout, setLastPayout] = useState(0)
  const [lastMainSymbol, setLastMainSymbol] = useState<Exclude<SymbolId, 'PAN'> | null>(null)
  const [lastLinesHit, setLastLinesHit] = useState(0)
  const [lastWheelBonus, setLastWheelBonus] = useState(0)

  // Wheel UI state
  const [wheelSpinning, setWheelSpinning] = useState(false)
  const [wheelResult, setWheelResult] = useState<WheelSlice['id'] | null>(null)
  const [wheelRotation, setWheelRotation] = useState(0)

  const sessionPnL = useMemo(() => credits - initialCredits, [credits, initialCredits])

  const reelIntervals = useRef<Array<ReturnType<typeof setInterval> | null>>([null, null, null])

  const [fullscreenMobile, setFullscreenMobile] = useState(false)

  useEffect(() => {
    return () => {
      reelIntervals.current.forEach(id => id && clearInterval(id))
    }
  }, [])

  const canSpin = !spinning && credits > 0 && betPerSpin > 0 && !wheelSpinning

  function spinWheelThenFinalize(args: {
    stake: number
    basePayout: number
    baseNet: number
    linesHit: number
    mainSymbol: Exclude<SymbolId, 'PAN'> | null
  }) {
    const { stake, basePayout, baseNet, linesHit, mainSymbol } = args

    // Pick wheel slice
    const slice = pickWeighted(WHEEL)
    setWheelResult(slice.id)
    setWheelSpinning(true)

    // Visual spin: rotate to a “landing” angle (simple, good enough)
    const extraSpins = 4 + Math.floor(Math.random() * 3) // 4–6 full spins
    const landing = Math.floor(Math.random() * 360)
    const nextRot = wheelRotation + extraSpins * 360 + landing
    setWheelRotation(nextRot)

    // Compute bonus payout
    let bonus = 0
    if (slice.id === 'X2') bonus = basePayout // doubles the payout
    if (slice.id === 'X3') bonus = basePayout * 2
    if (slice.id === 'X5') bonus = basePayout * 4
    if (slice.id === 'PLUS10') bonus = 10
    if (slice.id === 'PLUS25') bonus = 25
    if (slice.id === 'JACKPOT') bonus = 200 // tune later

    // If basePayout is 0, multipliers feel bad — convert to flat “consolation”
    if (basePayout === 0 && (slice.id === 'X2' || slice.id === 'X3' || slice.id === 'X5')) {
      bonus = slice.id === 'X2' ? 10 : slice.id === 'X3' ? 20 : 40
    }

    // Finish after animation
    const wheelAnimMs = fullscreenMobile ? 1400 : 1100
    setTimeout(() => {
      setWheelSpinning(false)
      setLastWheelBonus(bonus)

      const totalPayout = basePayout + bonus
      const totalNet = totalPayout - stake

      // record actual payout
      recordSpin({ wager: stake, payout: totalPayout })

      setSpinning(false)
      setLastPayout(totalPayout)
      setLastNet(totalNet)
      setLastMainSymbol(mainSymbol)
      setLastLinesHit(linesHit)

      setStatus(
        `Gold Pan triggered the wheel! Result: ${slice.id}. Bonus +${bonus}. Total payout ${totalPayout} (net ${totalNet >= 0 ? '+' : ''}${totalNet}).`
      )
    }, wheelAnimMs)
  }

  function spin() {
    if (spinning || wheelSpinning) return

    const stake = Math.max(1, betPerSpin)

    if (credits <= 0) return setStatus('Out of demo credits in your arcade wallet.')
    if (stake > credits) return setStatus('Not enough demo credits for that bet size.')

    setSpinning(true)
    setStatus('Spinning reels…')
    setLastNet(0)
    setLastPayout(0)
    setLastMainSymbol(null)
    setLastLinesHit(0)
    setLastWheelBonus(0)
    setWheelResult(null)

    // pick stops per reel
    const leftLen = BASE_STRIP.length
    const midLen = BASE_STRIP.length
    const rightLen = RIGHT_STRIP.length

    let stops: number[] = [
      Math.floor(Math.random() * leftLen),
      Math.floor(Math.random() * midLen),
      Math.floor(Math.random() * rightLen),
    ]

    // occasional forced alignment (keep your vibe)
    if (Math.random() < FORCED_ALIGN_CHANCE) {
      const targetRow = Math.floor(Math.random() * 3)
      const targetIndex = Math.floor(Math.random() * leftLen)

      const makeCenterForRow = (row: number): number => {
        if (row === 0) return wrapIndex(targetIndex + 1, leftLen)
        if (row === 1) return wrapIndex(targetIndex, leftLen)
        return wrapIndex(targetIndex - 1, leftLen)
      }

      const forcedCenter = makeCenterForRow(targetRow)
      // left/mid forced on BASE strip; right forced using same index mapped into RIGHT strip
      stops = [forcedCenter, forcedCenter, forcedCenter % rightLen]
    }

    // animation timing
    const tickMs = fullscreenMobile ? 120 : SPIN_TICK_MS
    const baseFullSpins = fullscreenMobile ? 3 : 2

    const lens = [leftLen, midLen, rightLen]

    stops.forEach((finalCenter, i) => {
      reelIntervals.current[i] = setInterval(() => {
        setReelCenters(prev => {
          const next = [...prev]
          next[i] = wrapIndex(next[i] + 1, lens[i])
          return next
        })
      }, tickMs)

      const fullSpins = baseFullSpins + i
      const stopDelay = FIRST_REEL_SPIN_MS + i * REEL_STAGGER_MS + fullSpins * 200

      setTimeout(() => {
        const intervalId = reelIntervals.current[i]
        if (intervalId) {
          clearInterval(intervalId)
          reelIntervals.current[i] = null
        }

        setReelCenters(prev => {
          const next = [...prev]
          next[i] = wrapIndex(finalCenter, lens[i])
          return next
        })
      }, stopDelay)
    })

    // precompute final rows
    const getTopIdx = (s: number, n: number) => wrapIndex(s - 1, n)
    const getMidIdx = (s: number, n: number) => wrapIndex(s, n)
    const getBotIdx = (s: number, n: number) => wrapIndex(s + 1, n)

    const topRowSyms: SymbolId[] = []
    const midRowSyms: SymbolId[] = []
    const botRowSyms: SymbolId[] = []

    for (let i = 0; i < 3; i++) {
      const s = stops[i]
      const strip = i === 2 ? RIGHT_STRIP : BASE_STRIP
      const n = strip.length
      topRowSyms.push(strip[getTopIdx(s, n)])
      midRowSyms.push(strip[getMidIdx(s, n)])
      botRowSyms.push(strip[getBotIdx(s, n)])
    }

    const topRes = evalLine(topRowSyms, stake)
    const midRes = evalLine(midRowSyms, stake)
    const botRes = evalLine(botRowSyms, stake)

    const basePayout = topRes.payout + midRes.payout + botRes.payout
    const linesHit =
      (topRes.payout > 0 ? 1 : 0) + (midRes.payout > 0 ? 1 : 0) + (botRes.payout > 0 ? 1 : 0)

    const mainSymbol = midRes.symbol ?? topRes.symbol ?? botRes.symbol ?? null
    const baseNet = basePayout - stake

    // Result lands after last reel stops
    const lastReelIndex = 2
    const lastReelFullSpins = baseFullSpins + lastReelIndex
    const resultDelay =
      FIRST_REEL_SPIN_MS + lastReelIndex * REEL_STAGGER_MS + lastReelFullSpins * 200 + 260

    // Wheel trigger: PAN on right reel middle row
    const panTriggered = midRowSyms[2] === 'PAN'

    setTimeout(() => {
      if (panTriggered) {
        setStatus('Gold Pan landed! Spinning the wheel…')
        spinWheelThenFinalize({ stake, basePayout, baseNet, linesHit, mainSymbol })
        return
      }

      // normal finalize (no wheel)
      recordSpin({ wager: stake, payout: basePayout })

      setSpinning(false)
      setLastNet(baseNet)
      setLastPayout(basePayout)
      setLastMainSymbol(mainSymbol)
      setLastLinesHit(linesHit)

      if (basePayout > 0 && linesHit > 0) {
        const symLabel =
          mainSymbol === 'BGLD' ? 'BGLD Coin' : mainSymbol === 'VAULT' ? 'Vault' : 'Nugget'

        setStatus(
          `Golden Alignment hit! ${linesHit} payline${linesHit > 1 ? 's' : ''} with ${symLabel}. Total payout ${basePayout} (net ${baseNet >= 0 ? '+' : ''}${baseNet}).`
        )
      } else {
        setStatus(`No full image alignment this spin. Net -${stake}.`)
      }
    }, resultDelay)
  }

  return (
    <div
      className={[
        'relative mx-auto w-full max-w-5xl rounded-[32px] border border-yellow-500/40 bg-black p-3 md:p-5 shadow-[0_24px_80px_rgba(0,0,0,0.9)]',
        fullscreenMobile ? 'fixed inset-0 z-80 max-w-none rounded-none overflow-hidden flex flex-col' : '',
      ].join(' ')}
    >
      {/* Exit */}
      {fullscreenMobile && (
        <button
          type="button"
          onClick={() => setFullscreenMobile(false)}
          className="md:hidden absolute right-3 top-3 z-50 rounded-full bg-black/80 border border-white/40 px-3 py-1 text-[11px] font-semibold text-white/90"
        >
          Exit
        </button>
      )}

      {/* Header (hidden in fullscreen) */}
      {!fullscreenMobile && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.45em] text-[#fde68a]/80">
              Base Gold Rush Casino
            </div>
            <div className="mt-1 text-xl md:text-3xl font-extrabold text-white">
              Gold Pan Wheel <span className="text-[#facc15]">• Slot</span>
            </div>
            <div className="text-xs text-white/60 mt-1 max-w-sm">
              Land the Gold Pan on the last reel center to spin the wheel for bonus rewards.
            </div>
          </div>

          <div className="flex flex-col items-stretch md:items-end gap-2 text-xs md:text-sm w-full md:w-auto">
            <div className="rounded-xl border border-white/15 bg-black/70 px-4 py-2 flex items-center justify-between md:justify-end gap-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">Demo Credits</div>
              <div className="text-2xl font-black text-[#fbbf24] tabular-nums">{credits.toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full md:w-auto">
              <MiniStat label="Bet / Spin" value={betPerSpin} />
              <MiniStat label="Last Net" value={lastNet} colored />
              <MiniStat label="Session P&L" value={sessionPnL} colored />
            </div>
          </div>
        </div>
      )}

      <div className={['grid gap-4 md:gap-6 md:grid-cols-[minmax(360px,1.25fr)_minmax(260px,0.75fr)]', fullscreenMobile ? 'flex-1 grid-cols-1' : ''].join(' ')}>
        {/* LEFT: Cabinet */}
        <div className={['rounded-[24px] border border-white/10 bg-black p-2 sm:p-3', fullscreenMobile ? 'h-full flex flex-col' : ''].join(' ')}>
          <div className="flex items-center justify-between text-[11px] mb-2">
            <div className="uppercase tracking-[0.3em] text-white/60">Cabinet View</div>
            <button
              type="button"
              onClick={() => setFullscreenMobile(fs => !fs)}
              className="md:hidden rounded-full border border-white/30 bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white/80"
            >
              {fullscreenMobile ? 'Windowed' : 'Full Screen'}
            </button>
          </div>

          <div className="relative mx-auto w-full max-w-[640px] aspect-[3/4]">
            {/* Background town */}
            <Image src={ASSET_BG} alt="Gold town background" fill className="object-cover select-none pointer-events-none rounded-2xl" />

            {/* Wheel (above reel window) */}
            <div className="absolute left-1/2 top-[6%] -translate-x-1/2 w-[56%] aspect-square pointer-events-none">
              {/* optional: swap to wheel-base/pointer later */}
              <div
                className={[
                  'absolute inset-0 rounded-full border border-yellow-300/30 bg-black/20 shadow-[0_0_40px_rgba(250,204,21,0.25)]',
                  wheelSpinning ? 'animate-pulse' : '',
                ].join(' ')}
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: wheelSpinning ? 'transform 1.1s cubic-bezier(0.1, 0.9, 0.1, 1)' : undefined,
                }}
              />
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-0 w-0 border-l-[10px] border-r-[10px] border-b-[18px] border-l-transparent border-r-transparent border-b-yellow-300/90" />
              {wheelResult && (
                <div className="absolute inset-x-0 bottom-[-18%] flex justify-center">
                  <div className="rounded-full bg-black/70 border border-yellow-300/40 px-3 py-1 text-[11px] text-yellow-100">
                    Wheel: <span className="font-bold">{wheelResult}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Cabinet frame overlay */}
            <Image src={ASSET_CABINET} alt="Cabinet frame" fill className="object-contain select-none pointer-events-none" />

            {/* Reel Window */}
            <div className="absolute inset-x-[6%] top-[31%] mx-auto flex justify-center gap-3 sm:gap-4">
              {(['LEFT', 'CENTER', 'RIGHT'] as ReelSide[]).map((side, i) => (
                <ReelColumn key={side} side={side} centerIndex={reelCenters[i]} />
              ))}
            </div>

            {/* Spin button */}
            <button
              onClick={spin}
              disabled={!canSpin}
              className="absolute inset-x-[0%] bottom-[26%] mx-auto w-[28%] max-w-sm h-9 sm:h-14 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 text-black text-[11px] sm:text-sm font-extrabold tracking-[0.26em] uppercase shadow-[0_0_22px_rgba(250,204,21,0.95)] hover:from-yellow-300 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {spinning ? 'Spinning…' : credits <= 0 ? 'No Credits' : betPerSpin > credits ? 'Lower Bet' : 'Spin'}
            </button>

            {/* HUD panel optional overlay */}
            {ASSET_HUD ? (
              <div className="absolute inset-x-0 bottom-0 h-[22%] pointer-events-none">
                <Image src={ASSET_HUD} alt="HUD panel" fill className="object-contain select-none" />
              </div>
            ) : null}
          </div>

          {/* Status */}
          <div className="mt-3 rounded-xl border border-white/10 bg-black/60 p-3 text-xs space-y-2">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/60">Spin Status</div>
            <div className="text-[13px] text-white/90 min-h-[1.6rem]">{status}</div>

            <div className="flex items-center justify-between text-[11px]">
              <div>
                <div className="uppercase tracking-[0.16em] text-white/50">Last Payout</div>
                <div className="text-yellow-200 font-bold tabular-nums">{lastPayout.toLocaleString()}</div>
                {lastWheelBonus > 0 && (
                  <div className="text-[11px] text-yellow-100/80">Wheel bonus +{lastWheelBonus}</div>
                )}
              </div>

              <div className="text-right">
                <div className="uppercase tracking-[0.16em] text-white/50">Last Net</div>
                <div className={lastNet > 0 ? 'text-emerald-400 font-bold tabular-nums' : lastNet < 0 ? 'text-rose-400 font-bold tabular-nums' : 'text-slate-200 font-bold tabular-nums'}>
                  {lastNet > 0 ? '+' : ''}
                  {lastNet.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Bet + Paytable (hidden in fullscreen) */}
        {!fullscreenMobile && (
          <div className="rounded-[24px] border border-yellow-300/25 bg-gradient-to-b from-[#0b1220] via-black to-black p-4 md:p-5 text-xs text-white space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-yellow-100/70">Bet Per Spin</div>
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
                          ? 'border-yellow-300 bg-yellow-400/15 text-yellow-100 shadow-[0_0_12px_rgba(250,204,21,0.55)]'
                          : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10',
                        disabled ? 'opacity-40 cursor-not-allowed' : '',
                      ].join(' ')}
                    >
                      {v}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-3 space-y-2">
              <div className="text-sm font-semibold text-white">Paytable (per payline)</div>
              <ul className="space-y-1 text-white/75 text-[11px] sm:text-xs list-disc list-inside">
                <li><span className="font-semibold">BGLD</span> — 12×</li>
                <li><span className="font-semibold">Vault</span> — 8×</li>
                <li><span className="font-semibold">Nugget</span> — 5×</li>
                <li><span className="font-semibold">Gold Pan</span> — triggers the wheel on the last reel center.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-3 space-y-2">
              <div className="text-sm font-semibold text-white">Wheel Rewards</div>
              <ul className="space-y-1 text-white/75 text-[11px] sm:text-xs list-disc list-inside">
                <li>X2 / X3 / X5 — bonus based on your base payout</li>
                <li>+10 / +25 — flat bonus credits</li>
                <li>JACKPOT — rare big hit (tune later)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- REEL COLUMN (single PNG symbols) ---------- */

function ReelColumn({ side, centerIndex }: { side: ReelSide; centerIndex: number }) {
  const strip = side === 'RIGHT' ? RIGHT_STRIP : BASE_STRIP
  const N = strip.length
  const topIdx = wrapIndex(centerIndex - 1, N)
  const midIdx = wrapIndex(centerIndex, N)
  const botIdx = wrapIndex(centerIndex + 1, N)

  const order = [topIdx, midIdx, botIdx]

  return (
    <div className="flex flex-col gap-1 sm:gap-1.5 h-[10rem] sm:h-[11.5rem] w-[4.9rem] sm:w-[5.3rem] rounded-2xl bg-black/70 border border-yellow-500/25 shadow-[0_16px_30px_rgba(0,0,0,0.85)] p-1">
      {order.map((idx, row) => {
        const symbol = strip[idx]
        const src = getSymbolSrc(symbol)
        return (
          <div key={`${idx}-${row}`} className="relative flex-1 rounded-md overflow-hidden bg-black">
            <Image src={src} alt={`${symbol}`} fill className="object-cover" />
          </div>
        )
      })}
    </div>
  )
}

/* ---------- MINI STAT ---------- */

function MiniStat({ label, value, colored }: { label: string; value: number; colored?: boolean }) {
  const colorClass = !colored ? 'text-slate-100' : value > 0 ? 'text-emerald-400' : value < 0 ? 'text-rose-400' : 'text-slate-100'
  return (
    <div className="rounded-lg border border-white/15 bg-black/50 px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${colorClass}`}>
        {value > 0 ? '+' : ''}
        {value.toLocaleString()}
      </div>
    </div>
  )
}
