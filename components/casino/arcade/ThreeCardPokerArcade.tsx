'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

const SUITS = ['♠', '♥', '♦', '♣'] as const
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const
type Rank = (typeof RANKS)[number]
type Suit = (typeof SUITS)[number]

// low → high for straight logic
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

type Card = { rank: Rank; suit: Suit }

type Phase = 'betting' | 'decision' | 'settled'
type Decision = 'pending' | 'fold' | 'play'
type HandResult = 'WIN' | 'LOSE' | 'PUSH' | 'FOLD' | 'NO_QUALIFY'

type HandScore = {
  category: number // 1=High,2=Pair,3=Flush,4=Straight,5=Trips,6=StraightFlush
  values: number[] // tie-breakers
}

type PlayerHand = {
  id: number
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

/* ---------- helpers ---------- */

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

  // straight detection with A-2-3 wheel
  const isWheel =
    sortedAsc[0] === 0 && sortedAsc[1] === 1 && sortedAsc[2] === 12 // 2,3,A
  let isStraight = false
  let straightHigh = sortedAsc[2]
  if (isWheel) {
    isStraight = true
    straightHigh = 2
  } else if (
    sortedAsc[0] + 1 === sortedAsc[1] &&
    sortedAsc[1] + 1 === sortedAsc[2]
  ) {
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

/* ---------- main component ---------- */

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

    if (delta > 0) addWin(delta)
    else addLoss(-delta)

    setSyncedPnL(sessionPnL)
  }, [sessionPnL, syncedPnL, mounted, addWin, addLoss])

  const [phase, setPhase] = useState<Phase>('betting')

  const [anteBet, setAnteBet] = useState(10)
  const [pairPlusBet, setPairPlusBet] = useState(5)
  const MIN_BET = 1
  const MAX_BET = 200

  const [dealerCards, setDealerCards] = useState<Card[]>([])
  const [dealerReveal, setDealerReveal] = useState(false)

  // single hand (no multiplayer)
  const [hands, setHands] = useState<PlayerHand[]>([])
  const [handIdSeq, setHandIdSeq] = useState(1)

  const [tableMessage, setTableMessage] = useState<string>(
    'Set your Ante, optional Pair Plus, then DEAL.'
  )

  const [lastNet, setLastNet] = useState(0)
  const [lastReturned, setLastReturned] = useState(0)
  const [lastSummary, setLastSummary] = useState<string>('—')

  const priceUsd: number | null = null
  const approxUsd = (v: number) =>
    priceUsd ? `~$${(v * priceUsd).toFixed(v * priceUsd < 1 ? 4 : 2)}` : ''

  const currentHand = hands[0] ?? null

  const dealerScore = useMemo(
    () => (dealerCards.length === 3 ? evaluateThreeCardHand(dealerCards) : null),
    [dealerCards]
  )

  const dealerHighestRank = useMemo(() => {
    if (!dealerCards.length) return null
    const vals = dealerCards.map(c => pokerRankVal(c.rank))
    return Math.max(...vals)
  }, [dealerCards])

  const dealerQualifies =
    dealerHighestRank != null && dealerHighestRank >= pokerRankVal('Q')

    const stakeReady =
    anteBet >= MIN_BET &&
    anteBet <= MAX_BET &&
    credits >= anteBet + Math.max(pairPlusBet, 0)

  const canPrimaryDeal =
    (phase === 'betting' || phase === 'settled') && stakeReady


  const canActOnHand =
    phase === 'decision' &&
    !!currentHand &&
    !currentHand.isDone &&
    currentHand.decision === 'pending'

  const canFold = canActOnHand
  const canPlay =
    canActOnHand &&
    credits >= (currentHand?.ante ?? 0) // need to fund Play bet

  /* ---------- game flow ---------- */

  function resetTable() {
    setPhase('betting')
    setDealerCards([])
    setDealerReveal(false)
    setHands([])
    setTableMessage('Fresh layout. Set your Ante, then DEAL.')
    setLastNet(0)
    setLastReturned(0)
    setLastSummary('—')
  }

  function dealRound() {
    if (!stakeReady) return

    const totalStake = anteBet + Math.max(pairPlusBet, 0)
    setCredits(c => c - totalStake)

    const cards = [randomCard(), randomCard(), randomCard()]
    const newHand: PlayerHand = {
      id: handIdSeq,
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
    }

    const dealer = [randomCard(), randomCard(), randomCard()]
    setDealerCards(dealer)
    setDealerReveal(false)
    setHands([newHand])
    setHandIdSeq(prev => prev + 1)
    setPhase('decision')
    setTableMessage('Look at your hand: Fold or Play?')
    setLastNet(0)
    setLastReturned(0)
    setLastSummary('—')
  }

  function startDealerReveal(handsSnapshot: PlayerHand[]) {
    setDealerReveal(true)
    setTableMessage('Dealer reveals… resolving hand.')
    settleRound(handsSnapshot)
  }

  function settleRound(handsSnapshot: PlayerHand[]) {
    if (dealerCards.length !== 3 || handsSnapshot.length === 0) {
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

      // Pair Plus
      if (h.pairPlus > 0) {
        const mult = pairPlusMultiplier(pScore.category)
        if (mult > 0) {
          pairPlusWin = h.pairPlus * mult
          returned += h.pairPlus + pairPlusWin
        }
      }

      // Ante Bonus
      const abMult = anteBonusMultiplier(pScore.category)
      if (abMult > 0) {
        anteBonusWin = h.ante * abMult
        returned += anteBonusWin
      }

      if (h.decision === 'fold') {
        result = 'FOLD'
      } else if (h.decision === 'play') {
        if (!dQual) {
          // Dealer no qualify → Ante pays 1:1, Play pushes
          returned += h.ante * 2 // ante + win
          if (h.playBet > 0) returned += h.playBet
          result = 'NO_QUALIFY'
        } else {
          const cmp = compareScores(pScore, dScore)
          if (cmp > 0) {
            // Player wins: Ante + Play pay 1:1
            returned += h.ante * 2
            if (h.playBet > 0) returned += h.playBet * 2
            result = 'WIN'
          } else if (cmp === 0) {
            // Tie: push Ante + Play
            returned += h.ante
            if (h.playBet > 0) returned += h.playBet
            result = 'PUSH'
          } else {
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
    setTableMessage('Round complete. Tap DEAL NEXT HAND to reset bets.')
  }

  function handleFold() {
    if (!canFold || !currentHand) return
    const updated = [...hands]
    updated[0] = {
      ...updated[0],
      decision: 'fold',
      isDone: true,
    }
    setHands(updated)
    setTableMessage('You fold. Dealer reveals…')
    setTimeout(() => startDealerReveal(updated), 450)
  }

  function handlePlay() {
    if (!canPlay || !currentHand) return
    const updated = [...hands]
    const h = { ...updated[0] }

    setCredits(c => c - h.ante)
    h.playBet = h.ante
    h.decision = 'play'
    h.isDone = true
    updated[0] = h

    setHands(updated)
    setTableMessage('You press PLAY. Dealer reveals…')
    setTimeout(() => startDealerReveal(updated), 450)
  }

  function handleNewRound() {
    resetTable()
  }

    function handlePrimaryDeal() {
    if (!stakeReady) return

    if (phase === 'settled') {
      // reset state then deal fresh
      resetTable()
      setTimeout(() => {
        dealRound()
      }, 0)
    } else {
      dealRound()
    }
  }


  /* ---------- render helpers ---------- */

  function renderCard(card: Card | null, faceDown?: boolean) {
    if (!card || faceDown) {
      return (
        <div className="w-[60px] h-[88px] md:w-[72px] md:h-[104px] rounded-xl border border-emerald-300/60 bg-[repeating-linear-gradient(135deg,#0b1120,#0b1120_6px,#1f2937_6px,#1f2937_12px)] shadow-[0_8px_26px_rgba(0,0,0,0.9)]" />
      )
    }
    const isRed = card.suit === '♥' || card.suit === '♦'
    return (
      <div className="w-[60px] h-[88px] md:w-[72px] md:h-[104px] rounded-xl bg-white border border-slate-300 shadow-[0_10px_28px_rgba(0,0,0,0.9)] flex flex-col justify-between p-2">
        <div
          className={['text-xs font-bold', isRed ? 'text-red-600' : 'text-slate-900'].join(' ')}
        >
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

  const rankLabelForHand = (h: PlayerHand | null) => {
    if (!h) return '--'
    const score = evaluateThreeCardHand(h.cards)
    const labels = ['—', 'High Card', 'Pair', 'Flush', 'Straight', 'Trips', 'Str Flush']
    return labels[score.category] ?? '—'
  }

  /* ---------- hydration guard ---------- */

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-10 text-xs text-white/60">
        Initializing three card poker…
      </div>
    )
  }

  /* ---------- LAYOUT (single column: header → table → rules) ---------- */

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* HEADER: title + arcade summary */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-black/70 via-[#020617] to-black/80 p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[11px] tracking-[0.32em] uppercase text-emerald-100/85 font-semibold">
            BASE GOLD RUSH
          </div>
          <div className="mt-1 text-xl md:text-2xl font-extrabold text-white">
            Three Card Poker <span className="text-[#facc15]">• Arcade</span>
          </div>
          <div className="text-[11px] text-emerald-100/80">
            Ante &amp; Play vs dealer • Pair Plus side bet
          </div>
          <div className="mt-2 text-[11px] text-emerald-100/75">
            Table Credits:{' '}
            <span className="font-bold text-[#facc15]">
              {credits.toLocaleString()} BGRC
            </span>
            <span className="ml-3">
              Table P&amp;L:{' '}
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
            </span>
          </div>
          <button
            onClick={resetTable}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-100 hover:bg-emerald-500/10"
          >
            New Layout
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs w-full md:w-auto">
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
      </div>

      {/* TABLE: dealer directly above player in single box */}
      <div className="relative rounded-[28px] border border-emerald-400/40 bg-[radial-gradient(circle_at_10%_0%,#064e3b,transparent_55%),radial-gradient(circle_at_90%_0%,#047857,transparent_55%),#022c22] shadow-[0_22px_55px_rgba(0,0,0,0.95)] p-4 md:p-5 space-y-4 overflow-hidden">
        {/* glow */}
        <div className="pointer-events-none absolute inset-x-0 -top-10 h-28 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.4),transparent_65%)]" />

        <div className="relative z-10 space-y-4">
          {/* Dealer rail (centered, lowered) */}
          <div className="rounded-3xl border border-emerald-300/45 bg-[radial-gradient(circle_at_50%_0%,#065f46,#022c22_65%,#01120f_100%)] px-4 pt-4 pb-3 md:px-6 md:pt-4 md:pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-50/85">
                Dealer
              </div>
              <div className="text-[11px] text-emerald-100/80">
                {dealerCards.length > 0 && dealerReveal
                  ? `Qualifies: ${dealerQualifies ? 'Yes' : 'No'}`
                  : dealerCards.length > 0
                  ? 'Awaiting Fold / Play…'
                  : 'Waiting for deal'}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex items-end gap-2 md:gap-3">
                {renderCard(dealerCards[0] ?? null, !dealerReveal)}
                {renderCard(dealerCards[1] ?? null, !dealerReveal)}
                {renderCard(dealerCards[2] ?? null, !dealerReveal)}
              </div>
              <div className="w-full text-center">
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
          </div>

          {/* Player hand directly below dealer */}
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-50/80 text-center">
              Your Hand
            </div>

            <div className="flex justify-center">
              {currentHand ? (
                <div
                  className="relative flex flex-col items-center gap-2 px-3 py-3 rounded-2xl border bg-[radial-gradient(circle_at_50%_0%,rgba(6,95,70,0.9),rgba(6,78,59,0.96))] border-emerald-200/80 shadow-[0_0_20px_rgba(16,185,129,0.6)]"
                  style={{ minWidth: '160px' }}
                >
                  <div className="flex items-center justify-between w-full text-[10px] text-emerald-100/85">
                    <span className="uppercase tracking-[0.22em]">Player</span>
                    <span className="font-semibold">
                      {rankLabelForHand(currentHand)}
                    </span>
                  </div>

                  <div className="flex items-end gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      {currentHand.cards.map((c, i) => (
                        <div key={i}>
                          {renderCard(c)}
                        </div>
                      ))}
                    </div>
                    {renderChipStack(
                      currentHand.ante + currentHand.playBet + currentHand.pairPlus
                    )}
                  </div>

                  <div className="w-full flex flex-col gap-1 text-[10px] text-emerald-50 mt-1">
                    <div className="flex items-center justify-between">
                      <span>Ante: {currentHand.ante}</span>
                      <span>
                        Play: {currentHand.playBet > 0 ? currentHand.playBet : '--'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pair Plus: {currentHand.pairPlus || 0}</span>
                      <span>
                        Net:{' '}
                        <span
                          className={
                            currentHand.net >= 0
                              ? 'text-emerald-200 font-semibold'
                              : 'text-rose-200 font-semibold'
                          }
                        >
                          {currentHand.net >= 0 ? '+' : ''}
                          {currentHand.net.toFixed(2)}
                        </span>
                      </span>
                    </div>
                    {currentHand.result && (
                      <div className="mt-0.5 inline-flex items-center justify-center rounded-full bg-black/45 border border-emerald-200/70 px-2 py-0.5 uppercase tracking-[0.22em]">
                        {resultLabel(currentHand.result)}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="relative flex flex-col items-center gap-2 px-3 py-3 rounded-2xl border border-emerald-900/60 border-dashed bg-black/25"
                  style={{ minWidth: '160px' }}
                >
                  <div className="flex items-center justify-between w-full text-[10px] text-emerald-100/60">
                    <span className="uppercase tracking-[0.22em]">Player</span>
                    <span className="font-semibold">--</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-40 mt-1">
                    {renderCard(null)}
                    {renderCard(null)}
                    {renderCard(null)}
                  </div>
                  <div className="mt-1 text-[10px] text-emerald-100/70">
                    Tap DEAL to start.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ACTION BAR: buttons above bet controls, tight for mobile */}
          <div className="mt-2 rounded-2xl border border-emerald-200/50 bg-black/60 px-3 py-3 flex flex-col gap-3">
            {/* action buttons – top row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm pt-1">
  <button
    onClick={handlePrimaryDeal}
    disabled={!canPrimaryDeal}
    className="col-span-2 md:col-span-2 h-10 rounded-lg bg-gradient-to-b from-[#facc15] to-[#f59e0b] text-black font-extrabold text-xs tracking-[0.16em] uppercase shadow-[0_0_20px_rgba(250,204,21,0.9)] disabled:opacity-40 disabled:cursor-not-allowed"
  >
    {phase === 'settled' ? 'Deal Next Hand' : 'Deal'}
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
    disabled={phase !== 'decision' || !currentHand}
    className="h-10 rounded-lg border border-slate-300/80 bg-slate-900/90 text-white font-semibold text-[11px] tracking-[0.16em] uppercase disabled:opacity-30 disabled:cursor-not-allowed"
  >
    Reveal
  </button>
</div>


            {/* bet controls – under buttons */}
            <div className="space-y-3 text-[11px] text-emerald-100/85">
              {/* Ante row */}
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

              {/* Pair Plus row */}
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
          </div>
        </div>
      </div>

      {/* RULES CARD BELOW TABLE */}
      <div className="rounded-2xl border border-white/12 bg-gradient-to-b from-[#111827] via-[#020617] to-black p-4 md:p-5 text-xs space-y-2">
        <div className="text-sm font-semibold text-white">
          Table Rules (Demo)
        </div>
        <ul className="space-y-1 text-white/70 list-disc list-inside">
          <li>Three-card poker vs house dealer.</li>
          <li>Ante &amp; Play bets; dealer qualifies with Q-high or better.</li>
          <li>Dealer not qualifying: Ante pays 1:1, Play pushes.</li>
          <li>Pair Plus pays on Pair or better, independent of dealer.</li>
          <li>Ante Bonus pays for Straight or better regardless of outcome.</li>
        </ul>
        <div className="text-[11px] text-white/50 pt-1">
          Pure front-end demo to dial in flow, payouts, and UX. Final{' '}
          <span className="font-semibold text-[#facc15]">BGLD / BGRC</span> contracts
          on Base will mirror these mechanics with verifiable randomness and
          on-chain payouts.
        </div>
      </div>
    </div>
  )
}
