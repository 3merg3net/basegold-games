'use client'

import { useEffect, useMemo, useState } from 'react'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2'

type Card = {
  rank: Rank
  suit: Suit
}

type Phase = 'idle' | 'deal' | 'draw'

const RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']
const SUITS: Suit[] = ['♠', '♥', '♦', '♣']

// ---------- helpers ----------

function buildDeck(): Card[] {
  const deck: Card[] = []
  for (const r of RANKS) {
    for (const s of SUITS) {
      deck.push({ rank: r, suit: s })
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function cardValueRankIndex(rank: Rank): number {
  return RANKS.indexOf(rank)
}

type HandRank =
  | 'ROYAL_FLUSH'
  | 'STRAIGHT_FLUSH'
  | 'FOUR_KIND'
  | 'FULL_HOUSE'
  | 'FLUSH'
  | 'STRAIGHT'
  | 'THREE_KIND'
  | 'TWO_PAIR'
  | 'JACKS_OR_BETTER'
  | 'NOTHING'

const PAY_TABLE: Record<HandRank, number> = {
  ROYAL_FLUSH: 250,
  STRAIGHT_FLUSH: 50,
  FOUR_KIND: 25,
  FULL_HOUSE: 9,
  FLUSH: 6,
  STRAIGHT: 4,
  THREE_KIND: 3,
  TWO_PAIR: 2,
  JACKS_OR_BETTER: 1,
  NOTHING: 0,
}

function evaluateHand(hand: Card[]): HandRank {
  if (hand.length !== 5) return 'NOTHING'

  const ranks = hand.map(c => c.rank)
  const suits = hand.map(c => c.suit)
  const isFlush = suits.every(s => s === suits[0])

  // count ranks
  const count: Record<Rank, number> = {
    A: 0,
    K: 0,
    Q: 0,
    J: 0,
    '10': 0,
    '9': 0,
    '8': 0,
    '7': 0,
    '6': 0,
    '5': 0,
    '4': 0,
    '3': 0,
    '2': 0,
  }
  for (const r of ranks) count[r]++

  const uniqueRanks = Object.entries(count).filter(([, v]) => v > 0)
  const counts = uniqueRanks.map(([, v]) => v).sort((a, b) => b - a)

  // Straight detection (A can be high only: 10-J-Q-K-A)
  const sortedIdxs = [...new Set(ranks.map(cardValueRankIndex))].sort((a, b) => a - b)
  let isStraight = false
  if (sortedIdxs.length === 5) {
    // normal straight
    if (sortedIdxs[4] - sortedIdxs[0] === 4) {
      isStraight = true
    }
    // 10-J-Q-K-A
    const highStraight = ['10', 'J', 'Q', 'K', 'A']
    if (highStraight.every(r => ranks.includes(r as Rank))) {
      isStraight = true
    }
  }

  const hasFour = counts[0] === 4
  const hasThree = counts[0] === 3
  const pairCount = counts.filter(c => c === 2).length

  const isRoyal = isFlush && isStraight && ['10', 'J', 'Q', 'K', 'A'].every(r => ranks.includes(r as Rank))

  if (isRoyal) return 'ROYAL_FLUSH'
  if (isFlush && isStraight) return 'STRAIGHT_FLUSH'
  if (hasFour) return 'FOUR_KIND'
  if (hasThree && pairCount === 1) return 'FULL_HOUSE'
  if (isFlush) return 'FLUSH'
  if (isStraight) return 'STRAIGHT'
  if (hasThree) return 'THREE_KIND'
  if (pairCount === 2) return 'TWO_PAIR'

  // Jacks or Better
  if (pairCount === 1) {
    const highPairs: Rank[] = ['A', 'K', 'Q', 'J']
    for (const [r, v] of Object.entries(count) as [Rank, number][]) {
      if (v === 2 && highPairs.includes(r)) {
        return 'JACKS_OR_BETTER'
      }
    }
  }

  return 'NOTHING'
}

function handLabel(rank: HandRank): string {
  switch (rank) {
    case 'ROYAL_FLUSH':
      return 'Royal Flush'
    case 'STRAIGHT_FLUSH':
      return 'Straight Flush'
    case 'FOUR_KIND':
      return 'Four of a Kind'
    case 'FULL_HOUSE':
      return 'Full House'
    case 'FLUSH':
      return 'Flush'
    case 'STRAIGHT':
      return 'Straight'
    case 'THREE_KIND':
      return 'Three of a Kind'
    case 'TWO_PAIR':
      return 'Two Pair'
    case 'JACKS_OR_BETTER':
      return 'Jacks or Better'
    default:
      return 'No Made Hand'
  }
}

// ---------- UI ----------

export default function VideoPokerArcade() {
  const { credits, recordSpin } = useArcadeWallet()

  const [phase, setPhase] = useState<Phase>('idle')
  const [deck, setDeck] = useState<Card[]>(() => buildDeck())
  const [hand, setHand] = useState<Card[]>([])
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false])
  const [bet, setBet] = useState(5)
  const [lastNet, setLastNet] = useState(0)
  const [lastRank, setLastRank] = useState<HandRank>('NOTHING')
  const [status, setStatus] = useState('Tap DEAL to start a hand.')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768)
    }
  }, [])

  const totalBet = bet
  const canDeal = credits >= totalBet && (phase === 'idle' || phase === 'deal')
  const canDraw = phase === 'draw'

  function freshDeckIfNeeded(currentDeck: Card[]): Card[] {
    if (currentDeck.length < 10) return buildDeck()
    return currentDeck
  }

  function deal() {
    if (!canDeal) {
      setStatus('Not enough demo credits for that bet.')
      return
    }

    const newDeck = freshDeckIfNeeded(deck)
    const nextDeck = [...newDeck]

    const newHand: Card[] = []
    for (let i = 0; i < 5; i++) {
      const c = nextDeck.pop()
      if (!c) break
      newHand.push(c)
    }

    // deduct wager once up front
    recordSpin({ wager: totalBet, payout: 0 })

    setDeck(nextDeck)
    setHand(newHand)
    setHeld([false, false, false, false, false])
    setPhase('draw')
    setStatus('Tap cards to HOLD, then hit DRAW.')
    setLastNet(0)
    setLastRank('NOTHING')
  }

  function draw() {
    if (!canDraw) return

    const newDeck = freshDeckIfNeeded(deck)
    const nextDeck = [...newDeck]
    const newHand = [...hand]

    for (let i = 0; i < 5; i++) {
      if (held[i]) continue
      const c = nextDeck.pop()
      if (c) newHand[i] = c
    }

    const rank = evaluateHand(newHand)
    const mult = PAY_TABLE[rank]
    const payout = mult * bet
    const net = payout - totalBet

    if (payout > 0) {
      recordSpin({ wager: 0, payout })
    }

    setDeck(nextDeck)
    setHand(newHand)
    setPhase('deal')
    setLastRank(rank)
    setLastNet(net)
    setStatus(
      mult > 0
        ? `${handLabel(rank)} • Paid ${payout} credits (net ${net >= 0 ? '+' : ''}${net}).`
        : 'No made hand. Tap DEAL for a new hand.'
    )
  }

  const onMainButton = () => {
    if (phase === 'draw') draw()
    else deal()
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-4">
      {/* MOBILE TIP */}
      {isMobile && (
        <div className="mb-3 rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-[11px] text-white/75">
          <span className="font-semibold text-emerald-300">Tip:</span>{' '}
          For best view of all five cards,{' '}
          <span className="font-semibold text-white">rotate your phone sideways</span>.
        </div>
      )}

      <div className="rounded-[24px] border border-yellow-300/40 bg-gradient-to-b from-[#020617] via-black to-[#020617] p-3 sm:p-4 shadow-[0_24px_60px_rgba(0,0,0,0.9)]">
        {/* HEADER / HUD */}
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-[#facc15]/80">
              Video Poker Arcade
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white">
              Jacks or Better
            </div>
            <div className="text-[11px] text-white/60">
              Single-hand, fast-play bar-top vibe using BGRC demo credits.
            </div>
          </div>
          <div className="flex items-end justify-between gap-3 sm:flex-col sm:items-end">
            <div className="rounded-xl border border-white/20 bg-black/70 px-3 py-2 text-right">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                Demo Credits
              </div>
              <div className="text-2xl font-black text-[#fbbf24] tabular-nums">
                {credits.toLocaleString()}
              </div>
            </div>
            <div className="text-right text-[11px] text-white/60">
              <div>
                Last Net:{' '}
                <span
                  className={
                    lastNet > 0
                      ? 'text-emerald-300 font-semibold'
                      : lastNet < 0
                      ? 'text-rose-300 font-semibold'
                      : 'text-slate-200 font-semibold'
                  }
                >
                  {lastNet > 0 ? '+' : ''}
                  {lastNet}
                </span>
              </div>
              <div>
                Last Hand:{' '}
                <span className="text-white/80 font-semibold">
                  {phase === 'idle' && lastRank === 'NOTHING'
                    ? '—'
                    : handLabel(lastRank)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CARDS ROW */}
        <div className="mb-3 overflow-x-auto pb-1">
          <div className="flex items-stretch gap-2 min-w-max mx-auto justify-center">
            {Array.from({ length: 5 }).map((_, i) => {
              const c = hand[i]
              const h = held[i]
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!c || phase === 'idle'}
                  onClick={() => {
                    if (!c || phase !== 'draw') return
                    setHeld(prev => {
                      const next = [...prev]
                      next[i] = !next[i]
                      return next
                    })
                  }}
                  className={[
                    'relative w-[60px] h-[88px] sm:w-[72px] sm:h-[104px] rounded-xl border flex flex-col justify-between p-1.5 bg-white shadow-[0_10px_24px_rgba(0,0,0,0.85)]',
                    c ? 'border-slate-300' : 'border-slate-600/50 bg-slate-900/70',
                    h ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black' : '',
                  ].join(' ')}
                >
                  {c ? (
                    <>
                      <div
                        className={`text-xs font-bold ${
                          c.suit === '♥' || c.suit === '♦'
                            ? 'text-red-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {c.rank}
                        <span className="ml-0.5">{c.suit}</span>
                      </div>
                      <div
                        className={`text-2xl sm:text-3xl text-center ${
                          c.suit === '♥' || c.suit === '♦'
                            ? 'text-red-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {c.suit}
                      </div>
                      <div
                        className={`text-xs font-bold self-end rotate-180 ${
                          c.suit === '♥' || c.suit === '♦'
                            ? 'text-red-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {c.rank}
                        <span className="ml-0.5">{c.suit}</span>
                      </div>
                      {h && (
                        <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 text-[10px] px-2 py-0.5 font-semibold text-emerald-50 shadow-sm">
                          HOLD
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                      —
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* STATUS */}
        <div className="mb-3 rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-[11px] text-white/80">
          {status}
        </div>

        {/* BET + ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Bet selector */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
              Bet per Hand
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {[1, 2, 5, 10, 25].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => phase !== 'draw' && setBet(v)}
                  className={[
                    'rounded-full px-3 py-1.5 text-[11px] font-semibold border',
                    bet === v
                      ? 'border-[#facc15] bg-[#facc15]/20 text-[#fef9c3] shadow-[0_0_14px_rgba(250,204,21,0.8)]'
                      : 'border-white/25 bg-black/50 text-white/80 hover:bg-white/10',
                  ].join(' ')}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Main button */}
          <div className="flex-1 flex flex-col items-stretch gap-2">
            <button
              type="button"
              onClick={onMainButton}
              disabled={(phase === 'idle' || phase === 'deal') ? !canDeal : !canDraw}
              className="h-11 rounded-full bg-gradient-to-r from-[#facc15] via-[#fde68a] to-[#fbbf24] text-black text-sm font-extrabold uppercase tracking-[0.3em] shadow-[0_0_24px_rgba(250,204,21,0.9)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {phase === 'draw' ? 'Draw' : 'Deal'}
            </button>
            <div className="text-[10px] text-white/50 text-right">
              Bet: {bet} credits • {canDeal ? 'Ready' : 'Insufficient credits'}
            </div>
          </div>
        </div>

        {/* MINI PAY TABLE (tight) */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-white/70">
          {(
            [
              'ROYAL_FLUSH',
              'STRAIGHT_FLUSH',
              'FOUR_KIND',
              'FULL_HOUSE',
              'FLUSH',
              'STRAIGHT',
              'THREE_KIND',
              'TWO_PAIR',
              'JACKS_OR_BETTER',
            ] as HandRank[]
          ).map(key => (
            <div
              key={key}
              className="rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 flex items-center justify-between"
            >
              <span>{handLabel(key)}</span>
              <span className="font-semibold text-[#facc15]">
                x{PAY_TABLE[key]}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-2 text-[10px] text-white/45">
          Demo arcade only – no real BGLD. Final odds &amp; pay table may adjust before
          on-chain deployment.
        </div>
      </div>
    </div>
  )
}
