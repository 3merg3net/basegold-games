'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

/* ---------- card + game types ---------- */

const SUITS = ['♠', '♥', '♦', '♣'] as const
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const

type Suit = (typeof SUITS)[number]
type Rank = (typeof RANKS)[number]

type Card = { rank: Rank; suit: Suit }

type WarResult = 'WIN' | 'LOSE' | 'PUSH' | 'WAR' | null

type Phase = 'betting' | 'revealing' | 'settled'

/* ---------- helpers ---------- */

function randomCard(): Card {
  const r = RANKS[Math.floor(Math.random() * RANKS.length)]
  const s = SUITS[Math.floor(Math.random() * SUITS.length)]
  return { rank: r, suit: s }
}

function rankValue(rank: Rank): number {
  // A high, 2 low
  const idx = RANKS.indexOf(rank)
  return RANKS.length - idx
}

function cardIsRed(card: Card | null): boolean {
  if (!card) return false
  return card.suit === '♥' || card.suit === '♦'
}

function resultLabel(result: WarResult): string {
  switch (result) {
    case 'WIN':
      return 'WIN'
    case 'LOSE':
      return 'LOSE'
    case 'PUSH':
      return 'PUSH'
    case 'WAR':
      return 'WAR (PUSH)'
    default:
      return ''
  }
}

/* ---------- main component ---------- */

export default function WarDemo() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // 🔗 Arcade wallet (global demo credits)
  const { credits: arcadeCredits, net: arcadeNet, addWin, addLoss } = useArcadeWallet()

  // Local table credits + PnL
  const [credits, setCredits] = useState(500)
  const [sessionPnL, setSessionPnL] = useState(0)
  const [syncedPnL, setSyncedPnL] = useState(0)

  // Sync table PnL to arcade wallet
  useEffect(() => {
    if (!mounted) return
    const delta = sessionPnL - syncedPnL
    if (delta === 0) return
    if (delta > 0) addWin(delta)
    else addLoss(-delta)
    setSyncedPnL(sessionPnL)
  }, [sessionPnL, syncedPnL, mounted, addWin, addLoss])

  // Single-hand state
  const [phase, setPhase] = useState<Phase>('betting')
  const [baseBet, setBaseBet] = useState(10)
  const MIN_BET = 1
  const MAX_BET = 500

  const [playerCard, setPlayerCard] = useState<Card | null>(null)
  const [dealerCard, setDealerCard] = useState<Card | null>(null)
  const [result, setResult] = useState<WarResult>(null)

  const [tableMessage, setTableMessage] = useState(
    'Set your stake, then tap DEAL WAR to flip the cards.'
  )

  const [lastNet, setLastNet] = useState(0)
  const [lastPayout, setLastPayout] = useState(0)
  const [lastSummary, setLastSummary] = useState('—')

  const priceUsd: number | null = null // hook in later if you want pricing
  const approxUsd = (v: number) =>
    priceUsd ? `~$${(v * priceUsd).toFixed(v * priceUsd < 1 ? 4 : 2)}` : ''

  /* ---------- derived ---------- */

  const stakeReady =
    baseBet >= MIN_BET &&
    baseBet <= MAX_BET &&
    credits >= baseBet

  const canPrimaryDeal =
    stakeReady && (phase === 'betting' || phase === 'settled')

  /* ---------- core actions ---------- */

  function newShoe() {
    setCredits(500)
    setSessionPnL(0)
    setSyncedPnL(0)
    setPlayerCard(null)
    setDealerCard(null)
    setResult(null)
    setPhase('betting')
    setLastNet(0)
    setLastPayout(0)
    setLastSummary('—')
    setTableMessage('Fresh shoe loaded. Set your stake, then tap DEAL WAR.')
  }

  function resetHand() {
    setPlayerCard(null)
    setDealerCard(null)
    setResult(null)
    setPhase('betting')
    setTableMessage('Set your stake, then tap DEAL WAR to flip the cards.')
  }

  function dealHand() {
    if (!stakeReady) return

    // take stake
    setCredits(c => c - baseBet)

    // deal cards
    const p = randomCard()
    const d = randomCard()
    setPlayerCard(p)
    setDealerCard(d)
    setResult(null)
    setPhase('revealing')
    setTableMessage('Cards are out… resolving WAR.')

    // resolve after a small beat
    setTimeout(() => {
      settleRound(p, d)
    }, 450)
  }

  function settleRound(p: Card, d: Card) {
    const playerVal = rankValue(p.rank)
    const dealerVal = rankValue(d.rank)

    let outcome: WarResult = 'PUSH'
    let netChange = 0
    let grossReturned = 0

    if (playerVal > dealerVal) {
      outcome = 'WIN'
      netChange += baseBet
      grossReturned += baseBet * 2
    } else if (playerVal < dealerVal) {
      outcome = 'LOSE'
      netChange -= baseBet
      // nothing returned
    } else {
      // tie is WAR / push
      outcome = 'WAR'
      grossReturned += baseBet
    }

    setResult(outcome)
    setCredits(c => c + grossReturned + netChange)
    setSessionPnL(prev => prev + netChange)
    setLastNet(netChange)
    setLastPayout(grossReturned)

    setLastSummary(
      netChange > 0
        ? `You won the WAR • Net +${netChange.toFixed(2)} BGRC`
        : netChange < 0
        ? `Dealer took the edge • Net ${netChange.toFixed(2)} BGRC`
        : outcome === 'WAR'
        ? 'WAR tie — bet pushed back to you.'
        : 'Round pushed overall.'
    )

    setTableMessage('Round complete. Adjust stake or tap DEAL WAR again.')
    setPhase('settled')
  }

  // Single primary button like blackjack
  function handlePrimaryDeal() {
    if (!stakeReady) return

    if (phase === 'settled') {
      // soft reset then deal again
      resetHand()
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
        Initializing WAR demo…
      </div>
    )
  }

  /* ---------- render helpers ---------- */

  const renderCard = (card: Card | null, dim?: boolean) => {
    if (!card) {
      return (
        <div className="w-[64px] h-[92px] md:w-[80px] md:h-[115px] rounded-xl bg-[repeating-linear-gradient(135deg,#020617,#020617_6px,#111827_6px,#111827_12px)] border border-slate-700/80 shadow-[0_6px_18px_rgba(0,0,0,0.9)]" />
      )
    }

    const isRed = cardIsRed(card)
    const baseColor = isRed ? 'text-rose-600' : 'text-slate-900'

    return (
      <div
        className={[
          'w-[64px] h-[92px] md:w-[80px] md:h-[115px] rounded-xl bg-white border border-slate-300 shadow-[0_8px_26px_rgba(0,0,0,0.9)] flex flex-col justify-between p-2 transition-transform',
          dim ? 'opacity-75 scale-[0.98]' : 'opacity-100',
        ].join(' ')}
      >
        <div className={`text-xs font-bold ${baseColor}`}>
          {card.rank}
          <span className="ml-0.5">{card.suit}</span>
        </div>
        <div className={`text-3xl md:text-4xl text-center ${baseColor}`}>
          {card.suit}
        </div>
        <div className={`text-xs font-bold self-end rotate-180 ${baseColor}`}>
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
      while (remaining >= d.value && chips.length < 5) {
        chips.push({ value: d.value, src: d.src })
        remaining -= d.value
      }
    }

    return (
      <div className="flex flex-col items-center justify-end gap-1">
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

  /* ---------- left side: compact table ---------- */

  const left = (
    <div className="relative rounded-[28px] border border-emerald-400/50 bg-[radial-gradient(circle_at_10%_0%,#064e3b,transparent_55%),radial-gradient(circle_at_90%_0%,#047857,transparent_55%),#022c22] shadow-[0_22px_60px_rgba(0,0,0,0.95)] p-4 md:p-5 overflow-hidden">
      {/* top glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-12 h-32 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.4),transparent_65%)]" />

      {/* header / HUD */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] tracking-[0.32em] uppercase text-emerald-100/85 font-semibold">
            BASE GOLD RUSH
          </div>
          <div className="mt-1 text-xl md:text-2xl font-extrabold text-emerald-50">
            Casino War (Arcade)
          </div>
          <div className="text-[11px] text-emerald-100/80">
            High-card vs dealer • Instant flips • WAR ties push in this demo.
          </div>
        </div>
        <div className="text-right text-[11px] text-emerald-100/80 space-y-1">
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
                sessionPnL >= 0
                  ? 'text-emerald-200 font-semibold'
                  : 'text-rose-300 font-semibold'
              }
            >
              {sessionPnL >= 0 ? '+' : ''}
              {sessionPnL.toFixed(2)} BGRC
            </span>
          </div>
          <button
            onClick={newShoe}
            className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-100 hover:bg-emerald-500/10"
          >
            New Shoe
          </button>
        </div>
      </div>

      {/* compact felt / hand box */}
      <div className="relative z-10 rounded-3xl border border-emerald-300/50 bg-[radial-gradient(circle_at_50%_0%,#065f46,#022c22_65%,#01120f_100%)] px-4 pt-4 pb-4 md:px-6 md:pt-5 md:pb-5">
        {/* headline message strip */}
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-[11px]">
          <div className="inline-flex max-w-xl items-center rounded-full border border-amber-200/70 bg-black/60 px-3 py-1.5 text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.6)]">
            {tableMessage}
          </div>
          <div className="text-emerald-100/80">
            Last Net:{' '}
            <span
              className={
                lastNet > 0
                  ? 'text-emerald-200 font-semibold'
                  : lastNet < 0
                  ? 'text-rose-300 font-semibold'
                  : 'text-emerald-50'
              }
            >
              {lastNet >= 0 ? '+' : ''}
              {lastNet.toFixed(2)} BGRC
            </span>
          </div>
        </div>

        {/* dealer + player stacked tight */}
        <div className="rounded-2xl border border-emerald-200/60 bg-black/25 px-3 py-3 md:px-4 md:py-4">
          <div className="flex flex-col gap-4 items-center">
            {/* Dealer row */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-50/85">
                Dealer
              </div>
              <div className="flex items-center gap-2">
                {renderCard(dealerCard, false)}
              </div>
            </div>

            {/* Player row */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-50/85">
                You
              </div>
              <div className="flex items-end gap-3">
                {renderCard(playerCard, false)}
                {renderChipStack(baseBet)}
              </div>
              {result && (
                <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-emerald-50 bg-black/40 px-3 py-1 rounded-full">
                  {resultLabel(result)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ACTION BAR – right under the hand (mobile-first) */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <button
            onClick={handlePrimaryDeal}
            disabled={!canPrimaryDeal}
            className="col-span-2 md:col-span-2 h-11 rounded-lg bg-gradient-to-b from-[#facc15] to-[#f59e0b] text-black font-extrabold text-xs tracking-[0.2em] uppercase shadow-[0_0_18px_rgba(250,204,21,0.85)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {phase === 'settled' ? 'Deal Next War' : 'Deal War'}
          </button>
          <button
            onClick={resetHand}
            disabled={phase === 'betting' && !playerCard && !dealerCard}
            className="h-11 rounded-lg border border-white/25 bg-black/70 text-white text-[11px] font-semibold tracking-[0.16em] uppercase disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Reset Hand
          </button>
        </div>

        {/* bet controls under actions */}
        <div className="mt-3 flex flex-col gap-2 text-[11px] text-emerald-100/80">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span>
              Base Bet:{' '}
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
                disabled={phase === 'revealing'}
                className={[
                  'px-3 py-1 rounded-full border text-[11px] font-semibold',
                  baseBet === v
                    ? 'border-[#facc15] bg-[#facc15]/20 text-[#fef3c7]'
                    : 'border-emerald-300/40 bg-emerald-900/40 text-emerald-100',
                  phase === 'revealing' ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => setBaseBet(Math.min(MAX_BET, baseBet + 5))}
              disabled={phase === 'revealing'}
              className="px-3 py-1 rounded-full border border-emerald-300/60 bg-black/40 text-[11px] text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +5
            </button>
            <button
              onClick={() => setBaseBet(MIN_BET)}
              disabled={phase === 'revealing'}
              className="px-3 py-1 rounded-full border border-emerald-300/60 bg-black/40 text-[11px] text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  /* ---------- right side: summary ---------- */

  const right = (
    <div className="rounded-2xl border border-white/12 bg-gradient-to-b from-[#111827] via-[#020617] to-black p-4 md:p-5 space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-[0.26em] text-white/60">
          GAME SUMMARY
        </div>
        <div className="mt-1 text-lg font-bold text-white">
          Casino War (BGRC Arcade)
        </div>
        <div className="mt-1 text-xs text-white/70">
          High-card face-off vs the house, tuned for Base Gold Rush. Tight single-seat
          layout so it feels great on mobile before we wire live rail tables.
        </div>
      </div>

      {/* Global arcade wallet + local PnL */}
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

      {/* Last round recap */}
      <div className="rounded-xl border border-white/14 bg-black/40 p-3 text-xs space-y-2">
        <div className="text-sm font-semibold text-white">
          Last Round Recap
        </div>
        <div className="text-[11px] text-white/70">
          {lastSummary}
        </div>
        <div className="flex items-center justify-between text-[11px] text-white/60 pt-1">
          <span>
            Gross Returned:{' '}
            <span className="font-semibold text-emerald-200">
              {lastPayout.toFixed(2)} BGRC
            </span>
          </span>
          <span>
            Net:{' '}
            <span
              className={
                lastNet > 0
                  ? 'text-emerald-300 font-semibold'
                  : lastNet < 0
                  ? 'text-rose-300 font-semibold'
                  : 'text-slate-100 font-semibold'
              }
            >
              {lastNet >= 0 ? '+' : ''}
              {lastNet.toFixed(2)} BGRC
            </span>
          </span>
        </div>
      </div>

      {/* Rules blurb */}
      <div className="rounded-xl border border-white/14 bg-black/40 p-3 text-xs space-y-2">
        <div className="text-sm font-semibold text-white">
          Table Rules (Demo)
        </div>
        <ul className="space-y-1 text-white/70 list-disc list-inside">
          <li>Single seat: one card to you, one card to the dealer.</li>
          <li>Base bet in BGRC demo credits each round.</li>
          <li>High card wins 1:1. Low card loses.</li>
          <li>
            Ties show as <span className="text-[#facc15] font-semibold">WAR</span> and push
            (bet returned).
          </li>
          <li>All results are local-only in this arcade build.</li>
        </ul>
        <div className="text-[11px] text-white/50 pt-1">
          This is a <span className="font-semibold">front-end only</span>{' '}
          Base Gold Rush preview. Future{' '}
          <span className="font-semibold text-[#facc15]">BGLD / BGRC</span>{' '}
          contracts can plug verifiable randomness into this exact table and
          settle to a shared casino treasury.
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
