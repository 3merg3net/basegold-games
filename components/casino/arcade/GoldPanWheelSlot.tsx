'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { usePlayerProfileContext } from '@/lib/player/PlayerProfileProvider'
import { usePlayerChips } from '@/lib/chips/usePlayerChips'
import SlotSymbol, { SlotSymbolKey } from '@/components/casino/slots/SlotSymbol'

/* ---------- ASSET PATHS ---------- */

const ASSET_BG = '/images/slots/goldpan/cabinet-bg.png'
const ASSET_CABINET = '/images/slots/goldpan/cabinet-frame.png'

/**
 * REEL_WIN is aligned to the cabinet-frame window.
 * We’re widening a bit and tightening vertical fit to avoid top clipping.
 * If you want micro-adjust: tweak ONLY these.
 */
const REEL_WIN = {
  left: 21.9,
  top: 25.5,
  width: 56.2,
  height: 50.2,
}







/* ---------- SYMBOLS + STRIPS ---------- */

type SymbolId = 'BGLD' | 'NUGGET' | 'VAULT' | 'PAN'

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

const RIGHT_STRIP: SymbolId[] = [...BASE_STRIP, 'PAN']

function toSymbolKey(symbol: SymbolId): SlotSymbolKey {
  switch (symbol) {
    case 'BGLD':
      return 'coin'
    case 'NUGGET':
      return 'nugget'
    case 'VAULT':
      return 'vault'
    case 'PAN':
      return 'goldpan'
  }
}

/* ---------- PAYTABLE & HELPERS ---------- */

const PAYTABLE: Record<Exclude<SymbolId, 'PAN'>, number> = {
  BGLD: 12,
  VAULT: 8,
  NUGGET: 5,
}

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
  if (a === 'PAN' || b === 'PAN' || c === 'PAN') return { payout: 0, symbol: null }

  if (a === b && b === c) {
    const mul = PAYTABLE[a] ?? 0
    return { payout: mul * stake, symbol: a }
  }
  return { payout: 0, symbol: null }
}

/* ---------- WHEEL ---------- */

type WheelSlice = {
  id: 'X2' | 'X3' | 'X5' | 'PLUS10' | 'PLUS25' | 'JACKPOT'
  weight: number
  label: string
}

const WHEEL: WheelSlice[] = [
  { id: 'X2', weight: 36, label: 'x2' },
  { id: 'X3', weight: 26, label: 'x3' },
  { id: 'X5', weight: 14, label: 'x5' },
  { id: 'PLUS10', weight: 14, label: '+10' },
  { id: 'PLUS25', weight: 8, label: '+25' },
  { id: 'JACKPOT', weight: 2, label: 'JACKPOT' },
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
  // ─────────────────────────────────────────────────────────────
  // GLD wiring
  // ─────────────────────────────────────────────────────────────
  const { profile } = usePlayerProfileContext() as any

  const [fallbackLocalId, setFallbackLocalId] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      let id = window.localStorage.getItem('player-id')
      if (!id) {
        id =
          'p-' +
          (typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? (crypto.randomUUID() || '').slice(0, 10)
            : Math.random().toString(36).slice(2, 12))
        window.localStorage.setItem('player-id', id)
      }
      setFallbackLocalId(id)
    } catch {
      setFallbackLocalId('p-' + Math.random().toString(36).slice(2, 12))
    }
  }, [])

  const playerId = (profile?.id as string | undefined) ?? fallbackLocalId

  const { chips: chipState, refresh: refreshChips } = usePlayerChips()
  const balanceGld = Number(chipState?.balance_gld ?? 0)
  const reservedGld = Number(chipState?.reserved_gld ?? 0)
  const credits = Math.max(0, balanceGld - reservedGld)

  const [initialCredits, setInitialCredits] = useState<number | null>(null)
  useEffect(() => {
    if (initialCredits !== null) return
    if (credits > 0) setInitialCredits(credits)
  }, [credits, initialCredits])

  async function applyGld(deltaBalance: number, txType: string, meta?: any) {
    if (!playerId) throw new Error('Missing playerId')

    const ref = meta?.ref ?? `slot:${txType}:${playerId}:${Date.now()}`
    const payload = {
      playerId,
      kind: 'gld',
      txType,
      deltaBalance,
      deltaReserved: 0,
      ref,
      meta: meta ?? null,
    }

    const res = await fetch('/api/chips/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('[SLOT applyGld] FAILED', { status: res.status, j })
      throw new Error(j?.error || 'Chip update failed')
    }
    return j
  }

  // reelCenters: index that appears on the MIDDLE row
  const [reelCenters, setReelCenters] = useState<number[]>([0, 4, 8])

  const [betPerSpin, setBetPerSpin] = useState(5)
  const [spinning, setSpinning] = useState(false)

  const [status, setStatus] = useState(
    'Align BGLD, Nugget, or Vault across any row. PAN on last reel center triggers the bonus wheel.'
  )
  const [lastNet, setLastNet] = useState(0)
  const [lastPayout, setLastPayout] = useState(0)
  const [lastLinesHit, setLastLinesHit] = useState(0)
  const [lastWheelBonus, setLastWheelBonus] = useState(0)

  const sessionPnL = useMemo(
    () => credits - (initialCredits ?? credits),
    [credits, initialCredits]
  )

  const reelIntervals = useRef<Array<ReturnType<typeof setInterval> | null>>([null, null, null])

  useEffect(() => {
    return () => {
      reelIntervals.current.forEach(id => id && clearInterval(id))
    }
  }, [])

  const canSpin = !spinning && credits > 0 && betPerSpin > 0

  // ─────────────────────────────────────────────────────────────
  // BONUS WHEEL MODAL (gold pan vibe)
  // ─────────────────────────────────────────────────────────────
  const [wheelOpen, setWheelOpen] = useState(false)
  const [wheelSpinning, setWheelSpinning] = useState(false)
  const [wheelResult, setWheelResult] = useState<WheelSlice | null>(null)
  const [wheelRotation, setWheelRotation] = useState(0)
  const [wheelSpinRef, setWheelSpinRef] = useState<string | null>(null)
  const [wheelStake, setWheelStake] = useState<number>(0)
  const [wheelBasePayout, setWheelBasePayout] = useState<number>(0)
  const [wheelLinesHit, setWheelLinesHit] = useState<number>(0)

  function computeWheelBonus(slice: WheelSlice, basePayout: number) {
    let bonus = 0
    if (slice.id === 'X2') bonus = basePayout
    if (slice.id === 'X3') bonus = basePayout * 2
    if (slice.id === 'X5') bonus = basePayout * 4
    if (slice.id === 'PLUS10') bonus = 10
    if (slice.id === 'PLUS25') bonus = 25
    if (slice.id === 'JACKPOT') bonus = 200

    // if basePayout is 0, multipliers still give something
    if (basePayout === 0 && (slice.id === 'X2' || slice.id === 'X3' || slice.id === 'X5')) {
      bonus = slice.id === 'X2' ? 10 : slice.id === 'X3' ? 20 : 40
    }
    return bonus
  }

  async function finalizePayout(opts: {
    spinRef: string
    stake: number
    totalPayout: number
    totalNet: number
    linesHit: number
    wheelBonus?: number
    wheelResultId?: WheelSlice['id'] | null
    statusText: string
  }) {
    const {
      spinRef,
      stake,
      totalPayout,
      totalNet,
      linesHit,
      wheelBonus = 0,
      wheelResultId = null,
      statusText,
    } = opts

    try {
      if (totalPayout > 0) {
        await applyGld(+totalPayout, 'WIN', {
          ref: `slot:payout:${spinRef}`,
          game: 'slot',
          wager: stake,
          payout: totalPayout,
          linesHit,
          wheelBonus,
          wheelResult: wheelResultId,
        })
      }
      await refreshChips?.()
    } catch (e) {
      console.error('[SLOT] payout credit failed', e)
    }

    setSpinning(false)
    setLastPayout(totalPayout)
    setLastNet(totalNet)
    setLastLinesHit(linesHit)
    setLastWheelBonus(wheelBonus)
    setStatus(statusText)
  }

  function openWheelAndSpin(args: {
    spinRef: string
    stake: number
    basePayout: number
    linesHit: number
  }) {
    // store context so the modal can finalize after spin
    setWheelSpinRef(args.spinRef)
    setWheelStake(args.stake)
    setWheelBasePayout(args.basePayout)
    setWheelLinesHit(args.linesHit)

    setWheelResult(null)
    setWheelOpen(true)

    // allow modal paint, then spin
    setTimeout(() => {
      const slice = pickWeighted(WHEEL)
      setWheelResult(slice)
      setWheelSpinning(true)

      // land in the slice’s “region”
      const idx = WHEEL.findIndex(w => w.id === slice.id)
      const seg = 360 / WHEEL.length
      const centerDeg = idx * seg + seg / 2

      const extraSpins = 5 + Math.floor(Math.random() * 3)
      const jitter = (Math.random() - 0.5) * (seg * 0.45)
      const nextRot = wheelRotation + extraSpins * 360 + (360 - centerDeg) + jitter
      setWheelRotation(nextRot)

      const bonus = computeWheelBonus(slice, args.basePayout)
      const totalPayout = args.basePayout + bonus
      const totalNet = totalPayout - args.stake

      // duration matches CSS transition below
      const animMs = 1650
      setTimeout(() => {
        setWheelSpinning(false)

        void finalizePayout({
          spinRef: args.spinRef,
          stake: args.stake,
          totalPayout,
          totalNet,
          linesHit: args.linesHit,
          wheelBonus: bonus,
          wheelResultId: slice.id,
          statusText: `BONUS WHEEL: ${slice.label} → +${bonus}. Total ${totalPayout} (net ${totalNet >= 0 ? '+' : ''}${totalNet}).`,
        })
      }, animMs)
    }, 120)
  }

  async function spin() {
    if (spinning || wheelSpinning) return
    const stake = Math.max(1, betPerSpin)

    if (!playerId) return setStatus('Missing player id — cannot spin yet.')
    if (credits <= 0) return setStatus('Out of GLD credits.')
    if (stake > credits) return setStatus('Not enough GLD for that bet size.')

    setSpinning(true)
    setStatus('Spinning…')
    setLastNet(0)
    setLastPayout(0)
    setLastLinesHit(0)
    setLastWheelBonus(0)

    const spinRef = `slot:spin:${playerId}:${Date.now()}`
    try {
      await applyGld(-stake, 'BET', { ref: spinRef, game: 'slot', bet: stake })
      await refreshChips?.()
    } catch (e) {
      console.error('[SLOT] bet debit failed', e)
      setSpinning(false)
      setStatus('Bet failed — could not debit GLD.')
      return
    }

    const leftLen = BASE_STRIP.length
    const midLen = BASE_STRIP.length
    const rightLen = RIGHT_STRIP.length

    let stops: number[] = [
      Math.floor(Math.random() * leftLen),
      Math.floor(Math.random() * midLen),
      Math.floor(Math.random() * rightLen),
    ]

    if (Math.random() < FORCED_ALIGN_CHANCE) {
      const targetRow = Math.floor(Math.random() * 3)
      const targetIndex = Math.floor(Math.random() * leftLen)

      const makeCenterForRow = (row: number): number => {
        if (row === 0) return wrapIndex(targetIndex + 1, leftLen)
        if (row === 1) return wrapIndex(targetIndex, leftLen)
        return wrapIndex(targetIndex - 1, leftLen)
      }

      const forcedCenter = makeCenterForRow(targetRow)
      stops = [forcedCenter, forcedCenter, forcedCenter % rightLen]
    }

    const lens = [leftLen, midLen, rightLen]

    stops.forEach((finalCenter, i) => {
      reelIntervals.current[i] = setInterval(() => {
        setReelCenters(prev => {
          const next = [...prev]
          next[i] = wrapIndex(next[i] + 1, lens[i])
          return next
        })
      }, SPIN_TICK_MS)

      const fullSpins = 2 + i
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

    const baseNet = basePayout - stake
    const panTriggered = midRowSyms[2] === 'PAN'

    const lastReelIndex = 2
    const lastReelFullSpins = 2 + lastReelIndex
    const resultDelay =
      FIRST_REEL_SPIN_MS + lastReelIndex * REEL_STAGGER_MS + lastReelFullSpins * 200 + 260

    setTimeout(() => {
      if (panTriggered) {
        setStatus('GOLD PAN! Bonus wheel…')
        openWheelAndSpin({ spinRef, stake, basePayout, linesHit })
        return
      }

      if (basePayout > 0 && linesHit > 0) {
        void finalizePayout({
          spinRef,
          stake,
          totalPayout: basePayout,
          totalNet: baseNet,
          linesHit,
          statusText: `Win! ${linesHit} line${linesHit > 1 ? 's' : ''}. Payout ${basePayout} (net ${baseNet >= 0 ? '+' : ''}${baseNet}).`,
        })
      } else {
        void finalizePayout({
          spinRef,
          stake,
          totalPayout: 0,
          totalNet: -stake,
          linesHit: 0,
          statusText: `No hit. Net -${stake}.`,
        })
      }
    }, resultDelay)
  }

  // Build the 3x3 visible grid symbols from reelCenters
  const visibleGrid = useMemo(() => {
    const cols: SymbolId[][] = []
    const strips: SymbolId[][] = [BASE_STRIP, BASE_STRIP, RIGHT_STRIP]

    for (let c = 0; c < 3; c++) {
      const strip = strips[c]
      const n = strip.length
      const center = reelCenters[c]
      const top = strip[wrapIndex(center - 1, n)]
      const mid = strip[wrapIndex(center, n)]
      const bot = strip[wrapIndex(center + 1, n)]
      cols.push([top, mid, bot])
    }

    return [
      [cols[0][0], cols[1][0], cols[2][0]],
      [cols[0][1], cols[1][1], cols[2][1]],
      [cols[0][2], cols[1][2], cols[2][2]],
    ]
  }, [reelCenters])

  const betIndex = BET_OPTIONS.indexOf(betPerSpin)
  const canBetDown = !spinning && !wheelSpinning && betIndex > 0
  const canBetUp = !spinning && !wheelSpinning && betIndex < BET_OPTIONS.length - 1 && BET_OPTIONS[betIndex + 1] <= credits

  function betDown() {
    if (!canBetDown) return
    setBetPerSpin(BET_OPTIONS[betIndex - 1])
  }
  function betUp() {
    if (!canBetUp) return
    setBetPerSpin(BET_OPTIONS[betIndex + 1])
  }

 return (
  <div className="relative mx-auto w-full max-w-5xl rounded-[28px] border border-yellow-500/35 bg-black p-3 md:p-5 shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
    {/* CABINET STAGE */}
    <div className="relative mx-auto w-full max-w-[980px] overflow-hidden rounded-2xl">
      <div className="relative w-full aspect-[16/11] sm:aspect-[16/11]">
        <Image
          src={ASSET_BG}
          alt="Background"
          fill
          className="object-cover select-none pointer-events-none"
        />

        {/* Cabinet overlay (give it more vertical room; reserve space for panel below) */}
        <div className="absolute inset-x-0 top-[1.5%] bottom-[24%]">
          <div className="relative mx-auto h-full w-[98%] max-w-[1040px]">
            <Image
              src={ASSET_CABINET}
              alt="Cabinet Frame"
              fill
              className="object-contain select-none pointer-events-none"
            />

            {/* REELS — anchored to cabinet window */}
            <div
              className="absolute"
              style={{
                left: `${REEL_WIN.left}%`,
                top: `${REEL_WIN.top}%`,
                width: `${REEL_WIN.width}%`,
                height: `${REEL_WIN.height}%`,
              }}
            >
              <div className="h-full w-full flex items-center justify-center">
                {/* Force a perfect square grid so tiles are not wide */}
                <div className="h-full aspect-square">
                  <div className="h-full w-full grid grid-cols-3 grid-rows-3 gap-[10.0%]">
                    {visibleGrid.map((row, r) =>
                      row.map((sym, c) => (
                        <div
                          key={`${r}-${c}-${sym}`}
                          className={[
                            'relative overflow-hidden rounded-[10px]',
                            'bg-gradient-to-b from-white/25 via-white/10 to-black/35',
                            'border border-white/12 shadow-[0_18px_30px_rgba(0,0,0,0.55)]',
                            spinning ? 'slotCellSpin' : '',
                          ].join(' ')}
                        >
                          {/* Symbol layer (guaranteed sized box) */}
                          <div className="absolute inset-0 z-10 grid place-items-center">
                            <div className="relative h-[98%] w-[98%] scale-[1.03]">
                              <SlotSymbol symbol={toSymbolKey(sym)} idle />
                            </div>
                          </div>
                          {sym === 'PAN' && (
  <div className="absolute inset-0 z-30 pointer-events-none">
    <div className="bonusBadge">
      <span className="bonusBadgeText">BONUS SPIN</span>
    </div>
    <div className="bonusRays" />
  </div>
)}


                          <div className="absolute inset-0 z-20 pointer-events-none slotGlass" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ BONUS FEATURE CALLOUT (ONCE, under reels) */}
            <div
              className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none"
              style={{
                top: `calc(${REEL_WIN.top + REEL_WIN.height}% + 1.35%)`,
                width: `min(${REEL_WIN.width}%, 620px)`,
              }}
            >
              <div className="bonusMarquee">
                <div className="bonusMarqueeInner">
                  <div className="bonusTag">BONUS</div>

                  <div className="bonusText">
                    Land <span className="bonusEm">PAN</span> in the{' '}
                    <span className="bonusEm">center</span> of the last reel to spin the{' '}
                    <span className="bonusTitle">GOLD PAN WHEEL</span>
                    <span className="bonusSub"> — multipliers + instant gold.</span>
                  </div>

                  <div className="bonusPills">
                    <span className="bonusPill">x2</span>
                    <span className="bonusPill">x3</span>
                    <span className="bonusPill">x5</span>
                    <span className="bonusPill">+10</span>
                    <span className="bonusPill">+25</span>
                    <span className="bonusPill jackpot">JACKPOT</span>
                  </div>
                </div>

                <div className="bonusShine" />
                <div className="bonusSparks" />
              </div>
            </div>
          </div>
        </div>

        {/* CONTROL PANEL — sits in the dirt under cabinet (realistic) */}
        <div className="absolute inset-x-0 bottom-[2%] px-2 sm:px-3">
          <div className="mx-auto w-full max-w-[980px]">
            {/* subtle gold edge */}
            <div className="absolute inset-0 pointer-events-none panelGlow" />

            <div className="relative p-2.5 sm:p-3">
              <div className="flex items-center justify-between gap-3">
                {/* LEFT: balance */}
                <div className="min-w-[140px]">
                  <div className="text-[10px] uppercase tracking-[0.35em] text-white/55">GLD</div>
                  <div className="text-2xl sm:text-3xl font-black text-yellow-300 tabular-nums leading-tight">
                    {credits.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-white/55 mt-1">
                    Session{' '}
                    <span
                      className={
                        sessionPnL >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                      }
                    >
                      {sessionPnL >= 0 ? '+' : ''}
                      {sessionPnL.toLocaleString()}
                    </span>
                    {lastWheelBonus > 0 ? (
                      <span className="text-yellow-200/80"> · Wheel +{lastWheelBonus}</span>
                    ) : null}
                  </div>
                </div>

                {/* CENTER: spin (hero) */}
                <div className="flex-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={spin}
                    disabled={!canSpin || wheelSpinning}
                    className={[
                      'slotSpinBtn',
                      'rounded-full px-8 sm:px-12 py-3 sm:py-3.5',
                      'text-black font-extrabold uppercase tracking-[0.35em]',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    ].join(' ')}
                  >
                    {spinning ? 'SPINNING…' : 'SPIN'}
                  </button>
                </div>

                {/* RIGHT: last + net */}
                <div className="min-w-[150px] flex items-center justify-end gap-3">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[0.35em] text-white/55">LAST</div>
                    <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
                      {lastPayout.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[0.35em] text-white/55">NET</div>
                    <div
                      className={[
                        'text-xl sm:text-2xl font-black tabular-nums',
                        lastNet > 0
                          ? 'text-emerald-400'
                          : lastNet < 0
                          ? 'text-rose-400'
                          : 'text-white',
                      ].join(' ')}
                    >
                      {lastNet > 0 ? '+' : ''}
                      {lastNet.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* BET ROW */}
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] uppercase tracking-[0.35em] text-white/55">BET</div>

                  <button
                    type="button"
                    onClick={betDown}
                    disabled={!canBetDown}
                    className="slotMiniBtn"
                    aria-label="Bet down"
                  >
                    –
                  </button>

                  <div className="slotBetPill">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/60">GLD</span>
                    <span className="text-lg font-black text-yellow-200 tabular-nums">{betPerSpin}</span>
                  </div>

                  <button
                    type="button"
                    onClick={betUp}
                    disabled={!canBetUp}
                    className="slotMiniBtn"
                    aria-label="Bet up"
                  >
                    +
                  </button>

                  {/* quick picks */}
                  <div className="hidden sm:flex items-center gap-2 ml-2">
                    {BET_OPTIONS.map(v => {
                      const active = v === betPerSpin
                      const disabled = spinning || wheelSpinning || v > credits
                      return (
                        <button
                          key={`bet-${v}`}
                          type="button"
                          disabled={disabled}
                          onClick={() => setBetPerSpin(v)}
                          className={[
                            'slotChipBtn',
                            active ? 'slotChipBtnActive' : '',
                            disabled ? 'opacity-40 cursor-not-allowed' : '',
                          ].join(' ')}
                        >
                          {v}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="text-[12px] text-white/75 max-w-[56%] text-right leading-snug">
                  <div>
                    <span className="text-yellow-200/90 font-semibold">Bonus Feature:</span>{' '}
                    Land <span className="text-white/90 font-semibold">PAN</span> in the{' '}
                    <span className="text-white/90 font-semibold">center</span> of the last reel to trigger the{' '}
                    <span className="text-yellow-200/90 font-semibold">Gold Pan Wheel</span>.
                  </div>
                  <div className="text-[11px] text-white/60 mt-0.5">
                    Spin awards multipliers or instant gold — paid automatically.
                  </div>
                </div>
              </div>

              {/* STATUS */}
              <div className="mt-3 rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-[12px] text-white/85">
                <span className="text-white/55 uppercase tracking-[0.25em] text-[10px] mr-2">STATUS</span>
                {status}
              </div>
            </div>
          </div>
        </div>

        {/* BONUS WHEEL MODAL */}
        {wheelOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-3">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => !wheelSpinning && setWheelOpen(false)}
            />
            <div className="relative w-full max-w-[520px] rounded-3xl border border-yellow-500/25 bg-black/65 backdrop-blur-xl shadow-[0_30px_120px_rgba(0,0,0,0.9)] overflow-hidden">
              <div className="absolute inset-0 pointer-events-none panelGlow" />

              <div className="relative p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.35em] text-yellow-200/70">BONUS FEATURE</div>
                    <div className="mt-1 text-2xl sm:text-3xl font-black text-yellow-200">GOLD PAN WHEEL</div>
                    <div className="text-[12px] text-white/70 mt-1">Triggered by PAN on the last reel center.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => !wheelSpinning && setWheelOpen(false)}
                    className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] text-white/80 hover:bg-black/60"
                    disabled={wheelSpinning}
                  >
                    Close
                  </button>
                </div>

                {/* WHEEL — GOLD PAN */}
                <div className="mt-5 flex items-center justify-center">
                  <div className="relative w-[290px] h-[290px] sm:w-[360px] sm:h-[360px]">
                    {/* pointer */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30">
                      <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-b-[22px] border-l-transparent border-r-transparent border-b-yellow-300 drop-shadow-[0_0_14px_rgba(250,204,21,0.9)]" />
                      <div className="mx-auto mt-1 h-[10px] w-[2px] bg-yellow-300/80 blur-[0.2px]" />
                    </div>

                    {/* OUTER PAN RIM */}
                    <div className="absolute inset-0 rounded-full panOuter" />

                    {/* INNER PAN RIM */}
                    <div className="absolute inset-[4%] rounded-full panInner" />

                    {/* RIFFLES (ridged grooves) */}
                    <div className="absolute inset-[10%] rounded-full panRiffles pointer-events-none" />

                    {/* spinning contents */}
                    <div
                      className="absolute inset-[12%] rounded-full overflow-hidden"
                      style={{
                        transform: `rotate(${wheelRotation}deg)`,
                        transition: wheelSpinning
                          ? 'transform 1.65s cubic-bezier(0.08, 0.95, 0.12, 1)'
                          : 'transform 0.35s ease',
                      }}
                    >
                      {/* base segmented plate */}
                      <div className="absolute inset-0 wheelSegments" />

                      {/* water + foam */}
                      <div className="absolute inset-0 wheelWater" />
                      <div className="absolute inset-0 wheelFoam" />

                      {/* gold flecks that fling outward */}
                      <div className="absolute inset-0 wheelGold" />
                      <div className="absolute inset-0 wheelFlakes" />

                      {/* vignette */}
                      <div className="absolute inset-0 wheelVignette" />

                      {/* labels */}
                      {WHEEL.map((seg, i) => (
                        <div
                          key={seg.id}
                          className="absolute left-1/2 top-1/2 origin-left text-[12px] sm:text-[13px] font-black text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)]"
                          style={{
                            transform: `rotate(${(360 / WHEEL.length) * i}deg) translateX(106px)`,
                          }}
                        >
                          <span className={seg.id === 'JACKPOT' ? 'text-yellow-200' : ''}>{seg.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* center hub */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="panHub">
                        <div className="text-[10px] uppercase tracking-[0.35em] text-white/65 text-center">RESULT</div>
                        <div className="text-xl font-black text-yellow-200 text-center">
                          {wheelResult ? wheelResult.label : wheelSpinning ? '…' : 'READY'}
                        </div>
                      </div>
                    </div>

                    {/* wobble overlay (only while spinning) */}
                    <div className={wheelSpinning ? 'absolute inset-[12%] rounded-full panWobble' : 'hidden'} />
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-black/45 p-4">
                  <div className="text-[10px] uppercase tracking-[0.35em] text-white/55">Payout</div>
                  <div className="mt-1 text-[13px] text-white/80">Your bonus is added automatically.</div>
                  <div className="mt-2 text-[12px] text-white/70">
                    Base payout: <span className="text-white/90 font-semibold">{wheelBasePayout}</span>{' '}
                    · Bet: <span className="text-white/90 font-semibold">{wheelStake}</span>{' '}
                    · Lines: <span className="text-white/90 font-semibold">{wheelLinesHit}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* styles */}
        <style jsx>{`
          .panelGlow {
            background: radial-gradient(1200px 200px at 50% 0%, rgba(250,204,21,0.14), transparent 55%),
              radial-gradient(900px 240px at 0% 100%, rgba(250,204,21,0.10), transparent 55%),
              radial-gradient(900px 240px at 100% 100%, rgba(250,204,21,0.08), transparent 55%);
          }

          .slotSpinBtn {
            background: linear-gradient(90deg, #fbbf24, #fde68a, #fbbf24);
            box-shadow: 0 0 30px rgba(250,204,21,0.55), 0 0 70px rgba(250,204,21,0.20);
            position: relative;
            overflow: hidden;
          }
          .slotSpinBtn:before {
            content: "";
            position: absolute;
            inset: -40%;
            background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.45), transparent 60%);
            transform: translateX(-40%) rotate(10deg);
            animation: shine 2.2s ease-in-out infinite;
            opacity: 0.9;
          }
          @keyframes shine {
            0% { transform: translateX(-55%) rotate(10deg); opacity: 0.0; }
            20% { opacity: 0.8; }
            55% { opacity: 0.9; }
            100% { transform: translateX(55%) rotate(10deg); opacity: 0.0; }
          }

          .slotMiniBtn {
            width: 38px;
            height: 38px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.18);
            background: rgba(0,0,0,0.45);
            color: rgba(255,255,255,0.85);
            font-weight: 900;
            font-size: 18px;
            line-height: 1;
            box-shadow: inset 0 0 16px rgba(0,0,0,0.45);
          }
          .slotMiniBtn:disabled { opacity: 0.4; cursor: not-allowed; }

          .slotBetPill {
            display: flex;
            align-items: baseline;
            gap: 10px;
            padding: 8px 14px;
            border-radius: 999px;
            border: 1px solid rgba(250,204,21,0.20);
            background: rgba(0,0,0,0.40);
            box-shadow: 0 0 18px rgba(250,204,21,0.12);
          }

          .slotChipBtn {
            height: 34px;
            min-width: 38px;
            padding: 0 10px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.14);
            background: rgba(0,0,0,0.30);
            color: rgba(255,255,255,0.80);
            font-weight: 900;
            font-size: 12px;
            box-shadow: inset 0 0 16px rgba(0,0,0,0.45);
          }
          .slotChipBtn:hover { background: rgba(0,0,0,0.48); }
          .slotChipBtnActive {
            border-color: rgba(250,204,21,0.55);
            background: rgba(250,204,21,0.14);
            color: rgba(255,255,255,0.95);
            box-shadow: 0 0 18px rgba(250,204,21,0.25);
          }

          .slotGlass {
            background: linear-gradient(180deg, rgba(255,255,255,0.20), rgba(255,255,255,0.05) 40%, rgba(0,0,0,0.20));
            mix-blend-mode: screen;
            opacity: 0.45;
          }

          .slotCellSpin { animation: cellPulse 0.16s linear infinite; }
          @keyframes cellPulse {
            0% { filter: brightness(1); transform: translateY(0px); }
            50% { filter: brightness(1.07); transform: translateY(-0.6px); }
            100% { filter: brightness(1); transform: translateY(0px); }
          }

          /* ✅ Bonus marquee */
          .bonusMarquee{
            position: relative;
            border-radius: 18px;
            padding: 10px 12px;
            overflow: hidden;
            background:
              radial-gradient(900px 120px at 50% 0%, rgba(250,204,21,0.32), transparent 60%),
              linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.28));
            border: 1px solid rgba(250,204,21,0.35);
            box-shadow:
              0 0 0 1px rgba(255,255,255,0.05) inset,
              0 10px 40px rgba(0,0,0,0.65),
              0 0 22px rgba(250,204,21,0.22);
            transform: translateZ(0);
            animation: bonusPulse 1.35s ease-in-out infinite;
          }
          @keyframes bonusPulse { 0%,100%{ filter: brightness(1);} 50%{ filter: brightness(1.12);} }

          .bonusMarqueeInner{
            position: relative;
            z-index: 2;
            display: flex;
            gap: 10px;
            align-items: center;
            justify-content: space-between;
          }
          .bonusTag{
            flex: 0 0 auto;
            padding: 6px 10px;
            border-radius: 999px;
            font-weight: 900;
            letter-spacing: 0.28em;
            font-size: 10px;
            color: rgba(0,0,0,0.9);
            background: linear-gradient(90deg, #fbbf24, #fde68a, #fbbf24);
            box-shadow: 0 0 18px rgba(250,204,21,0.35);
            text-transform: uppercase;
          }
          .bonusText{
            min-width: 0;
            flex: 1;
            font-size: 12px;
            line-height: 1.15;
            color: rgba(255,255,255,0.88);
            font-weight: 700;
          }
          .bonusSub{ color: rgba(255,255,255,0.70); font-weight: 600; }
          .bonusEm{ color: rgba(255,255,255,0.98); font-weight: 900; }
          .bonusTitle{
            color: rgba(250,204,21,0.98);
            font-weight: 950;
            letter-spacing: 0.06em;
            text-shadow: 0 0 14px rgba(250,204,21,0.25);
          }
          .bonusPills{ display:none; gap:6px; align-items:center; }
          @media (min-width: 640px){ .bonusPills{ display:flex; } }

          .bonusPill{
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 900;
            color: rgba(255,255,255,0.92);
            border: 1px solid rgba(255,255,255,0.14);
            background: rgba(0,0,0,0.30);
            box-shadow: inset 0 0 16px rgba(0,0,0,0.45);
          }
          .bonusPill.jackpot{
            border-color: rgba(250,204,21,0.45);
            background: rgba(250,204,21,0.12);
            box-shadow: 0 0 18px rgba(250,204,21,0.22);
            color: rgba(250,204,21,0.95);
          }

          .bonusShine{
            position:absolute;
            inset:-40%;
            background: linear-gradient(120deg, transparent 35%, rgba(255,255,255,0.30), transparent 60%);
            transform: translateX(-60%) rotate(10deg);
            animation: bonusShineMove 2.4s ease-in-out infinite;
            z-index:1;
            opacity:0.9;
          }
          @keyframes bonusShineMove{
            0%{ transform: translateX(-70%) rotate(10deg); opacity:0; }
            25%{ opacity:0.85; }
            55%{ opacity:0.95; }
            100%{ transform: translateX(70%) rotate(10deg); opacity:0; }
          }

          .bonusSparks{
            position:absolute;
            inset:0;
            z-index:1;
            opacity:0.55;
            mix-blend-mode: screen;
            background:
              radial-gradient(circle at 15% 30%, rgba(250,204,21,0.22), transparent 45%),
              radial-gradient(circle at 80% 25%, rgba(250,204,21,0.18), transparent 48%),
              radial-gradient(circle at 70% 80%, rgba(250,204,21,0.14), transparent 50%),
              repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, transparent 14px, rgba(255,255,255,0.04) 28px);
            animation: sparksDrift 1.8s linear infinite;
          }
          @keyframes sparksDrift{ 0%{ transform: translateX(-4%);} 100%{ transform: translateX(4%);} }

          /* ─────────────────────────────────────────────
             GOLD PAN WHEEL (wild)
             ───────────────────────────────────────────── */

          .panOuter{
            background:
              radial-gradient(circle at 30% 25%, rgba(255,255,255,0.22), transparent 36%),
              radial-gradient(circle at 70% 80%, rgba(0,0,0,0.55), transparent 45%),
              conic-gradient(from 230deg, rgba(250,204,21,0.22), rgba(255,255,255,0.10), rgba(250,204,21,0.26), rgba(0,0,0,0.55), rgba(250,204,21,0.22));
            border: 1px solid rgba(250,204,21,0.22);
            box-shadow: 0 0 55px rgba(250,204,21,0.18), inset 0 0 40px rgba(0,0,0,0.75);
          }

          .panInner{
            background:
              radial-gradient(circle at 35% 35%, rgba(255,255,255,0.12), transparent 50%),
              radial-gradient(circle at 50% 60%, rgba(0,0,0,0.65), transparent 55%),
              linear-gradient(180deg, rgba(250,204,21,0.08), rgba(0,0,0,0.40));
            border: 1px solid rgba(255,255,255,0.10);
            box-shadow: inset 0 0 50px rgba(0,0,0,0.7);
          }

          .panRiffles{
            background:
              repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.02) 7px, rgba(0,0,0,0.10) 14px);
            mix-blend-mode: overlay;
            opacity: 0.55;
            filter: contrast(1.05);
          }

          .wheelSegments{
            background:
              conic-gradient(rgba(250,204,21,0.95), rgba(17,24,39,0.92), rgba(250,204,21,0.90), rgba(17,24,39,0.92), rgba(250,204,21,0.90), rgba(17,24,39,0.92));
            filter: saturate(1.1) contrast(1.05);
          }

          .wheelWater{
            background:
              radial-gradient(circle at 30% 22%, rgba(59,130,246,0.22), transparent 45%),
              radial-gradient(circle at 70% 72%, rgba(59,130,246,0.14), transparent 55%),
              conic-gradient(from 90deg, rgba(255,255,255,0.16), rgba(59,130,246,0.06), rgba(255,255,255,0.16), rgba(59,130,246,0.06), rgba(255,255,255,0.16)),
              repeating-linear-gradient(115deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.02) 18px, rgba(255,255,255,0.12) 36px);
            mix-blend-mode: overlay;
            opacity: 0.70;
            animation: waterSwirl 1.1s linear infinite;
          }

          @keyframes waterSwirl{
            0%{ transform: translateX(-8%) translateY(2%) rotate(0deg); }
            100%{ transform: translateX(8%) translateY(-2%) rotate(360deg); }
          }

          .wheelFoam{
            background:
              radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16), transparent 42%),
              radial-gradient(circle at 65% 55%, rgba(255,255,255,0.12), transparent 48%),
              radial-gradient(circle at 45% 78%, rgba(255,255,255,0.10), transparent 52%);
            mix-blend-mode: screen;
            opacity: 0.55;
            filter: blur(0.3px);
            animation: foamPulse 0.85s ease-in-out infinite;
          }

          @keyframes foamPulse{
            0%,100%{ opacity: 0.38; transform: scale(1); }
            50%{ opacity: 0.62; transform: scale(1.03); }
          }

          .wheelGold{
            background:
              radial-gradient(circle at 20% 30%, rgba(250,204,21,0.30), transparent 45%),
              radial-gradient(circle at 70% 45%, rgba(250,204,21,0.26), transparent 48%),
              radial-gradient(circle at 45% 80%, rgba(250,204,21,0.22), transparent 55%);
            mix-blend-mode: screen;
            opacity: 0.70;
            animation: goldTwinkle 0.75s ease-in-out infinite;
          }

          @keyframes goldTwinkle{
            0%,100%{ opacity: 0.55; }
            50%{ opacity: 0.95; }
          }

          .wheelFlakes{
            background:
              radial-gradient(circle at 18% 55%, rgba(250,204,21,0.65), transparent 30%),
              radial-gradient(circle at 72% 62%, rgba(250,204,21,0.55), transparent 34%),
              radial-gradient(circle at 52% 30%, rgba(250,204,21,0.45), transparent 36%),
              radial-gradient(circle at 40% 75%, rgba(250,204,21,0.55), transparent 32%),
              radial-gradient(circle at 62% 82%, rgba(250,204,21,0.40), transparent 40%);
            mix-blend-mode: screen;
            opacity: 0.55;
            filter: blur(0.2px);
            animation: flakesCentrifuge 0.95s linear infinite;
          }

          @keyframes flakesCentrifuge{
            0%{ transform: translateX(-2%) translateY(2%) scale(1); }
            100%{ transform: translateX(2%) translateY(-2%) scale(1.06); }
          }

          .wheelVignette{
            background: radial-gradient(circle at 50% 50%, transparent 52%, rgba(0,0,0,0.55) 100%);
            opacity: 0.85;
          }

          .panHub{
            border-radius: 999px;
            padding: 10px 18px;
            background: rgba(0,0,0,0.60);
            border: 1px solid rgba(250,204,21,0.25);
            box-shadow: 0 0 22px rgba(250,204,21,0.18);
          }

          .panWobble{
            pointer-events: none;
            box-shadow: inset 0 0 18px rgba(255,255,255,0.08);
            animation: wobble 0.16s linear infinite;
            opacity: 0.9;
          }
          @keyframes wobble{
            0%{ transform: rotate(0deg) scale(1); }
            25%{ transform: rotate(0.35deg) scale(1.002); }
            50%{ transform: rotate(0deg) scale(1.000); }
            75%{ transform: rotate(-0.35deg) scale(1.002); }
            100%{ transform: rotate(0deg) scale(1); }
          }
        `}</style>
      </div>
    </div>
  </div>
)
}
