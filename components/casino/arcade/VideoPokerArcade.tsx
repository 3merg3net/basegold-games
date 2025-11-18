'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

/* --------- card + game types ---------- */

const SUITS = ['♠', '♥', '♦', '♣'] as const
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const

type Suit = (typeof SUITS)[number]
type Rank = (typeof RANKS)[number]

type Card = { rank: Rank; suit: Suit }

type Phase = 'betting' | 'dealt' | 'settled'

type HandRank =
  | 'ROYAL_FLUSH'
  | 'STRAIGHT_FLUSH'
  | 'FOUR_OF_A_KIND'
  | 'FULL_HOUSE'
  | 'FLUSH'
  | 'STRAIGHT'
  | 'THREE_OF_A_KIND'
  | 'TWO_PAIR'
  | 'JACKS_OR_BETTER'
  | 'NONE'

type PayTableRow = {
  rank: HandRank
  label: string
  pays: [number, number, number, number, number] // credits for bet 1..5
}

/* 9/6 Jacks or Better style table */
const PAY_TABLE: PayTableRow[] = [
  { rank: 'ROYAL_FLUSH', label: 'Royal Flush',       pays: [250, 500, 750, 1000, 4000] },
  { rank: 'STRAIGHT_FLUSH', label: 'Straight Flush', pays: [50, 100, 150, 200, 250] },
  { rank: 'FOUR_OF_A_KIND', label: '4 of a Kind',    pays: [25, 50, 75, 100, 125] },
  { rank: 'FULL_HOUSE',     label: 'Full House',     pays: [9, 18, 27, 36, 45] },
  { rank: 'FLUSH',          label: 'Flush',          pays: [6, 12, 18, 24, 30] },
  { rank: 'STRAIGHT',       label: 'Straight',       pays: [4, 8, 12, 16, 20] },
  { rank: 'THREE_OF_A_KIND',label: '3 of a Kind',    pays: [3, 6, 9, 12, 15] },
  { rank: 'TWO_PAIR',       label: 'Two Pair',       pays: [2, 4, 6, 8, 10] },
  { rank: 'JACKS_OR_BETTER',label: 'Jacks or Better',pays: [1, 2, 3, 4, 5] },
]

const RANK_SCORE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
}

/* --------- helpers ---------- */

function buildShuffledDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  // Fisher–Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function evaluateHand(cards: Card[]): HandRank {
  const values = cards.map(c => RANK_SCORE[c.rank]).sort((a, b) => a - b)
  const suits = cards.map(c => c.suit)
  const isFlush = suits.every(s => s === suits[0])

  const isWheel = values.toString() === [2, 3, 4, 5, 14].toString()
  const isStraight =
    isWheel ||
    values.every((v, i) => (i === 0 ? true : v === values[0] + i))

  const counts: Record<number, number> = {}
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1
  }
  const countValues = Object.values(counts).sort((a, b) => b - a)
  const hasFour = countValues[0] === 4
  const hasThree = countValues[0] === 3
  const pairCount = countValues.filter(c => c === 2).length

  // Jacks or Better
  const hasHighPair = Object.entries(counts).some(([v, cnt]) => {
    if (cnt < 2) return false
    const n = Number(v)
    return n >= RANK_SCORE['J'] // J,Q,K,A
  })

  const maxVal = Math.max(...values)
  const minVal = Math.min(...values)

  if (isStraight && isFlush && maxVal === 14 && minVal === 10) {
    return 'ROYAL_FLUSH'
  }
  if (isStraight && isFlush) return 'STRAIGHT_FLUSH'
  if (hasFour) return 'FOUR_OF_A_KIND'
  if (hasThree && pairCount === 1) return 'FULL_HOUSE'
  if (isFlush) return 'FLUSH'
  if (isStraight) return 'STRAIGHT'
  if (hasThree) return 'THREE_OF_A_KIND'
  if (pairCount === 2) return 'TWO_PAIR'
  if (hasHighPair) return 'JACKS_OR_BETTER'
  return 'NONE'
}

function getPayout(rank: HandRank, bet: number): number {
  if (rank === 'NONE' || bet <= 0) return 0
  const row = PAY_TABLE.find(r => r.rank === rank)
  if (!row) return 0
  const idx = Math.min(Math.max(bet, 1), 5) - 1
  return row.pays[idx]
}

function rankLabel(rank: HandRank): string {
  const row = PAY_TABLE.find(r => r.rank === rank)
  return row?.label ?? ''
}

/* --------- component ---------- */

export default function VideoPokerArcade() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { credits: arcadeCredits, net: arcadeNet, addWin, addLoss } = useArcadeWallet()

  // local machine credits (demo)
  const [machineCredits, setMachineCredits] = useState(500)
  const [sessionPnL, setSessionPnL] = useState(0)
  const [syncedPnL, setSyncedPnL] = useState(0)

  // sync to global arcade wallet
  useEffect(() => {
    if (!mounted) return
    const delta = sessionPnL - syncedPnL
    if (delta === 0) return
    if (delta > 0) addWin(delta)
else addLoss(-delta)

    setSyncedPnL(sessionPnL)
  }, [mounted, sessionPnL, syncedPnL, addWin, addLoss])

  const [phase, setPhase] = useState<Phase>('betting')
  const [betPerHand, setBetPerHand] = useState(5) // 1–5 credits
  const [deck, setDeck] = useState<Card[]>([])
  const [hand, setHand] = useState<Card[]>([])
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false])
  const [lastRank, setLastRank] = useState<HandRank>('NONE')
  const [lastWin, setLastWin] = useState(0)
  const [lastMessage, setLastMessage] = useState<string>(
    'Set your bet, then DEAL to start.'
  )

  const canDeal =
    (phase === 'betting' || phase === 'settled') &&
    betPerHand >= 1 &&
    betPerHand <= 5 &&
    machineCredits >= betPerHand

  const canDraw = phase === 'dealt'

  const currentHandTotal = useMemo(() => {
    if (hand.length !== 5) return null
    const rank = evaluateHand(hand)
    return rank === 'NONE' ? null : rankLabel(rank)
  }, [hand])

  /* --------- actions ---------- */

  function startDeal() {
    if (!canDeal) return

    const newDeck = buildShuffledDeck()
    const newHand = newDeck.slice(0, 5)
    const remainder = newDeck.slice(5)

    setDeck(remainder)
    setHand(newHand)
    setHeld([false, false, false, false, false])
    setPhase('dealt')
    setLastRank('NONE')
    setLastWin(0)

    setMachineCredits(c => c - betPerHand)
    setSessionPnL(p => p - betPerHand)
    setLastMessage('Tap cards to HOLD, then hit DRAW.')
  }

  function handleDraw() {
    if (!canDraw) return
    if (deck.length < 5) {
      // safety, should not happen
      setLastMessage('Out of cards – reshuffling shoe. Try again.')
      setPhase('betting')
      return
    }

    let drawIndex = 0
    const newHand = hand.map((card, idx) => {
      if (held[idx]) return card
      const nextCard = deck[drawIndex]
      drawIndex++
      return nextCard
    })
    const remainingDeck = deck.slice(drawIndex)

    const rank = evaluateHand(newHand)
    const payout = getPayout(rank, betPerHand)

    setDeck(remainingDeck)
    setHand(newHand)
    setPhase('settled')
    setLastRank(rank)
    setLastWin(payout)

    if (payout > 0) {
      setMachineCredits(c => c + payout)
      setSessionPnL(p => p + payout)
      setLastMessage(
        `${rankLabel(rank)} • WIN +${payout.toLocaleString()} BGRC`
      )
    } else {
      setLastMessage('No qualifying hand • BET AGAIN.')
    }
  }

  function handlePrimaryButton() {
    if (phase === 'betting' || phase === 'settled') {
      startDeal()
    } else if (phase === 'dealt') {
      handleDraw()
    }
  }

  function toggleHold(idx: number) {
    if (phase !== 'dealt') return
    setHeld(prev =>
      prev.map((h, i) => (i === idx ? !h : h))
    )
  }

  const primaryLabel =
    phase === 'betting'
      ? 'Deal'
      : phase === 'dealt'
      ? 'Draw'
      : 'Deal Again'

  /* --------- render helpers ---------- */

  function renderCard(card: Card | null, isHeld: boolean, index: number) {
    if (!card) {
      return (
        <div className="w-[72px] h-[104px] md:w-[88px] md:h-[128px] rounded-xl bg-[repeating-linear-gradient(135deg,#0b1120,#0b1120_6px,#1f2937_6px,#1f2937_12px)] border border-slate-700 shadow-[0_6px_20px_rgba(0,0,0,0.85)]" />
      )
    }
    const isRed = card.suit === '♥' || card.suit === '♦'

    return (
      <button
        type="button"
        onClick={() => toggleHold(index)}
        className="relative group focus:outline-none"
      >
        <div className="w-[72px] h-[104px] md:w-[88px] md:h-[128px] rounded-xl bg-white border border-slate-300 shadow-[0_10px_30px_rgba(0,0,0,0.9)] flex flex-col justify-between p-2">
          <div
            className={[
              'text-xs font-bold',
              isRed ? 'text-red-600' : 'text-slate-900',
            ].join(' ')}
          >
            {card.rank}
            <span className="ml-0.5">{card.suit}</span>
          </div>
          <div
            className={[
              'text-3xl md:text-4xl text-center',
              isRed ? 'text-red-600' : 'text-slate-900',
            ].join(' ')}
          >
            {card.suit}
          </div>
          <div
            className={[
              'text-xs font-bold self-end rotate-180',
              isRed ? 'text-red-600' : 'text-slate-900',
            ].join(' ')}
          >
            {card.rank}
            <span className="ml-0.5">{card.suit}</span>
          </div>
        </div>

        {/* HOLD badge */}
        <div
          className={[
            'mt-1 h-5 rounded-full border px-2 text-[10px] flex items-center justify-center tracking-[0.16em] uppercase transition',
            isHeld
              ? 'border-[#facc15]/90 bg-[#facc15]/20 text-[#fef9c3] shadow-[0_0_12px_rgba(250,204,21,0.8)]'
              : 'border-emerald-200/60 bg-black/40 text-emerald-100/80 group-hover:bg-emerald-500/20',
          ].join(' ')}
        >
          {isHeld ? 'Held' : 'Tap to Hold'}
        </div>
      </button>
    )
  }

  function renderPayTable() {
    return (
      <div className="mt-3 rounded-2xl border border-amber-300/70 bg-gradient-to-b from-black/70 via-[#1f2937] to-black/90 px-3 py-3 text-[10px] md:text-[11px] text-amber-50">
        <div className="flex items-center justify-between mb-2">
          <div className="uppercase tracking-[0.22em] text-[9px] text-amber-100/80">
            Payout Schedule — Jacks or Better
          </div>
          <div className="flex gap-1 text-[9px] text-amber-100/80">
            {[1, 2, 3, 4, 5].map(n => (
              <div
                key={n}
                className={[
                  'w-6 text-center rounded-full border px-1 py-0.5',
                  betPerHand === n
                    ? 'border-[#facc15] bg-[#facc15]/20 text-[#fef9c3]'
                    : 'border-amber-300/40 bg-black/40',
                ].join(' ')}
              >
                {n}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[2.2fr_repeat(5,1fr)] gap-x-2 gap-y-1">
          <div className="text-[9px] uppercase tracking-[0.18em] text-amber-100/70">
            Hand
          </div>
          {[1, 2, 3, 4, 5].map(n => (
            <div
              key={`hdr-${n}`}
              className="text-center text-[9px] text-amber-100/70"
            >
              {n}
            </div>
          ))}

          {PAY_TABLE.map(row => {
            const isHit = lastRank === row.rank && lastWin > 0
            return (
              <FragmentRow
                key={row.rank}
                row={row}
                betPerHand={betPerHand}
                isHit={isHit}
              />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-[minmax(360px,1.3fr)_360px] gap-6 items-start">
      {/* MACHINE SIDE */}
      <div className="relative rounded-[30px] border border-amber-400/60 bg-[radial-gradient(circle_at_0%_0%,#78350f_0%,transparent_55%),radial-gradient(circle_at_100%_0%,#f59e0b_0%,transparent_55%),#111827] shadow-[0_24px_70px_rgba(0,0,0,0.95)] p-4 md:p-5 overflow-hidden">
        {/* top glow */}
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.5),transparent_60%)]" />

        {/* header */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-amber-100/80">
              BASE GOLD RUSH ARCADE
            </div>
            <div className="mt-1 text-xl md:text-2xl font-extrabold text-amber-50 drop-shadow">
              Video Poker • Jacks or Better
            </div>
            <div className="text-[11px] text-amber-100/75">
              5-card draw • Hold what you like • Classic bar-top machine.
            </div>
          </div>
          <div className="text-right text-[11px] text-amber-50/80 space-y-1">
            <div>
              Machine Credits:{' '}
              <span className="font-bold text-[#facc15]">
                {machineCredits.toLocaleString()} BGRC
              </span>
            </div>
            <div>
              Machine P&amp;L:{' '}
              <span
                className={
                  sessionPnL >= 0
                    ? 'text-emerald-200 font-semibold'
                    : 'text-rose-300 font-semibold'
                }
              >
                {sessionPnL >= 0 ? '+' : ''}
                {sessionPnL.toFixed(2)} BGRC
              </span>
            </div>
          </div>
        </div>

        {/* screen area */}
        <div className="relative rounded-[24px] border border-amber-300/70 bg-[radial-gradient(circle_at_50%_0%,#1e293b,#020617_65%,#000_100%)] px-4 pt-4 pb-5 md:px-6 md:pt-5 md:pb-6">
          {/* video screen frame */}
          <div className="rounded-2xl border border-slate-500/70 bg-gradient-to-b from-slate-900 via-slate-950 to-black px-3 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.9)]">
            {/* message + current rank */}
            <div className="flex items-center justify-between text-[11px] text-sky-100/85 mb-2">
              <div className="truncate">
                {lastMessage || 'Ready.'}
              </div>
              <div className="text-right">
                {currentHandTotal && (
                  <span className="text-amber-100 font-semibold">
                    {currentHandTotal}
                  </span>
                )}
              </div>
            </div>

            {/* cards row */}
            <div className="mt-1 flex justify-center gap-3 md:gap-4">
              {Array.from({ length: 5 }).map((_, idx) =>
                renderCard(hand[idx] ?? null, held[idx], idx)
              )}
            </div>{/* control panel */}
          <div className="mt-4 rounded-2xl border border-amber-300/70 bg-gradient-to-b from-black/80 via-slate-900 to-black/95 px-3 py-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[11px] text-amber-50/80">
              <div>
                <div className="uppercase tracking-[0.22em] text-[9px] text-amber-100/70">
                  Bet Per Hand
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        if (phase === 'betting' || phase === 'settled') {
                          setBetPerHand(v)
                        }
                      }}
                      className={[
                        'px-3 py-1 rounded-full border text-[11px] font-semibold',
                        betPerHand === v
                          ? 'border-[#facc15] bg-[#facc15]/30 text-[#fef9c3]'
                          : 'border-amber-300/50 bg-black/60 text-amber-100',
                        phase === 'dealt'
                          ? 'opacity-40 cursor-not-allowed'
                          : '',
                      ].join(' ')}
                      disabled={phase === 'dealt'}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-[10px] text-amber-100/70">
                  Total Bet:{' '}
                  <span className="font-bold text-[#facc15]">
                    {betPerHand} BGRC
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePrimaryButton}
                  disabled={
                    (phase === 'betting' || phase === 'settled')
                      ? !canDeal
                      : !canDraw
                  }
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#facc15] to-[#f97316] px-7 py-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-black shadow-[0_0_24px_rgba(250,204,21,0.9)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {primaryLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

            {/* last win strip */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-amber-100/85">
              <div>
                Last Win:{' '}
                <span
                  className={
                    lastWin > 0 ? 'text-emerald-200 font-semibold' : ''
                  }
                >
                  {lastWin > 0
                    ? `+${lastWin.toLocaleString()} BGRC`
                    : '—'}
                </span>
              </div>
              <div>
                Last Hand:{' '}
                <span className="font-semibold">
                  {lastRank === 'NONE' ? '—' : rankLabel(lastRank)}
                </span>
              </div>
            </div>
          </div>

          {/* pay table */}
          {renderPayTable()}

          

      {/* SIDE HUD */}
      <div className="rounded-2xl border border-white/12 bg-gradient-to-b from-[#111827] via-[#020617] to-black p-4 md:p-5 space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.26em] text-white/60">
            GAME SUMMARY
          </div>
          <div className="mt-1 text-lg font-bold text-white">
            Video Poker (BGRC Arcade)
          </div>
          <div className="mt-1 text-xs text-white/70">
            Local-only demo of a{' '}
            <span className="font-semibold text-[#facc15]">
              Jacks or Better
            </span>{' '}
            machine in the Base Gold Rush theme. Five cards, hold &amp; draw,
            classic 9/6 payout table.
          </div>
        </div>

        {/* global arcade + machine HUD */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-white/14 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">
              Arcade Stack
            </div>
            <div className="mt-1 text-xl font-extrabold text-white">
              {arcadeCredits.toLocaleString()}{' '}
              <span className="text-xs text-white/70">BGRC</span>
            </div>
            <div className="mt-1 text-[11px] text-white/55">
              Global demo balance across all arcade titles.
            </div>
          </div>

          <div className="rounded-xl border border-white/14 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">
              Arcade Net
            </div>
            <div
              className={[
                'mt-1 text-xl font-extrabold',
                arcadeNet >= 0 ? 'text-emerald-300' : 'text-rose-300',
              ].join(' ')}
            >
              {arcadeNet >= 0 ? '+' : ''}
              {arcadeNet.toFixed(2)} BGRC
            </div>
            <div className="mt-1 text-[11px] text-white/55">
              Cumulative P&amp;L since you opened the arcade.
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/14 bg-black/40 p-3 text-xs space-y-2">
          <div className="text-sm font-semibold text-white">
            Machine Rules (Demo)
          </div>
          <ul className="space-y-1 text-white/70 list-disc list-inside">
            <li>5-card draw with HOLD / DRAW flow.</li>
            <li>{'9/6 Jacks or Better paytable (Royal up to 4,000).'}</li>
            <li>Max 5 credits per hand (BGRC demo credits).</li>
            <li>Each hand uses a freshly shuffled 52-card deck.</li>
          </ul>
          <div className="text-[11px] text-white/50 pt-1">
            This is a{' '}
            <span className="font-semibold">
              front-end only arcade machine
            </span>
            . Future{' '}
            <span className="font-semibold text-[#facc15]">
              BGLD / BGRC
            </span>{' '}
            on-chain video poker contracts can plug in verifiable randomness
            and settle against a casino treasury while reusing this exact UX.
          </div>
        </div>
      </div>
    </div>
  )
}

/* small helper for paytable row */
function FragmentRow({
  row,
  betPerHand,
  isHit,
}: {
  row: PayTableRow
  betPerHand: number
  isHit: boolean
}) {
  return (
    <>
      <div
        className={[
          'py-1 pr-1 text-[10px]',
          isHit ? 'text-[#fef9c3] font-semibold' : 'text-amber-100/80',
        ].join(' ')}
      >
        {row.label}
      </div>
      {row.pays.map((v, idx) => {
        const activeCol = betPerHand === idx + 1
        return (
          <div
            key={`${row.rank}-${idx}`}
            className={[
              'text-right px-1 py-1',
              isHit && activeCol
                ? 'bg-[#facc15]/30 text-[#fef9c3] font-bold rounded-md shadow-[0_0_12px_rgba(250,204,21,0.9)]'
                : activeCol
                ? 'text-amber-100 font-semibold'
                : 'text-amber-100/75',
            ].join(' ')}
          >
            {v}
          </div>
        )
      })}
    </>
  )
}
