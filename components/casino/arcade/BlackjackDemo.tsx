'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

/* ---------- card + game types ---------- */

const SUITS = ['♠', '♥', '♦', '♣'] as const
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const

type Suit = (typeof SUITS)[number]
type Rank = (typeof RANKS)[number]

type Card = { rank: Rank; suit: Suit }

type HandResult = 'WIN' | 'LOSE' | 'PUSH' | 'BUST' | 'BLACKJACK' | 'SURRENDER'

type Phase = 'betting' | 'player' | 'dealer' | 'settled'

type PlayerHand = {
  id: number
  cards: Card[]
  wager: number
  result: HandResult | null
  isDone: boolean
  isBust: boolean
  isBlackjack: boolean
  isDoubled: boolean
  isSplitChild?: boolean
  hasActed: boolean
}

/* ---------- helpers ---------- */

function randomCard(): Card {
  const r = RANKS[Math.floor(Math.random() * RANKS.length)]
  const s = SUITS[Math.floor(Math.random() * SUITS.length)]
  return { rank: r, suit: s }
}

function cardValue(rank: Rank): number {
  if (rank === 'A') return 11
  if (rank === 'K' || rank === 'Q' || rank === 'J') return 10
  return parseInt(rank, 10)
}

function handTotal(cards: Card[]): { total: number; isSoft: boolean } {
  let total = 0
  let aces = 0
  for (const c of cards) {
    total += cardValue(c.rank)
    if (c.rank === 'A') aces++
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  const isSoft = cards.some(c => c.rank === 'A') && total + 10 <= 21
  return { total, isSoft }
}

function isBlackjackHand(cards: Card[]): boolean {
  if (cards.length !== 2) return false
  const vals = cards.map(c => cardValue(c.rank)).sort((a, b) => b - a)
  const total = vals[0] + vals[1]
  const hasAce = cards.some(c => c.rank === 'A')
  return hasAce && total === 21
}

function resultLabel(result: HandResult | null): string {
  switch (result) {
    case 'WIN':
      return 'WIN'
    case 'LOSE':
      return 'LOSE'
    case 'PUSH':
      return 'PUSH'
    case 'BUST':
      return 'BUST'
    case 'BLACKJACK':
      return 'BLACKJACK 3:2'
    case 'SURRENDER':
      return 'SURRENDER'
    default:
      return ''
  }
}

/* ---------- main component ---------- */

export default function BlackjackDemo() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // 🔗 Arcade wallet (global demo credits)
  const { credits: arcadeCredits, net: arcadeNet, addWin, addLoss } = useArcadeWallet()

  // Local demo credit economy (per-table feel)
  const [credits, setCredits] = useState(500)
  const [sessionPnL, setSessionPnL] = useState(0)
  const [syncedPnL, setSyncedPnL] = useState(0)

  // Sync blackjack P&L into global arcade wallet
  useEffect(() => {
    if (!mounted) return
    const delta = sessionPnL - syncedPnL
    if (delta === 0) return

    if (delta > 0) {
      addWin(delta)
    } else {
      addLoss(-delta)
    }
    setSyncedPnL(sessionPnL)
  }, [mounted, sessionPnL, syncedPnL, addWin, addLoss])

  const [baseBet, setBaseBet] = useState(10)
  const MIN_BET = 1
  const MAX_BET = 500

  // single-player table
  const [phase, setPhase] = useState<Phase>('betting')
  const [dealerCards, setDealerCards] = useState<Card[]>([])
  const [dealerReveal, setDealerReveal] = useState(false)

  const [players, setPlayers] = useState<PlayerHand[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [handIdSeq, setHandIdSeq] = useState(1)

  const [tableMessage, setTableMessage] = useState<string>(
    'Set your stake, then hit DEAL to start.'
  )

  const [lastNet, setLastNet] = useState(0)
  const [lastPayout, setLastPayout] = useState(0)
  const [lastResultSummary, setLastResultSummary] = useState<string>('—')

  const priceUsd: number | null = null // plumbing for later
  const approxUsd = (b: number) =>
    priceUsd ? `~$${(b * priceUsd).toFixed(b * priceUsd < 1 ? 4 : 2)}` : ''

  // 🔲 Full-screen mobile mode
  const [fullscreenMobile, setFullscreenMobile] = useState(false)

  /* ---------- derived helpers ---------- */

  const currentHand = players[currentIndex] ?? null

  const dealerTotal = useMemo(() => handTotal(dealerCards), [dealerCards])

  const stakeReady =
    baseBet >= MIN_BET &&
    baseBet <= MAX_BET &&
    credits >= baseBet

  const canPrimaryDeal = (phase === 'betting' || phase === 'settled') && stakeReady

  const canHit =
    phase === 'player' && !!currentHand && !currentHand.isDone && !currentHand.isBust

  const canStand = canHit

  const canDouble =
    canHit &&
    currentHand!.cards.length === 2 &&
    !currentHand!.isDoubled &&
    credits >= currentHand!.wager

  const canSplit =
    canHit &&
    currentHand!.cards.length === 2 &&
    currentHand!.cards[0].rank === currentHand!.cards[1].rank &&
    !currentHand!.isSplitChild &&
    players.length < 4 &&
    credits >= currentHand!.wager

  const canSurrender =
    canHit &&
    currentHand!.cards.length === 2 &&
    !currentHand!.hasActed &&
    !currentHand!.isSplitChild

  /* ---------- game actions ---------- */

  function newShoe() {
    setDealerCards([])
    setDealerReveal(false)
    setPlayers([])
    setCurrentIndex(0)
    setPhase('betting')
    setTableMessage('Fresh shoe. Set your stake, then DEAL.')
    setLastNet(0)
    setLastPayout(0)
    setLastResultSummary('—')
  }

  function dealHand() {
    if (!stakeReady) return

    const totalStake = baseBet
    setCredits(c => c - totalStake)

    // single main seat
    const c1 = randomCard()
    const c2 = randomCard()
    const cards = [c1, c2]
    const isBJ = isBlackjackHand(cards)

    const mainHand: PlayerHand = {
      id: handIdSeq,
      cards,
      wager: baseBet,
      result: isBJ ? 'BLACKJACK' : null,
      isDone: isBJ,
      isBust: false,
      isBlackjack: isBJ,
      isDoubled: false,
      isSplitChild: false,
      hasActed: false,
    }

    const newPlayers: PlayerHand[] = [mainHand]
    let nextId = handIdSeq + 1

    const d1 = randomCard()
    const d2 = randomCard()
    const dealerHand = [d1, d2]
    const dealerVal = handTotal(dealerHand)
    const dealerBJ = dealerVal.total === 21 && dealerHand.length === 2

    setDealerCards(dealerHand)
    setDealerReveal(false)
    setPlayers(newPlayers)
    setHandIdSeq(nextId)
    setLastNet(0)
    setLastPayout(0)
    setLastResultSummary('—')
    setPhase('player')

    // Dealer blackjack check
    if (dealerBJ) {
      let netChange = 0
      const resolved: PlayerHand[] = newPlayers.map((ph): PlayerHand => {
        if (ph.isBlackjack) {
          return { ...ph, result: 'PUSH', isDone: true }
        }
        netChange -= ph.wager
        return { ...ph, result: 'LOSE', isDone: true }
      })

      setPlayers(resolved)
      setDealerReveal(true)
      setCredits(c => c + totalStake + netChange)
      setSessionPnL(prev => prev + netChange)
      setLastNet(netChange)
      setLastPayout(totalStake + netChange)
      setLastResultSummary(
        netChange === 0
          ? 'Push vs dealer blackjack.'
          : `Dealer blackjack • Net ${netChange >= 0 ? '+' : ''}${netChange.toFixed(
              2
            )} BGRC`
      )
      setTableMessage('Dealer shows blackjack. Round settled.')
      setPhase('settled')
      return
    }

    // pay immediate player blackjack
    let netChange = 0
    const updated: PlayerHand[] = newPlayers.map((ph): PlayerHand => {
      if (ph.isBlackjack) {
        const payout = Math.floor(ph.wager * 2.5) // 3:2 BJ
        const net = payout - ph.wager
        netChange += net
        return { ...ph, result: 'BLACKJACK', isDone: true }
      }
      return ph
    })

    if (netChange !== 0) {
      setCredits(c => c + totalStake + netChange)
      setSessionPnL(prev => prev + netChange)
      setLastNet(netChange)
      setLastPayout(totalStake + netChange)
      setLastResultSummary(
        netChange > 0
          ? `Blackjack! Net +${netChange.toFixed(2)} BGRC`
          : 'All hands in action.'
      )
    } else {
      setCredits(c => c + totalStake)
    }

    setPlayers(updated)

    const firstIdx = updated.findIndex(p => !p.isDone)
    if (firstIdx === -1) {
      setDealerReveal(true)
      setPhase('settled')
      setTableMessage('All hands resolved (blackjacks). Tap DEAL for next hand.')
    } else {
      setPhase('player')
      setCurrentIndex(firstIdx)
      setTableMessage('Your hand: Hit, Stand, Double, Split, or Surrender.')
    }
  }

  function advanceToNextHandOrDealer(nextHands: PlayerHand[]) {
    let idx = currentIndex + 1
    while (idx < nextHands.length && nextHands[idx].isDone) {
      idx++
    }
    if (idx < nextHands.length) {
      setCurrentIndex(idx)
      setPhase('player')
      setTableMessage(`Hand ${idx + 1}: Your move.`)
      setPlayers(nextHands)
    } else {
      setPlayers(nextHands)
      startDealerPlay(nextHands)
    }
  }

  function startDealerPlay(handsState: PlayerHand[]) {
    const anyLive = handsState.some(h => !h.isBust && !h.isBlackjack && h.result === null)
    if (!anyLive) {
      setPhase('settled')
      setDealerReveal(true)
      setTableMessage('Round complete. Tap DEAL for next hand.')
      return
    }

    setPhase('dealer')
    setDealerReveal(true)
    setTableMessage('Dealer drawing…')

    let workingCards = [...dealerCards]
    const drawStep = () => {
      const { total } = handTotal(workingCards)
      const mustHit = total <= 16 // S17
      if (!mustHit || total > 21) {
        settleRound(workingCards, handsState)
        return
      }
      workingCards = [...workingCards, randomCard()]
      setDealerCards(workingCards)
      setTimeout(drawStep, 500)
    }

    drawStep()
  }

  function settleRound(finalDealerCards: Card[], handsSnapshot: PlayerHand[]) {
    const { total: dealerTotalVal } = handTotal(finalDealerCards)
    const dealerBust = dealerTotalVal > 21

    let netChange = 0
    let grossReturned = 0

    const nextHands: PlayerHand[] = handsSnapshot.map((ph): PlayerHand => {
      if (ph.result === 'BLACKJACK' || ph.result === 'SURRENDER') {
        const baseNet =
          ph.result === 'BLACKJACK'
            ? ph.wager * 1.5
            : -ph.wager / 2
        netChange += baseNet

        if (ph.result === 'BLACKJACK') {
          grossReturned += Math.floor(ph.wager * 2.5)
        } else if (ph.result === 'SURRENDER') {
          grossReturned += ph.wager / 2
        }

        return { ...ph, isDone: true }
      }

      const { total: pt } = handTotal(ph.cards)

      if (pt > 21 || ph.isBust) {
        netChange -= ph.wager
        return { ...ph, result: 'BUST', isBust: true, isDone: true }
      }

      if (dealerBust) {
        netChange += ph.wager
        grossReturned += ph.wager * 2
        return { ...ph, result: 'WIN', isDone: true }
      }

      if (pt > dealerTotalVal) {
        netChange += ph.wager
        grossReturned += ph.wager * 2
        return { ...ph, result: 'WIN', isDone: true }
      } else if (pt === dealerTotalVal) {
        grossReturned += ph.wager
        return { ...ph, result: 'PUSH', isDone: true }
      } else {
        netChange -= ph.wager
        return { ...ph, result: 'LOSE', isDone: true }
      }
    })

    setPlayers(nextHands)
    setCredits(c => c + netChange + grossReturned)
    setSessionPnL(prev => prev + netChange)
    setLastNet(netChange)
    setLastPayout(grossReturned)
    setLastResultSummary(
      netChange > 0
        ? `Net +${netChange.toFixed(2)} BGRC`
        : netChange < 0
        ? `Net ${netChange.toFixed(2)} BGRC`
        : 'All pushes this round.'
    )
    setPhase('settled')
    setTableMessage('Round complete. Tap DEAL for next hand.')
  }

  function handleHit() {
    if (!canHit || !currentHand) return
    const idx = currentIndex
    const updated = [...players]
    const hand = { ...updated[idx] }
    const newCard = randomCard()
    hand.cards = [...hand.cards, newCard]
    hand.hasActed = true

    const { total } = handTotal(hand.cards)
    if (total > 21) {
      hand.isBust = true
      hand.isDone = true
      hand.result = 'BUST'
      setSessionPnL(prev => prev - hand.wager)
      setTableMessage('Busted. Next hand…')
    } else {
      setTableMessage('Hit or stand?')
    }

    updated[idx] = hand
    setPlayers(updated)

    if (hand.isDone) {
      setTimeout(() => {
        advanceToNextHandOrDealer(updated)
      }, 450)
    }
  }

  function handleStand() {
    if (!canStand || !currentHand) return
    const idx = currentIndex
    const updated = [...players]
    const hand = { ...updated[idx], isDone: true, hasActed: true }
    updated[idx] = hand
    setPlayers(updated)
    setTableMessage('Stand locked. Moving to next hand…')
    setTimeout(() => {
      advanceToNextHandOrDealer(updated)
    }, 400)
  }

  function handleDouble() {
    if (!canDouble || !currentHand) return
    const idx = currentIndex
    const updated = [...players]
    const hand = { ...updated[idx] }

    setCredits(c => c - hand.wager)
    hand.wager = hand.wager * 2
    hand.isDoubled = true
    hand.hasActed = true

    const newCard = randomCard()
    hand.cards = [...hand.cards, newCard]

    const { total } = handTotal(hand.cards)
    if (total > 21) {
      hand.isBust = true
      hand.isDone = true
      hand.result = 'BUST'
      setSessionPnL(prev => prev - hand.wager)
      setTableMessage('Doubled and busted. Next hand…')
    } else {
      hand.isDone = true
      setTableMessage('Double locked. Waiting for dealer…')
    }

    updated[idx] = hand
    setPlayers(updated)
    setTimeout(() => {
      advanceToNextHandOrDealer(updated)
    }, 450)
  }

  function handleSurrender() {
    if (!canSurrender || !currentHand) return
    const idx = currentIndex
    const updated = [...players]
    const hand = { ...updated[idx] }

    const refund = hand.wager / 2
    setCredits(c => c + refund)
    setSessionPnL(prev => prev - refund)
    hand.result = 'SURRENDER'
    hand.isDone = true
    hand.hasActed = true

    updated[idx] = hand
    setPlayers(updated)
    setTableMessage('You surrendered. Half your bet returned. Next hand…')

    setTimeout(() => {
      advanceToNextHandOrDealer(updated)
    }, 450)
  }

  function handleSplit() {
    if (!canSplit || !currentHand) return
    const idx = currentIndex
    const updated = [...players]
    const original = { ...updated[idx] }

    setCredits(c => c - original.wager)

    const cardA = original.cards[0]
    const cardB = original.cards[1]

    const firstNewCard = randomCard()
    const secondNewCard = randomCard()

    const first: PlayerHand = {
      ...original,
      cards: [cardA, firstNewCard],
      isSplitChild: false,
      isDone: false,
      isBust: false,
      isBlackjack: isBlackjackHand([cardA, firstNewCard]),
      result: null,
      hasActed: false,
    }

    const second: PlayerHand = {
      id: handIdSeq,
      cards: [cardB, secondNewCard],
      wager: original.wager,
      result: null,
      isDone: false,
      isBust: false,
      isBlackjack: isBlackjackHand([cardB, secondNewCard]),
      isDoubled: false,
      isSplitChild: true,
      hasActed: false,
    }

    const newHands: PlayerHand[] = [...updated]
    newHands[idx] = first
    newHands.splice(idx + 1, 0, second)
    setHandIdSeq(prev => prev + 1)
    setPlayers(newHands)
    setTableMessage('Hand split. Play left hand first.')
  }

  function handleNewHand() {
    setPlayers([])
    setDealerCards([])
    setDealerReveal(false)
    setPhase('betting')
    setCurrentIndex(0)
    setTableMessage('Set your stake, then hit DEAL to start.')
  }

  function handlePrimaryDeal() {
    if (!stakeReady) return
    if (phase === 'settled') {
      handleNewHand()
      setTimeout(() => {
        dealHand()
      }, 0)
    } else {
      dealHand()
    }
  }

  /* ---------- hydration guard ---------- */

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-10 text-xs text-white/60">
        Initializing blackjack demo…
      </div>
    )
  }

  /* ---------- render helpers ---------- */

  const renderCard = (card: Card | null, faceDown?: boolean) => {
    if (!card || faceDown) {
      return (
        <div className="w-[60px] h-[86px] md:w-[80px] md:h-[116px] rounded-xl bg-[repeating-linear-gradient(135deg,#0b1120,#0b1120_6px,#1f2937_6px,#1f2937_12px)] border border-slate-700 shadow-[0_6px_20px_rgba(0,0,0,0.85)]" />
      )
    }
    const isRed = card.suit === '♥' || card.suit === '♦'
    return (
      <div className="w-[60px] h-[86px] md:w-[80px] md:h-[116px] rounded-xl bg-white border border-slate-300 shadow-[0_8px_26px_rgba(0,0,0,0.9)] flex flex-col justify-between p-2">
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
    )
  }

  const renderChipStack = (amount: number) => {
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
      <div className="flex flex-col items-center justify-end gap-1">
        {chips.map((c, i) => (
          <div
            key={`${c.value}-${i}`}
            className="relative w-8 h-8 md:w-9 md:h-9 -mt-3 first:mt-0"
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

  /* ---------- RENDER ---------- */

  return (
    <div
      className={[
        'mx-auto max-w-5xl space-y-4',
        fullscreenMobile
          ? 'fixed inset-0 z-40 max-w-none bg-black/95 px-2 pt-2 pb-3 overflow-y-auto'
          : '',
      ].join(' ')}
    >
      {/* TOP: TITLE + ARCADE SUMMARY */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-black/70 via-[#020617] to-black/80 p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[11px] tracking-[0.32em] uppercase text-emerald-100/85 font-semibold">
            BASE GOLD RUSH
          </div>
          <div className="mt-1 text-xl md:text-2xl font-extrabold text-white">
            Video Blackjack <span className="text-[#facc15]">• Arcade</span>
          </div>
          <div className="text-[11px] text-emerald-100/80">
            6-deck shoe • Dealer stands on 17 • 3:2 blackjack
          </div>
          <div className="mt-2 text-[11px] text-emerald-100/75">
            Local Table:{' '}
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
            onClick={newShoe}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-100 hover:bg-emerald-500/10"
          >
            New Shoe
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
              Global demo balance across all arcade games.
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
              Since you first opened the arcade.
            </div>
          </div>
        </div>
      </div>

      {/* TABLE: DEALER DIRECTLY ABOVE PLAYER, ONE BOX */}
      <div
        className={[
          'relative rounded-[28px] border border-emerald-400/40 bg-[radial-gradient(circle_at_10%_0%,#064e3b,transparent_55%),radial-gradient(circle_at_90%_0%,#047857,transparent_55%),#022c22] shadow-[0_18px_45px_rgba(0,0,0,0.9)] p-4 md:p-5 space-y-4 overflow-hidden',
        ].join(' ')}
      >
        {/* glow */}
        <div className="pointer-events-none absolute inset-x-0 -top-10 h-28 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.35),transparent_65%)]" />

        <div className="relative z-10 space-y-4">
          {/* DEALER + STATUS */}
          <div className="rounded-3xl border border-emerald-300/40 bg-[radial-gradient(circle_at_50%_0%,#064e3b,#022c22_65%,#01120f_100%)] px-3 pt-4 pb-3 md:px-6 md:pt-4 md:pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-50/85">
                Dealer
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[11px] text-emerald-100/80">
                  {dealerCards.length > 0 && dealerReveal
                    ? `Total: ${dealerTotal.total}`
                    : dealerCards.length > 0
                    ? 'Showing…'
                    : 'Waiting for deal'}
                </div>
                {/* Full-screen toggle (mobile only) */}
                <button
                  type="button"
                  onClick={() => setFullscreenMobile(fs => !fs)}
                  className="md:hidden rounded-full border border-white/30 bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white/80"
                >
                  {fullscreenMobile ? 'Exit Full Screen' : 'Full Screen'}
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex items-end gap-2 md:gap-3">
                {dealerCards.length === 0 ? (
                  renderCard(null)
                ) : (
                  dealerCards.map((card, idx) => (
                    <div key={idx}>
                      {renderCard(card, !dealerReveal && idx === 1)}
                    </div>
                  ))
                )}
              </div>

              <div className="w-full text-center">
                <div className="text-[11px] text-emerald-100/80 min-h-[2rem]">
                  {tableMessage}
                </div>
                {lastResultSummary && (
                  <div className="mt-1 text-[11px] text-amber-100/80">
                    {lastResultSummary}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PLAYER HAND(S) */}
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-50/80 text-center">
              Your Hand
            </div>

            <div className="flex justify-center gap-3 md:gap-4 flex-wrap">
              {players.length === 0 ? (
                <div
                  className="relative flex flex-col items-center gap-2 px-3 py-3 rounded-2xl border border-emerald-900/60 border-dashed bg-black/20"
                  style={{ minWidth: '150px' }}
                >
                  <div className="flex items-center justify-between w-full text-[10px] text-emerald-100/60">
                    <span className="uppercase tracking-[0.22em]">
                      Player
                    </span>
                    <span className="font-semibold">--</span>
                  </div>
                  <div className="opacity-40 mt-1">
                    {renderCard(null)}
                  </div>
                  <div className="mt-1 text-[10px] text-emerald-100/70">
                    Tap DEAL to start.
                  </div>
                </div>
              ) : (
                players.map((hand, idx) => {
                  const label =
                    players.length === 1 ? 'Player' : `Hand ${idx + 1}`
                  const isActive = idx === currentIndex && phase === 'player'
                  const total = handTotal(hand.cards)

                  return (
                    <div
                      key={hand.id}
                      className={[
                        'relative flex flex-col items-center gap-2 px-3 py-3 rounded-2xl border bg-[radial-gradient(circle_at_50%_0%,rgba(6,95,70,0.8),rgba(6,78,59,0.95))] transition-shadow',
                        'border-emerald-200/70 shadow-[0_0_16px_rgba(16,185,129,0.45)]',
                        isActive ? 'ring-2 ring-[#facc15]/80' : '',
                      ].join(' ')}
                      style={{ minWidth: '150px' }}
                    >
                      <div className="flex items-center justify-between w-full text-[10px] text-emerald-100/85">
                        <span className="uppercase tracking-[0.22em]">
                          {label}
                        </span>
                        <span className="text-base md:text-lg font-extrabold text-[#facc15] drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]">
                          {total?.total ?? '--'}{' '}
                          <span className="text-[9px] md:text-[10px] font-semibold text-emerald-100/90">
                            {total?.isSoft ? '(soft)' : ''}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-end gap-2 mt-1">
                        {hand.cards.map((c, i) => (
                          <div
                            key={i}
                            className={isActive ? 'animate-pulse' : ''}
                          >
                            {renderCard(c)}
                          </div>
                        ))}
                        {renderChipStack(hand.wager)}
                      </div>

                      {hand.result && (
                        <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-emerald-50 bg-black/40 px-2 py-1 rounded-full">
                          {resultLabel(hand.result)}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ACTION BAR */}
          <div className="mt-2 rounded-2xl border border-emerald-200/50 bg-black/55 px-3 py-3 flex flex-col gap-3">
            {/* action buttons */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <button
                onClick={handleHit}
                disabled={!canHit}
                className="h-11 rounded-lg border border-emerald-300/70 bg-emerald-600/90 text-white font-semibold text-xs tracking-[0.16em] uppercase disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Hit
              </button>
              <button
                onClick={handleStand}
                disabled={!canStand}
                className="h-11 rounded-lg border border-slate-300/70 bg-slate-800/90 text-white font-semibold text-xs tracking-[0.16em] uppercase disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Stand
              </button>
              <button
                onClick={handleDouble}
                disabled={!canDouble}
                className="h-11 rounded-lg border border-[#facc15]/70 bg-black/80 text-[#facc15] font-semibold text-[11px] tracking-[0.16em] uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Double
              </button>
              <button
                onClick={handleSplit}
                disabled={!canSplit}
                className="h-11 rounded-lg border border-indigo-300/70 bg-indigo-900/80 text-indigo-100 font-semibold text-[11px] tracking-[0.16em] uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Split
              </button>
              <button
                onClick={handleSurrender}
                disabled={!canSurrender}
                className="h-11 rounded-lg border border-rose-400/70 bg-rose-900/80 text-rose-100 font-semibold text-[11px] tracking-[0.16em] uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Surrender
              </button>

              {/* Primary Deal / Next Hand CTA */}
              <button
                onClick={handlePrimaryDeal}
                disabled={!canPrimaryDeal}
                className="col-span-2 md:col-span-5 h-11 rounded-lg bg-gradient-to-b from-[#facc15] to-[#f59e0b] text-black font-extrabold text-xs tracking-[0.2em] uppercase shadow-[0_0_18px_rgba(250,204,21,0.8)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {phase === 'settled' ? 'Deal Next Hand' : 'Deal'}
              </button>
            </div>

            {/* bet controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-emerald-100/80">
                <span>
                  Table Bet:{' '}
                  <span className="font-bold text-[#facc15]">
                    {baseBet.toLocaleString()} BGRC
                  </span>
                  {approxUsd(baseBet) && (
                    <span className="ml-1 text-[10px] text-emerald-100/70">
                      ({approxUsd(baseBet)})
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-emerald-100/60">
                  Min {MIN_BET} • Max {MAX_BET}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {[1, 5, 10, 25, 50, 100].map(v => (
                  <button
                    key={v}
                    onClick={() => setBaseBet(Math.min(MAX_BET, v))}
                    disabled={phase !== 'betting' && phase !== 'settled'}
                    className={[
                      'px-3 py-1 rounded-full border text-[11px] font-semibold',
                      baseBet === v
                        ? 'border-[#facc15] bg-[#facc15]/20 text-[#fef3c7]'
                        : 'border-emerald-300/40 bg-emerald-900/40 text-emerald-100',
                      phase !== 'betting' && phase !== 'settled'
                        ? 'opacity-40 cursor-not-allowed'
                        : '',
                    ].join(' ')}
                  >
                    {v}
                  </button>
                ))}
                <button
                  onClick={() => setBaseBet(Math.min(MAX_BET, baseBet + 5))}
                  disabled={phase !== 'betting' && phase !== 'settled'}
                  className="px-3 py-1 rounded-full border border-emerald-300/60 bg-black/40 text-[11px] text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +5
                </button>
                <button
                  onClick={() => setBaseBet(MIN_BET)}
                  disabled={phase !== 'betting' && phase !== 'settled'}
                  className="px-3 py-1 rounded-full border border-emerald-300/60 bg-black/40 text-[11px] text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RULES CARD BELOW TABLE – hidden in full-screen to keep everything tight */}
      {!fullscreenMobile && (
        <div className="rounded-2xl border border-white/12 bg-gradient-to-b from-[#111827] via-[#020617] to-black p-4 md:p-5 text-xs space-y-2">
          <div className="text-sm font-semibold text-white">
            Table Rules (Demo)
          </div>
          <ul className="space-y-1 text-white/70 list-disc list-inside">
            <li>6-deck shoe (simulated)</li>
            <li>Dealer stands on all 17</li>
            <li>
              Blackjack pays <span className="text-[#facc15] font-semibold">3:2</span>
            </li>
            <li>Standard hits, stands, double down &amp; split</li>
            <li>Surrender on first decision, ties push</li>
          </ul>
          <div className="text-[11px] text-white/50 pt-1">
            Front-end only demonstration of gameplay &amp; UX. Future{' '}
            <span className="font-semibold text-[#facc15]">BGLD / BGRC</span>{' '}
            blackjack contracts will mirror these mechanics on-chain with
            verifiable randomness &amp; true payouts.
          </div>
        </div>
      )}
    </div>
  )
}
