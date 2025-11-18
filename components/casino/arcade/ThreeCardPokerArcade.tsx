'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

const SUITS = ['♠', '♥', '♦', '♣'] as const
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const
type Rank = (typeof RANKS)[number]

// ✅ order we want for straight evaluation (low → high)
const POKER_ORDER: Rank[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
]


type Suit = (typeof SUITS)[number]


type Card = { rank: Rank; suit: Suit }

type Phase = 'betting' | 'decision' | 'settled'
type Decision = 'pending' | 'fold' | 'play'
type HandResult = 'WIN' | 'LOSE' | 'PUSH' | 'FOLD' | 'NO_QUALIFY'

type HandScore = {
  category: number // 1=High,2=Pair,3=Flush,4=Straight,5=Trips,6=StraightFlush
  values: number[] // for tie-break (desc)
}

type PlayerHand = {
  id: number
  seatIndex: number
  cards: Card[]
  ante: number
  pairPlus: number
  playBet: number
  decision: Decision
  result: HandResult | null
  net: number
  pairPlusWin: number
  anteBonusWin: number
  isDone: boolean
}

function randomCard(): Card {
  const r = RANKS[Math.floor(Math.random() * RANKS.length)]
  const s = SUITS[Math.floor(Math.random() * SUITS.length)]
  return { rank: r, suit: s }
}

function pokerRankVal(rank: Rank): number {
  return POKER_ORDER.indexOf(rank)
}

function evaluateThreeCardHand(cards: Card[]): HandScore {
  const vals = cards.map(c => pokerRankVal(c.rank))
  const suits = cards.map(c => c.suit)
  const sortedAsc = [...vals].sort((a, b) => a - b)
  const sortedDesc = [...sortedAsc].sort((a, b) => b - a)

  const isFlush = suits[0] === suits[1] && suits[1] === suits[2]

  // detect straight (with A-2-3 special-case)
  const isWheel = sortedAsc[0] === 0 && sortedAsc[1] === 1 && sortedAsc[2] === 12 // 2,3,A
  let isStraight = false
  let straightHigh = sortedAsc[2]
  if (isWheel) {
    isStraight = true
    straightHigh = 2 // treat A-2-3 as 3-high straight
  } else if (sortedAsc[0] + 1 === sortedAsc[1] && sortedAsc[1] + 1 === sortedAsc[2]) {
    isStraight = true
    straightHigh = sortedAsc[2]
  }

  const counts: Record<number, number> = {}
  for (const v of vals) counts[v] = (counts[v] ?? 0) + 1
  const freq = Object.values(counts).sort((a, b) => b - a)
  const isTrips = freq[0] === 3
  const isPair = freq[0] === 2

  if (isStraight && isFlush) {
    return { category: 6, values: [straightHigh] }
  }
  if (isTrips) {
    const tripVal = Number(Object.keys(counts).find(k => counts[Number(k)] === 3))
    return { category: 5, values: [tripVal] }
  }
  if (isStraight) {
    return { category: 4, values: [straightHigh] }
  }
  if (isFlush) {
    return { category: 3, values: sortedDesc }
  }
  if (isPair) {
    const pairVal = Number(Object.keys(counts).find(k => counts[Number(k)] === 2))
    const kicker = Number(Object.keys(counts).find(k => counts[Number(k)] === 1))
    return { category: 2, values: [pairVal, kicker] }
  }
  return { category: 1, values: sortedDesc }
}

function compareScores(a: HandScore, b: HandScore): number {
  if (a.category !== b.category) return a.category - b.category
  const len = Math.max(a.values.length, b.values.length)
  for (let i = 0; i < len; i++) {
    const va = a.values[i] ?? 0
    const vb = b.values[i] ?? 0
    if (va !== vb) return va - vb
  }
  return 0
}

function pairPlusMultiplier(category: number): number {
  switch (category) {
    case 6: // straight flush
      return 40
    case 5: // trips
      return 30
    case 4: // straight
      return 6
    case 3: // flush
      return 3
    case 2: // pair
      return 1
    default:
      return 0
  }
}

function anteBonusMultiplier(category: number): number {
  switch (category) {
    case 6: // straight flush
      return 5
    case 5: // trips
      return 4
    case 4: // straight
      return 1
    default:
      return 0
  }
}

function resultLabel(r: HandResult | null): string {
  switch (r) {
    case 'WIN':
      return 'WIN'
    case 'LOSE':
      return 'LOSE'
    case 'PUSH':
      return 'PUSH'
    case 'FOLD':
      return 'FOLD'
    case 'NO_QUALIFY':
      return 'NO QUALIFY'
    default:
      return ''
  }
}

export default function ThreeCardPokerArcade() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { credits: arcadeCredits, net: arcadeNet, addWin, addLoss } = useArcadeWallet()

  // Local table credits (per machine)
  const [credits, setCredits] = useState(500)
  const [sessionPnL, setSessionPnL] = useState(0)
  const [syncedPnL, setSyncedPnL] = useState(0)

  // sync table PnL into global arcade stack
  useEffect(() => {
    if (!mounted) return
    const delta = sessionPnL - syncedPnL
    if (delta === 0) return
    if (delta > 0) addWin(delta, { game: 'three-card-poker' })
    else addLoss(-delta, { game: 'three-card-poker' })
    setSyncedPnL(sessionPnL)
  }, [sessionPnL, syncedPnL, mounted, addWin, addLoss])

  const [phase, setPhase] = useState<Phase>('betting')
  const [seatCount, setSeatCount] = useState(3)
  const MAX_SEATS = 4

  const [anteBet, setAnteBet] = useState(10)
  const [pairPlusBet, setPairPlusBet] = useState(5)
  const MIN_BET = 1
  const MAX_BET = 200

  const [dealerCards, setDealerCards] = useState<Card[]>([])
  const [dealerReveal, setDealerReveal] = useState(false)
  const [hands, setHands] = useState<PlayerHand[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [handIdSeq, setHandIdSeq] = useState(1)

  const [tableMessage, setTableMessage] = useState<string>(
    'Set your Ante, optional Pair Plus, choose seats, then DEAL.'
  )

  const [lastNet, setLastNet] = useState(0)
  const [lastReturned, setLastReturned] = useState(0)
  const [lastSummary, setLastSummary] = useState<string>('—')

  const priceUsd: number | null = null
  const approxUsd = (v: number) =>
    priceUsd ? `~$${(v * priceUsd).toFixed(v * priceUsd < 1 ? 4 : 2)}` : ''

  const activeHands = hands.filter(h => h.ante > 0)
  const currentHand = hands[currentIndex] ?? null

  const dealerScore = useMemo(
    () => (dealerCards.length === 3 ? evaluateThreeCardHand(dealerCards) : null),
    [dealerCards]
  )

  const dealerHighestRank = useMemo(() => {
    if (!dealerCards.length) return null
    const vals = dealerCards.map(c => pokerRankVal(c.rank))
    return Math.max(...vals)
  }, [dealerCards])

  const dealerQualifies = dealerHighestRank != null && dealerHighestRank >= pokerRankVal('Q')

  const canDeal =
    phase === 'betting' &&
    anteBet >= MIN_BET &&
    anteBet <= MAX_BET &&
    seatCount > 0 &&
    credits >= (anteBet + Math.max(pairPlusBet, 0)) * seatCount

  const canActOnHand =
    phase === 'decision' && !!currentHand && !currentHand.isDone && currentHand.decision === 'pending'

  const canFold = canActOnHand
  const canPlay =
    canActOnHand &&
    credits >= currentHand!.ante // need to place Play bet equal to Ante

  function resetTable() {
    setPhase('betting')
    setDealerCards([])
    setDealerReveal(false)
    setHands([])
    setCurrentIndex(0)
    setTableMessage('Fresh layout. Set your Ante and seats, then DEAL.')
    setLastNet(0)
    setLastReturned(0)
    setLastSummary('—')
  }

  function dealRound() {
    if (!canDeal) return

    const totalStakePerSeat = anteBet + Math.max(pairPlusBet, 0)
    const totalStake = totalStakePerSeat * seatCount

    setCredits(c => c - totalStake)

    const newHands: PlayerHand[] = []
    let nextId = handIdSeq

    for (let seat = 0; seat < seatCount; seat++) {
      const cards = [randomCard(), randomCard(), randomCard()]
      newHands.push({
        id: nextId++,
        seatIndex: seat,
        cards,
        ante: anteBet,
        pairPlus: pairPlusBet > 0 ? pairPlusBet : 0,
        playBet: 0,
        decision: 'pending',
        result: null,
        net: 0,
        pairPlusWin: 0,
        anteBonusWin: 0,
        isDone: false,
      })
    }

    const dealer = [randomCard(), randomCard(), randomCard()]
    setDealerCards(dealer)
    setDealerReveal(false)
    setHands(newHands)
    setHandIdSeq(nextId)
    setPhase('decision')
    setCurrentIndex(0)
    setTableMessage('Seat 1: Fold or Play?')
    setLastNet(0)
    setLastReturned(0)
    setLastSummary('—')
  }

  function advanceToNextHandOrDealer(updatedHands: PlayerHand[]) {
    let idx = currentIndex + 1
    while (idx < updatedHands.length && updatedHands[idx].isDone) {
      idx++
    }

    if (idx < updatedHands.length) {
      setCurrentIndex(idx)
      setHands(updatedHands)
      setTableMessage(`Seat ${idx + 1}: Fold or Play?`)
    } else {
      setHands(updatedHands)
      startDealerReveal(updatedHands)
    }
  }

  function startDealerReveal(handsSnapshot: PlayerHand[]) {
    setDealerReveal(true)
    setTableMessage('Dealer reveals… resolving all hands.')
    settleRound(handsSnapshot)
  }

  function settleRound(handsSnapshot: PlayerHand[]) {
    if (dealerCards.length !== 3) {
      setPhase('settled')
      setTableMessage('Round complete. Tap NEW ROUND.')
      return
    }

    const dScore = evaluateThreeCardHand(dealerCards)
    const dQual = dealerQualifies

    let totalReturned = 0
    let netChange = 0

    const resolved: PlayerHand[] = handsSnapshot.map(h => {
      const initialStake = h.ante + h.pairPlus + h.playBet
      let returned = 0
      let pairPlusWin = 0
      let anteBonusWin = 0
      let result: HandResult = 'LOSE'

      const pScore = evaluateThreeCardHand(h.cards)

      // Pair Plus resolution
      if (h.pairPlus > 0) {
        const mult = pairPlusMultiplier(pScore.category)
        if (mult > 0) {
          pairPlusWin = h.pairPlus * mult
          returned += h.pairPlus + pairPlusWin
        }
        // if no win, pairPlus is lost
      }

      // Ante bonus
      const abMult = anteBonusMultiplier(pScore.category)
      if (abMult > 0) {
        anteBonusWin = h.ante * abMult
        returned += anteBonusWin
      }

      if (h.decision === 'fold') {
        // Fold: ante is lost, play not placed, pair plus handled above
        result = 'FOLD'
      } else if (h.decision === 'play') {
        if (!dQual) {
          // Dealer does not qualify: Ante pays 1:1, Play pushes
          returned += h.ante * 2 // ante + win
          if (h.playBet > 0) {
            returned += h.playBet // push
          }
          result = 'NO_QUALIFY'
        } else {
          const cmp = compareScores(pScore, dScore)
          if (cmp > 0) {
            // Player wins: Ante + Play pay 1:1
            returned += h.ante * 2
            if (h.playBet > 0) returned += h.playBet * 2
            result = 'WIN'
          } else if (cmp === 0) {
            // Tie: push both
            returned += h.ante
            if (h.playBet > 0) returned += h.playBet
            result = 'PUSH'
          } else {
            // Dealer wins: ante + play lost (already staked)
            result = 'LOSE'
          }
        }
      }

      const handNet = returned - initialStake
      totalReturned += returned
      netChange += handNet

      return {
        ...h,
        result,
        net: handNet,
        pairPlusWin,
        anteBonusWin,
        isDone: true,
      }
    })

    setHands(resolved)
    setCredits(c => c + totalReturned)
    setSessionPnL(prev => prev + netChange)
    setLastNet(netChange)
    setLastReturned(totalReturned)
    setLastSummary(
      netChange > 0
        ? `Net +${netChange.toFixed(2)} BGRC`
        : netChange < 0
        ? `Net ${netChange.toFixed(2)} BGRC`
        : 'Round pushed overall.'
    )
    setPhase('settled')
    setTableMessage('Round complete. Tap NEW ROUND to reset bets.')
  }

  function handleFold() {
    if (!canFold || !currentHand) return
    const idx = currentIndex
    const updated = [...hands]
    updated[idx] = {
      ...updated[idx],
      decision: 'fold',
      isDone: true,
    }
    setHands(updated)
    setTableMessage(`Seat ${idx + 1} folds. Moving to next seat…`)
    setTimeout(() => advanceToNextHandOrDealer(updated), 450)
  }

  function handlePlay() {
    if (!canPlay || !currentHand) return
    const idx = currentIndex
    const updated = [...hands]
    const h = { ...updated[idx] }

    setCredits(c => c - h.ante)
    h.playBet = h.ante
    h.decision = 'play'
    h.isDone = true
    updated[idx] = h

    setHands(updated)
    setTableMessage(`Seat ${idx + 1} presses PLAY. Moving to next seat…`)
    setTimeout(() => advanceToNextHandOrDealer(updated), 450)
  }

  function handleNewRound() {
    resetTable()
  }

  function renderCard(card: Card | null, faceDown?: boolean) {
    if (!card || faceDown) {
      return (
        <div className="w-[60px] h-[88px] md:w-[72px] md:h-[104px] rounded-xl border border-emerald-300/60 bg-[repeating-linear-gradient(135deg,#0b1120,#0b1120_6px,#1f2937_6px,#1f2937_12px)] shadow-[0_8px_26px_rgba(0,0,0,0.9)]" />
      )
    }
    const isRed = card.suit === '♥' || card.suit === '♦'
    return (
      <div className="w-[60px] h-[88px] md:w-[72px] md:h-[104px] rounded-xl bg-white border border-slate-300 shadow-[0_10px_28px_rgba(0,0,0,0.9)] flex flex-col justify-between p-2">
        <div className={['text-xs font-bold', isRed ? 'text-red-600' : 'text-slate-900'].join(' ')}>
          {card.rank}
          <span className="ml-0.5">{card.suit}</span>
        </div>
        <div
          className={[
            'text-2xl md:text-3xl text-center',
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
    )
  }

  function renderChipStack(amount: number) {
    if (amount <= 0) return null

    const chips: { value: number; src: string }[] = []
    let remaining = amount
    const denomOrder = [
      { value: 100, src: '/chips/chip-bgrc-100.png' },
      { value: 50, src: '/chips/chip-bgrc-50.png' },
      { value: 25, src: '/chips/chip-bgrc-25.png' },
      { value: 10, src: '/chips/chip-bgrc-10.png' },
      { value: 1, src: '/chips/chip-bgrc-1.png' },
    ]

    for (const d of denomOrder) {
      while (remaining >= d.value && chips.length < 6) {
        chips.push({ value: d.value, src: d.src })
        remaining -= d.value
      }
    }

    return (
      <div className="flex flex-col items-center justify-end gap-1 ml-1">
        {chips.map((c, i) => (
          <div
            key={`${c.value}-${i}`}
            className="relative w-7 h-7 md:w-8 md:h-8 -mt-2 first:mt-0"
          >
            <Image
              src={c.src}
              alt={`${c.value} BGRC`}
              fill
              className="object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]"
            />
          </div>
        ))}
        <div className="mt-1 text-[10px] font-semibold text-[#fef3c7]">
          {amount} BGRC
        </div>
      </div>
    )
  }

  const left = (
    <div className="relative rounded-[28px] border border-emerald-400/40 bg-[radial-gradient(circle_at_10%_0%,#064e3b,transparent_55%),radial-gradient(circle_at_90%_0%,#047857,transparent_55%),#022c22] shadow-[0_22px_55px_rgba(0,0,0,0.95)] p-4 md:p-5 overflow-hidden">
      {/* glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-28 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.4),transparent_65%)]" />

      {/* header */}
      <div className="relative z-10 flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] tracking-[0.32em] uppercase text-emerald-100/85 font-semibold">
            BASE GOLD RUSH
          </div>
          <div className="mt-1 text-xl md:text-2xl font-extrabold text-emerald-50">
            Three Card Poker (Arcade)
          </div>
          <div className="text-[11px] text-emerald-100/80">
            Ante &amp; Play vs dealer • Pair Plus side bet • Multi-seat layout
          </div>
        </div>
        <div className="text-right text-[11px] text-emerald-100/75 space-y-1">
          <div>
            Table Credits:{' '}
            <span className="font-bold text-[#facc15]">
              {credits.toLocaleString()} BGRC
            </span>
          </div>
          <div className="text-[10px]">
            Table P&amp;L:{' '}
            <span
              className={
                sessionPnL >= 0 ? 'text-emerald-200 font-semibold' : 'text-rose-300 font-semibold'
              }
            >
              {sessionPnL >= 0 ? '+' : ''}
              {sessionPnL.toFixed(2)} BGRC
            </span>
          </div>
          <button
            onClick={resetTable}
            className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-100 hover:bg-emerald-500/10"
          >
            New Layout
          </button>
        </div>
      </div>

      {/* dealer rail */}
      <div className="relative z-10 rounded-3xl border border-emerald-300/45 bg-[radial-gradient(circle_at_50%_0%,#065f46,#022c22_65%,#01120f_100%)] px-4 pt-4 pb-5 md:px-6 md:pt-5 md:pb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-50/85">
            Dealer
          </div>
          <div className="text-[11px] text-emerald-100/80">
            {dealerCards.length > 0 && dealerReveal
              ? `Qualifies: ${dealerQualifies ? 'Yes' : 'No'}`
              : dealerCards.length > 0
              ? 'Awaiting decisions…'
              : 'Waiting for deal'}
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          {renderCard(dealerCards[0] ?? null, !dealerReveal)}
          {renderCard(dealerCards[1] ?? null, !dealerReveal)}
          {renderCard(dealerCards[2] ?? null, !dealerReveal)}
          <div className="flex-1 ml-2">
            <div className="text-[11px] text-emerald-100/85 min-h-[2rem]">
              {tableMessage}
            </div>
            {lastSummary && (
              <div className="mt-1 text-[11px] text-amber-100/80">
                {lastSummary}
              </div>
            )}
          </div>
        </div>

        {/* player arc */}
        <div className="mt-6 space-y-4">
          {/* seats + controls */}
          <div className="flex items-center justify-between text-[11px] text-emerald-100/80">
            <div>
              Seats in play:{' '}
              <span className="font-semibold text-emerald-50">{seatCount}</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setSeatCount(s => (s > 1 ? s - 1 : s))}
                disabled={phase !== 'betting' || seatCount <= 1}
                className="px-2 py-1 rounded-full border border-emerald-200/60 bg-black/40 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                − Seat
              </button>
              <button
                onClick={() => setSeatCount(s => (s < MAX_SEATS ? s + 1 : s))}
                disabled={phase !== 'betting' || seatCount >= MAX_SEATS}
                className="px-2 py-1 rounded-full border border-emerald-200/60 bg-black/40 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Seat
              </button>
            </div>
          </div>

          {/* seat pods */}
          <div className="flex justify-center gap-4 md:gap-6 flex-wrap">
            {Array.from({ length: seatCount }).map((_, idx) => {
              const hand = hands[idx]
              const isActive =
                phase === 'decision' && hand && !hand.isDone && idx === currentIndex
              const label = `Seat ${idx + 1}`

              return (
                <div
                  key={idx}
                  className={[
                    'relative flex flex-col items-center gap-2 px-3 py-3 rounded-2xl border bg-[radial-gradient(circle_at_50%_0%,rgba(6,95,70,0.9),rgba(6,78,59,0.96))] transition-shadow',
                    hand
                      ? 'border-emerald-200/80 shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                      : 'border-emerald-900/60 border-dashed bg-black/25',
                  ].join(' ')}
                  style={{ minWidth: '140px' }}
                >
                  <div className="flex items-center justify-between w-full text-[10px] text-emerald-100/85">
                    <span className="uppercase tracking-[0.22em]">{label}</span>
                    {hand && (
                      <span className="font-semibold">
                        {evaluateThreeCardHand(hand.cards).category >= 2
                          ? `Rank: ${['—', 'High', 'Pair', 'Flush', 'Straight', 'Trips', 'Str Flush'][evaluateThreeCardHand(hand.cards).category] ?? '—'}`
                          : 'High Card'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex items-center gap-1">
                      {hand
                        ? hand.cards.map((c, i) => (
                            <div
                              key={i}
                              className={isActive ? 'animate-pulse' : ''}
                            >
                              {renderCard(c)}
                            </div>
                          ))
                        : (
                          <>
                            {renderCard(null)}
                            {renderCard(null)}
                            {renderCard(null)}
                          </>
                        )}
                    </div>
                    {hand && renderChipStack(hand.ante + hand.playBet + hand.pairPlus)}
                  </div>

                  {hand && (
                    <div className="w-full flex flex-col gap-1 text-[10px] text-emerald-50">
                      <div className="flex items-center justify-between">
                        <span>Ante: {hand.ante}</span>
                        <span>Play: {hand.playBet > 0 ? hand.playBet : '--'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Pair Plus: {hand.pairPlus || 0}</span>
                        <span>
                          Net:{' '}
                          <span
                            className={
                              hand.net >= 0
                                ? 'text-emerald-200 font-semibold'
                                : 'text-rose-200 font-semibold'
                            }
                          >
                            {hand.net >= 0 ? '+' : ''}
                            {hand.net.toFixed(2)}
                          </span>
                        </span>
                      </div>
                      {hand.result && (
                        <div className="mt-0.5 inline-flex items-center justify-center rounded-full bg-black/45 border border-emerald-200/70 px-2 py-0.5 uppercase tracking-[0.22em]">
                          {resultLabel(hand.result)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* action rail */}
          <div className="mt-2 rounded-2xl border border-emerald-200/50 bg-black/60 px-3 py-3 flex flex-col gap-3">
            {/* betting controls */}
            <div className="flex flex-col gap-2 text-[11px] text-emerald-100/85">
              <div className="flex items-center justify-between">
                <span>
                  Ante Bet:{' '}
                  <span className="font-bold text-[#facc15]">
                    {anteBet.toLocaleString()} BGRC
                  </span>
                  {approxUsd(anteBet) && (
                    <span className="ml-1 text-[10px] text-emerald-100/70">
                      ({approxUsd(anteBet)})
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-emerald-100/60">
                  Min {MIN_BET} • Max {MAX_BET}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 25, 50, 100].map(v => (
                  <button
                    key={v}
                    onClick={() => setAnteBet(v)}
                    disabled={phase !== 'betting'}
                    className={[
                      'px-3 py-1 rounded-full border text-[11px] font-semibold',
                      anteBet === v
                        ? 'border-[#facc15] bg-[#facc15]/20 text-[#fef3c7]'
                        : 'border-emerald-300/40 bg-emerald-900/40 text-emerald-100',
                      phase !== 'betting' ? 'opacity-40 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    {v}
                  </button>
                ))}
                <button
                  onClick={() => setAnteBet(Math.max(MIN_BET, anteBet - 5))}
                  disabled={phase !== 'betting'}
                  className="px-3 py-1 rounded-full border border-emerald-300/60 bg-black/40 text-[11px] text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  -5
                </button>
                <button
                  onClick={() => setAnteBet(Math.min(MAX_BET, anteBet + 5))}
                  disabled={phase !== 'betting'}
                  className="px-3 py-1 rounded-full border border-emerald-300/60 bg-black/40 text-[11px] text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +5
                </button>
                <button
                  onClick={() => setAnteBet(MIN_BET)}
                  disabled={phase !== 'betting'}
                  className="px-3 py-1 rounded-full border border-emerald-300/60 bg-black/40 text-[11px] text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span>
                  Pair Plus:{' '}
                  <span className="font-bold text-emerald-100">
                    {pairPlusBet > 0 ? `${pairPlusBet} BGRC` : 'Off'}
                  </span>
                </span>
                <span className="text-[10px] text-emerald-100/60">
                  Pays on Pair or better, independent of dealer.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[0, 5, 10, 25].map(v => (
                  <button
                    key={v}
                    onClick={() => setPairPlusBet(v)}
                    disabled={phase !== 'betting'}
                    className={[
                      'px-3 py-1 rounded-full border text-[11px] font-semibold',
                      pairPlusBet === v
                        ? 'border-emerald-300 bg-emerald-400/25 text-emerald-50'
                        : 'border-emerald-300/40 bg-black/40 text-emerald-100',
                      phase !== 'betting' ? 'opacity-40 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    {v === 0 ? 'Off' : v}
                  </button>
                ))}
              </div>
            </div>

            {/* action buttons */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm pt-1">
              <button
                onClick={dealRound}
                disabled={!canDeal || phase !== 'betting'}
                className="col-span-2 md:col-span-1 h-10 rounded-lg bg-gradient-to-b from-[#facc15] to-[#f59e0b] text-black font-extrabold text-xs tracking-[0.16em] uppercase shadow-[0_0_20px_rgba(250,204,21,0.9)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Deal
              </button>
              <button
                onClick={handleFold}
                disabled={!canFold}
                className="h-10 rounded-lg border border-rose-400/70 bg-rose-900/85 text-rose-50 font-semibold text-[11px] tracking-[0.16em] uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Fold
              </button>
              <button
                onClick={handlePlay}
                disabled={!canPlay}
                className="h-10 rounded-lg border border-emerald-300/80 bg-emerald-600/95 text-white font-semibold text-[11px] tracking-[0.16em] uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Play
              </button>
              <button
                onClick={() => startDealerReveal(hands)}
                disabled={phase !== 'decision' || activeHands.length === 0}
                className="h-10 rounded-lg border border-slate-300/80 bg-slate-900/90 text-white font-semibold text-[11px] tracking-[0.16em] uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Reveal Dealer
              </button>
              <button
                onClick={handleNewRound}
                disabled={phase !== 'settled'}
                className="h-10 rounded-lg border border-white/25 bg-black/75 text-white text-[11px] font-semibold tracking-[0.16em] uppercase disabled:opacity-30 disabled:cursor-not-allowed col-span-2 md:col-span-1"
              >
                New Round
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const right = (
    <div className="rounded-2xl border border-white/12 bg-gradient-to-b from-[#111827] via-[#020617] to-black p-4 md:p-5 space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-[0.26em] text-white/60">
          GAME SUMMARY
        </div>
        <div className="mt-1 text-lg font-bold text-white">
          Three Card Poker (BGRC Arcade)
        </div>
        <div className="mt-1 text-xs text-white/70">
          Fully local demo of Three Card Poker flow before wiring into a Base Gold Rush
          V4 on-chain contract. All values are{' '}
          <span className="font-semibold">BGRC demo credits</span>.
        </div>
      </div>

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
            Shared demo bank across all arcade games.
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
            Total demo P&amp;L since you opened the arcade.
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/14 bg-black/40 p-3 text-xs space-y-2">
        <div className="text-sm font-semibold text-white">
          Table Rules (Demo)
        </div>
        <ul className="space-y-1 text-white/70 list-disc list-inside">
          <li>Three-card poker vs house dealer</li>
          <li>Ante &amp; Play bets, dealer qualifies with Q-high or better</li>
          <li>Dealer not qualifying: Ante pays 1:1, Play pushes</li>
          <li>Pair Plus pays on Pair or better, independent of dealer</li>
          <li>Ante Bonus pays for Straight or better regardless of outcome</li>
        </ul>
        <div className="text-[11px] text-white/50 pt-1">
          Pure front-end demo to dial in flow, payouts, and multiplayer UX. Final{' '}
          <span className="font-semibold text-[#facc15]">BGLD / BGRC</span> contracts
          on Base will mirror these mechanics with verifiable randomness and
          contract-enforced payouts.
        </div>
      </div>
    </div>
  )

  return (
    <div className="grid md:grid-cols-[minmax(360px,1.3fr)_360px] gap-6 items-start">
      {left}
      {right}
    </div>
  )
}
