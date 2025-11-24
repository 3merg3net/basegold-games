'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

/* ----------------- CARD + HAND LOGIC ----------------- */

const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const // 11=J,12=Q,13=K,14=A
const SUITS = ['♠', '♥', '♦', '♣'] as const

type Rank = (typeof RANKS)[number]
type Suit = (typeof SUITS)[number]

type Card = {
  rank: Rank
  suit: Suit
  isWild?: boolean
}

type HandResult = {
  label: string | null
  multiplier: number
}

function randomCard(): Card {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)]
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)]
  return { rank, suit }
}

function randomCardOrWild(isLast: boolean): Card {
  if (!isLast) return randomCard()
  // ~15% chance of wild on last reel
  if (Math.random() < 0.15) {
    return { rank: 14, suit: '♠', isWild: true } // treat as Ace for eval, but mark wild
  }
  return randomCard()
}

function rankToLabel(rank: Rank): string {
  if (rank <= 10) return String(rank)
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return 'A'
}

function evaluatePokerHand(cards: Card[]): HandResult {
  if (cards.length !== 5) return { label: null, multiplier: 0 }

  // For now we treat wild as its shown rank (Ace) for scoring;
  // its *main* benefit is triggering the free bonus spin.
  const ranks = cards.map(c => c.rank).slice().sort((a, b) => b - a)
  const suits = cards.map(c => c.suit)

  const counts: Record<number, number> = {}
  for (const r of ranks) {
    counts[r] = (counts[r] ?? 0) + 1
  }
  const countValues = Object.values(counts).sort((a, b) => b - a)

  const isFlush = suits.every(s => s === suits[0])

  // straight detection, including A-5 wheel
  const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => a - b)
  let isStraight = false
  if (uniqueRanks.length === 5) {
    if (uniqueRanks[4] - uniqueRanks[0] === 4) {
      isStraight = true
    } else if (
      // A-5 straight (A,5,4,3,2)
      uniqueRanks[0] === 2 &&
      uniqueRanks[1] === 3 &&
      uniqueRanks[2] === 4 &&
      uniqueRanks[3] === 5 &&
      uniqueRanks[4] === 14
    ) {
      isStraight = true
    }
  }

  const isRoyal =
    isStraight &&
    isFlush &&
    ranks.includes(10) &&
    ranks.includes(11) &&
    ranks.includes(12) &&
    ranks.includes(13) &&
    ranks.includes(14)

  if (isRoyal) return { label: 'ROYAL FLUSH', multiplier: 100 }
  if (isStraight && isFlush) return { label: 'STRAIGHT FLUSH', multiplier: 50 }

  if (countValues[0] === 4) return { label: 'FOUR OF A KIND', multiplier: 25 }
  if (countValues[0] === 3 && countValues[1] === 2)
    return { label: 'FULL HOUSE', multiplier: 9 }
  if (isFlush) return { label: 'FLUSH', multiplier: 6 }
  if (isStraight) return { label: 'STRAIGHT', multiplier: 4 }
  if (countValues[0] === 3) return { label: 'THREE OF A KIND', multiplier: 3 }
  if (countValues[0] === 2 && countValues[1] === 2)
    return { label: 'TWO PAIR', multiplier: 2 }

  // Jacks or Better
  if (countValues[0] === 2) {
    const pairRank = Number(
      Object.keys(counts).find(k => counts[Number(k)] === 2)
    )
    if (pairRank >= 11) return { label: 'JACKS OR BETTER', multiplier: 1 }
  }

  return { label: null, multiplier: 0 }
}

/* ----------------- MAIN MACHINE ----------------- */

type SpinSummary = {
  cards: Card[]
  net: number
  label: string | null
  bonusTriggered: boolean
}

const BET_OPTIONS = [1, 2, 5, 10, 25, 50]

export default function HandYoureDealtArcadeMachine() {
  const { credits, initialCredits, recordSpin } = useArcadeWallet()

  const [betPerSpin, setBetPerSpin] = useState(5)
  const [spinning, setSpinning] = useState(false)

  const [cards, setCards] = useState<Card[]>(() =>
    Array.from({ length: 5 }, (_, i) => randomCardOrWild(i === 4))
  )
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false])

  const [status, setStatus] = useState(
    'Set your bet, hit DEAL/SPIN, and watch each card rip like a reel.'
  )
  const [lastNet, setLastNet] = useState(0)
  const [lastPayout, setLastPayout] = useState(0)
  const [lastLabel, setLastLabel] = useState<string | null>(null)
  const [lastBonusHit, setLastBonusHit] = useState<boolean>(false)

  const [spinHistory, setSpinHistory] = useState<SpinSummary[]>([])

  const [bonusReady, setBonusReady] = useState(false) // you have a free spin ready from a previous wild
  const [bonusActive, setBonusActive] = useState(false) // the spin currently being taken is a bonus

  const sessionPnL = useMemo(
    () => credits - initialCredits,
    [credits, initialCredits]
  )

  const spinTimers = useRef<Array<NodeJS.Timeout>>([])

  useEffect(() => {
    return () => {
      spinTimers.current.forEach(t => clearTimeout(t))
      spinTimers.current = []
    }
  }, [])

  const canSpin = !spinning && credits > 0 && betPerSpin > 0

  function toggleHold(index: number) {
    if (!bonusReady && !bonusActive) return // only hold when a bonus spin is in play/queued
    if (spinning) return
    setHeld(prev => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  function spin() {
    if (spinning) return

    const isBonusSpin = bonusReady // consume the bonus if present
    const stake = Math.max(1, betPerSpin)
    const wager = isBonusSpin ? 0 : stake // free spin does not cost credits
    const multiplierBoost = isBonusSpin ? 2 : 1 // free spin pays 2×

    if (!isBonusSpin) {
      // normal spin requires credits
      if (credits <= 0) {
        setStatus('Out of demo credits in your arcade wallet.')
        return
      }
      if (stake > credits) {
        setStatus('Not enough demo credits for that bet size.')
        return
      }
    }

    setSpinning(true)
    setBonusActive(isBonusSpin)
    setBonusReady(false)
    setLastNet(0)
    setLastPayout(0)
    setLastLabel(null)
    setLastBonusHit(false)

    setStatus(
      isBonusSpin
        ? 'Bonus spin! Held cards stay locked while the others rip…'
        : 'Dealing a fresh hand… reels spinning left to right…'
    )

    // target final cards
    const finalCards: Card[] = []
    for (let i = 0; i < 5; i++) {
      if (isBonusSpin && held[i]) {
        finalCards[i] = cards[i] // held card stays
      } else {
        finalCards[i] = randomCardOrWild(i === 4)
      }
    }

    // clear any old timers
    spinTimers.current.forEach(t => clearTimeout(t))
    spinTimers.current = []

    // simple reel-like animation: each card slot cycles random faces then locks to final
    const baseDuration = 700
    const stagger = 220
    const tickMs = 80

    for (let i = 0; i < 5; i++) {
      const totalDuration = baseDuration + i * stagger
      const steps = Math.floor(totalDuration / tickMs)
      let step = 0

      const timer = setInterval(() => {
        step++
        if (step >= steps) {
          // lock to final card
          setCards(prev => {
            const next = [...prev]
            next[i] = finalCards[i]
            return next
          })
          clearInterval(timer)
        } else {
          // intermediate random faces if not held (or not bonus spin)
          setCards(prev => {
            const next = [...prev]
            if (isBonusSpin && held[i]) return next
            next[i] = randomCardOrWild(i === 4)
            return next
          })
        }
      }, tickMs)

      spinTimers.current.push(timer)
    }

    const maxDuration = baseDuration + (5 - 1) * stagger

    setTimeout(() => {
      // all cards settled
      const resultCards = finalCards
      setCards(resultCards)

      const { label, multiplier } = evaluatePokerHand(resultCards)

      const basePayout = stake * multiplier
      const payout = basePayout * multiplierBoost
      const net = payout - wager

      // bonus trigger if wild on last reel (and not already in bonus spin)
      const lastIsWild = resultCards[4]?.isWild === true
      const bonusTriggered = !!lastIsWild && !isBonusSpin

      if (bonusTriggered) {
        setBonusReady(true)
        setHeld([false, false, false, false, false]) // start clean; player can choose holds now
      } else {
        setBonusReady(false)
        setHeld([false, false, false, false, false])
      }

      recordSpin({ wager, payout })

      setSpinning(false)
      setBonusActive(false)
      setLastNet(net)
      setLastPayout(payout)
      setLastLabel(label)
      setLastBonusHit(bonusTriggered)

      setSpinHistory(prev => {
        const next: SpinSummary[] = [
          { cards: resultCards, net, label, bonusTriggered },
          ...prev,
        ]
        return next.slice(0, 10)
      })

      let msg = `Hand: ${resultCards
        .map(c => (c.isWild ? 'WILD' : `${rankToLabel(c.rank)}${c.suit}`))
        .join(' • ')}. `
      if (label && multiplier > 0) {
        msg += `${label}! `
      } else {
        msg += 'No made hand. '
      }
      if (isBonusSpin) {
        msg += 'Bonus spin paid with a 2× boost. '
      }
      if (bonusTriggered) {
        msg +=
          'WILD on the last reel! You unlocked a free bonus spin — tap cards to HOLD, then DEAL/SPIN.'
      } else {
        msg += `Total payout ${payout} credits (net ${
          net >= 0 ? '+' : ''
        }${net}).`
      }

      setStatus(msg)
    }, maxDuration + 220)
  }

  /* ----------------- RENDER ----------------- */

  return (
    <div className="mx-auto w-full max-w-5xl rounded-[32px] border border-yellow-500/50 bg-gradient-to-b from-[#020617] via-black to-[#111827] p-4 md:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)] space-y-4">
      {/* HEADER STRIP */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.45em] text-[#fde68a]/80">
            Base Gold Rush Casino
          </div>
          <div className="mt-1 text-xl md:text-3xl font-extrabold text-white">
            Hand You&apos;re Dealt <span className="text-[#facc15]">• Arcade</span>
          </div>
          <div className="text-xs text-white/60 mt-1 max-w-sm">
            Five-card reel poker in a slot cabinet. Spin for classic video poker
            hands, chase the WILD on the last reel, and unlock a free bonus spin
            with holds and boosted payouts.
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
        {/* LEFT: CABINET + CARDS + STATUS */}
        <div className="rounded-[24px] border border-white/12 bg-gradient-to-b from-black/40 via-[#020617] to-black p-1.5 sm:p-2 space-y-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <div className="uppercase tracking-[0.3em] text-white/60">
              Cabinet View
            </div>
            <div className="text-white/50">
              Reel-style cards • bonus wild feature
            </div>
          </div>

          {/* CABINET + OVERLAYS */}
          <div className="relative mx-auto w-full max-w-[520px] sm:max-w-[600px] aspect-[3/4]">
            {/* Cabinet PNG */}
            <Image
              src="/images/slots/hand-youre-dealt-cabinet.png"
              alt="Hand You're Dealt cabinet"
              fill
              className="object-contain select-none pointer-events-none"
            />

            {/* CARD WINDOW (center transparent area) */}
            <div className="absolute inset-x-[10%] top-[45%] mx-auto flex justify-center gap-2 sm:gap-3 px-2">
              {cards.map((card, i) => {
                const isHeld = held[i]
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleHold(i)}
                    className={[
                      'relative h-20 w-[3.2rem] sm:h-24 sm:w-[3.6rem] rounded-xl bg-gradient-to-b from-slate-900 via-black to-slate-900 border border-yellow-400/70 shadow-[0_12px_24px_rgba(0,0,0,0.9)] flex items-center justify-center transition-transform duration-150',
                      spinning && !isHeld ? 'scale-95' : 'scale-100',
                      isHeld ? 'ring-2 ring-emerald-300' : '',
                    ].join(' ')}
                  >
                    {card.isWild ? (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-[11px] font-black tracking-[0.2em] text-yellow-300">
                          WILD
                        </span>
                        <span className="mt-0.5 text-[9px] text-amber-100/80">
                          Bonus Unlock
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-lg sm:text-xl font-bold text-white drop-shadow-[0_0_6px_rgba(250,250,250,0.8)]">
                          {rankToLabel(card.rank)}
                        </span>
                        <span
                          className={[
                            'text-base sm:text-lg',
                            card.suit === '♥' || card.suit === '♦'
                              ? 'text-red-400'
                              : 'text-slate-200',
                          ].join(' ')}
                        >
                          {card.suit}
                        </span>
                      </div>
                    )}

                    {isHeld && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-semibold text-black shadow">
                        HOLD
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* TOP DISPLAY – last result */}
            <div className="absolute inset-x-[10%] top-[25%] flex items-center justify-center">
              <div className="rounded-full bg-black/70 border border-yellow-300/80 px-3 py-1.5 text-[10px] sm:text-xs text-yellow-100/90 shadow-[0_0_16px_rgba(250,204,21,0.7)] flex items-center gap-2">
                <span className="uppercase tracking-[0.24em] text-[9px]">
                  Last Hand
                </span>
                <span className="font-semibold">
                  {lastLabel ?? '—'}
                  {bonusReady && ' • BONUS READY'}
                  {bonusActive && ' • BONUS ×2'}
                </span>
              </div>
            </div>

            {/* DEAL / SPIN BUTTON INSIDE CABINET */}
            <button
              onClick={spin}
              disabled={!canSpin}
              className="absolute inset-x-0 bottom-[29%] mx-auto w-[37%] max-w-xs h-12 sm:h-11 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 text-black text-[11px] sm:text-sm font-extrabold tracking-[0.3em] uppercase shadow-[0_0_25px_rgba(250,204,21,0.9)] hover:from-yellow-300 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {spinning
                ? 'Dealing…'
                : credits <= 0
                ? 'No Demo Credits'
                : bonusReady
                ? 'Bonus Deal / Spin'
                : 'Deal / Spin'}
            </button>
          </div>

          {/* STATUS + HISTORY UNDER CABINET */}
          <div className="space-y-1 mt-2">
            <div className="text-[10px] text-emerald-100/80 text-center">
              Normal spins cost your Bet per Spin. A WILD on the last reel
              unlocks a free bonus spin with 2× payouts — tap cards to HOLD
              before you deal the bonus.
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
                  {lastBonusHit && (
                    <div className="text-[11px] text-emerald-100/80">
                      <span className="font-semibold">BONUS UNLOCKED</span> —
                      WILD on the last reel activated a free spin.
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
                        Deal a few hands to build history.
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
                        {h.cards
                          .map(c =>
                            c.isWild
                              ? 'WILD'
                              : `${rankToLabel(c.rank)}${c.suit}`
                          )
                          .join('-')}{' '}
                        · {h.label ?? '—'} · {h.net > 0 ? '+' : ''}
                        {h.net}
                        {h.bonusTriggered ? ' • B' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
                You&apos;re out of demo credits. Top up from the arcade wallet HUD
                to keep spinning.
              </div>
            )}
          </div>

          {/* Paytable */}
          <div className="rounded-2xl border border-emerald-200/60 bg-black/40 p-3 space-y-2">
            <div className="text-sm font-semibold text-emerald-50">
              Paytable — Main Hand (per 1 credit)
            </div>
            <ul className="space-y-1 text-emerald-50/85 text-[11px] sm:text-xs list-disc list-inside">
              <li>ROYAL FLUSH • pays 100×</li>
              <li>STRAIGHT FLUSH • pays 50×</li>
              <li>FOUR OF A KIND • pays 25×</li>
              <li>FULL HOUSE • pays 9×</li>
              <li>FLUSH • pays 6×</li>
              <li>STRAIGHT • pays 4×</li>
              <li>THREE OF A KIND • pays 3×</li>
              <li>TWO PAIR • pays 2×</li>
              <li>JACKS OR BETTER • pays 1×</li>
              <li>No made hand • no payout</li>
            </ul>
            <div className="text-[11px] text-emerald-100/80 pt-1">
              Bonus spins apply a 2× payout boost to the entire hand result.
            </div>
          </div>

          {/* Bonus explainer */}
          <div className="rounded-2xl border border-yellow-300/70 bg-black/40 p-3 space-y-2">
            <div className="text-sm font-semibold text-yellow-100">
              Wild Bonus — Last Reel
            </div>
            <ul className="space-y-1 text-yellow-50/90 list-disc list-inside text-[11px] sm:text-xs">
              <li>
                The <span className="font-semibold">5th card</span> can show a
                special <span className="font-semibold">WILD</span> symbol.
              </li>
              <li>
                Any WILD on the last reel during a normal spin unlocks{' '}
                <span className="font-semibold">one free bonus spin</span>.
              </li>
              <li>
                Before your bonus spin, tap any cards you want to{' '}
                <span className="font-semibold">HOLD</span>; the rest re-deal.
              </li>
              <li>
                Bonus spins are <span className="font-semibold">free</span> and
                pay with a <span className="font-semibold">2× multiplier</span>{' '}
                on the hand payout.
              </li>
            </ul>
          </div>

          {/* How to play */}
          <div className="rounded-2xl border border-white/12 bg-black/40 p-3 space-y-2">
            <div className="text-sm font-semibold text-white">
              How To Play
            </div>
            <ul className="space-y-1 text-white/75 list-disc list-inside">
              <li>Choose your Bet per Spin using the buttons above.</li>
              <li>
                Hit <span className="font-semibold">Deal / Spin</span> to fire
                all five card reels; they settle from left to right.
              </li>
              <li>
                Hands pay according to the paytable. Demo wallet tracks all P&amp;L
                across Base Gold Rush arcade games.
              </li>
              <li>
                When a WILD hits on the last reel, you earn a free bonus spin —
                tap cards to HOLD, then hit Deal / Spin again.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ----------------- MINI STAT ----------------- */

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
