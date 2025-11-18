'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

type Phase = 'betting' | 'dealing' | 'reveal' | 'result'

type BetKeys = 'player' | 'banker' | 'tie' | 'playerPair' | 'bankerPair'

type Bets = {
  player: number
  banker: number
  tie: number
  playerPair: number
  bankerPair: number
}

type PlayerSeat = {
  id: number
  name: string
  seat: string
  color: string
  credits: number
  sessionPnL: number
}

type Card = {
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
  suit: '♠' | '♥' | '♦' | '♣'
}

type HandSide = {
  cards: Card[]
  total: number
}

type RoundResult = 'PLAYER' | 'BANKER' | 'TIE'

const initialPlayers: PlayerSeat[] = [
  {
    id: 1,
    name: 'Seat 1',
    seat: 'Base Left',
    color: '#facc15',
    credits: 1_000,
    sessionPnL: 0,
  },
  {
    id: 2,
    name: 'Seat 2',
    seat: 'Base Right',
    color: '#22c55e',
    credits: 1_000,
    sessionPnL: 0,
  },
  {
    id: 3,
    name: 'Seat 3',
    seat: 'Rail Left',
    color: '#38bdf8',
    credits: 1_000,
    sessionPnL: 0,
  },
  {
    id: 4,
    name: 'Seat 4',
    seat: 'Rail Right',
    color: '#f97316',
    credits: 1_000,
    sessionPnL: 0,
  },
]

const chipDenoms = [1, 5, 25, 100] as const

const ranks: Card['rank'][] = [
  'A',
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
]
const suits: Card['suit'][] = ['♠', '♥', '♦', '♣']

function cardValue(c: Card): number {
  if (c.rank === 'A') return 1
  if (['10', 'J', 'Q', 'K'].includes(c.rank)) return 0
  return parseInt(c.rank, 10)
}

function handTotal(cards: Card[]): number {
  const sum = cards.reduce((acc, c) => acc + cardValue(c), 0)
  return sum % 10
}

function buildShoe(): Card[] {
  const shoe: Card[] = []
  for (let d = 0; d < 8; d++) {
    for (const r of ranks) {
      for (const s of suits) {
        shoe.push({ rank: r, suit: s })
      }
    }
  }
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shoe[i], shoe[j]] = [shoe[j], shoe[i]]
  }
  return shoe
}

function cloneBets(b: Bets): Bets {
  return { ...b }
}

function sumBets(b: Bets): number {
  return b.player + b.banker + b.tie + b.playerPair + b.bankerPair
}

export default function BaccaratDemo() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // 🌐 Arcade wallet (global)
  const { credits: arcadeCredits, net: arcadeNet, addWin, addLoss } = useArcadeWallet()

  // 🎰 Local table seats
  const [players, setPlayers] = useState<PlayerSeat[]>(() => initialPlayers)
  const [activeIdx, setActiveIdx] = useState(0)
  const activePlayer = players[activeIdx] ?? players[0]
  const credits = activePlayer?.credits ?? 0
  const sessionPnL = activePlayer?.sessionPnL ?? 0

  // sync seat PnL → arcade wallet
  const [syncedPnL, setSyncedPnL] = useState(0)
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

  const [phase, setPhase] = useState<Phase>('betting')
  const [bets, setBets] = useState<Bets>(() => ({
    player: 0,
    banker: 0,
    tie: 0,
    playerPair: 0,
    bankerPair: 0,
  }))
  const [chip, setChip] = useState<number>(5)

  // 🔁 Shoe lives in a mutable ref; we track only the count in state for UI
  const shoeRef = useRef<Card[]>([])
  const [shoeCount, setShoeCount] = useState(0)

  useEffect(() => {
    const fresh = buildShoe()
    shoeRef.current = fresh
    setShoeCount(fresh.length)
  }, [])

  const [playerHand, setPlayerHand] = useState<HandSide>({ cards: [], total: 0 })
  const [bankerHand, setBankerHand] = useState<HandSide>({ cards: [], total: 0 })
  const [result, setResult] = useState<RoundResult | null>(null)
  const [pairPlayer, setPairPlayer] = useState(false)
  const [pairBanker, setPairBanker] = useState(false)

  const [banner, setBanner] = useState<string>('Place your bets.')
  const [detailMsg, setDetailMsg] = useState<string>(
    'Standard baccarat rules. Player vs Banker.'
  )
  const [lastOutcomeTrack, setLastOutcomeTrack] = useState<RoundResult[]>([])

  const [priceUsd, setPriceUsd] = useState<number | null>(null)

  useEffect(() => {
    let t: any
    const load = async () => {
      try {
        const r = await fetch('/api/bgld-price', { cache: 'no-store' })
        const j = await r.json()
        if (typeof j?.priceUsd === 'number') setPriceUsd(j.priceUsd)
      } catch {
        // ignore
      }
      t = setTimeout(load, 30_000)
    }
    load()
    return () => clearTimeout(t)
  }, [])

  const approxUsd = (v: number) => {
    if (!priceUsd) return '…'
    const x = v * priceUsd
    return `~$${x < 1 ? x.toFixed(4) : x.toFixed(2)}`
  }

  const stagedTotal = useMemo(() => sumBets(bets), [bets])
  const remainingCredits = credits - stagedTotal

  function updateActivePlayer(deltaCredits: number, deltaPnL: number) {
    setPlayers(prev =>
      prev.map((p, i) =>
        i === activeIdx
          ? {
              ...p,
              credits: Math.max(0, p.credits + deltaCredits),
              sessionPnL: p.sessionPnL + deltaPnL,
            }
          : p
      )
    )
  }

  function addBet(key: BetKeys) {
    if (phase !== 'betting') return
    if (chip <= 0) return
    if (stagedTotal + chip > credits) {
      setBanner('Not enough credits for that bet.')
      return
    }

    setBets(prev => {
      const next = cloneBets(prev)
      next[key] += chip
      return next
    })
  }

  function clearBets() {
    if (phase !== 'betting') return
    setBets({
      player: 0,
      banker: 0,
      tie: 0,
      playerPair: 0,
      bankerPair: 0,
    })
    setBanner('Bets cleared. Place new bets.')
  }

  // ✅ Proper shoe draw: unique per hand, no undefined
  function drawCard(): Card {
    if (shoeRef.current.length === 0) {
      const fresh = buildShoe()
      shoeRef.current = fresh
      setShoeCount(fresh.length)
    }

    const deck = shoeRef.current
    const idx = deck.length - 1
    const drawn = deck[idx]
    deck.pop()
    setShoeCount(deck.length)
    return drawn
  }

  function dealRound() {
    if (phase !== 'betting') return
    if (stagedTotal <= 0) {
      setBanner('Place at least one bet before dealing.')
      return
    }
    if (credits <= 0) {
      setBanner(
        `${activePlayer.name} is out of credits! Switch seat or refresh to reset demo.`
      )
      return
    }

    setPhase('dealing')
    setBanner('Dealing cards…')
    setDetailMsg('Player and Banker receive two cards each.')

    const p1 = drawCard()
    const b1 = drawCard()
    const p2 = drawCard()
    const b2 = drawCard()

    const initialPlayer: Card[] = [p1, p2]
    const initialBanker: Card[] = [b1, b2]

    const initPlayerTotal = handTotal(initialPlayer)
    const initBankerTotal = handTotal(initialBanker)

    const natural = initPlayerTotal >= 8 || initBankerTotal >= 8

    setPlayerHand({ cards: initialPlayer, total: initPlayerTotal })
    setBankerHand({ cards: initialBanker, total: initBankerTotal })

    setPairPlayer(initialPlayer[0].rank === initialPlayer[1].rank)
    setPairBanker(initialBanker[0].rank === initialBanker[1].rank)

    // deduct stake from active seat up front
    updateActivePlayer(-stagedTotal, 0)

    if (natural) {
      setTimeout(() => finalizeRound(initialPlayer, initialBanker), 600)
      return
    }

    let playerThird: Card | null = null
    let bankerThird: Card | null = null

    if (initPlayerTotal <= 5) {
      playerThird = drawCard()
    }

    const tempPlayerCards = [...initialPlayer]
    if (playerThird) tempPlayerCards.push(playerThird)
    const playerTotalAfterThird = handTotal(tempPlayerCards)

    if (!playerThird) {
      if (initBankerTotal <= 5) bankerThird = drawCard()
    } else {
      const pt = cardValue(playerThird)
      const bt = initBankerTotal

      if (bt <= 2) {
        bankerThird = drawCard()
      } else if (bt === 3 && pt !== 8) {
        bankerThird = drawCard()
      } else if (bt === 4 && pt >= 2 && pt <= 7) {
        bankerThird = drawCard()
      } else if (bt === 5 && pt >= 4 && pt <= 7) {
        bankerThird = drawCard()
      } else if (bt === 6 && (pt === 6 || pt === 7)) {
        bankerThird = drawCard()
      }
    }

    const tempBankerCards = [...initialBanker]
    if (bankerThird) tempBankerCards.push(bankerThird)

    setTimeout(() => {
      setPlayerHand({
        cards: tempPlayerCards,
        total: playerTotalAfterThird,
      })
      setBankerHand({
        cards: tempBankerCards,
        total: handTotal(tempBankerCards),
      })
      setPhase('reveal')
      setDetailMsg('Final hands – resolving bets…')

      setTimeout(() => finalizeRound(tempPlayerCards, tempBankerCards), 600)
    }, 600)
  }

  function finalizeRound(playerCards: Card[], bankerCards: Card[]) {
    const pTotal = handTotal(playerCards)
    const bTotal = handTotal(bankerCards)

    let roundResult: RoundResult
    if (pTotal > bTotal) roundResult = 'PLAYER'
    else if (bTotal > pTotal) roundResult = 'BANKER'
    else roundResult = 'TIE'

    setResult(roundResult)
    setPhase('result')

    const totalStake = sumBets(bets)
    let grossReturn = 0

    // main bets (demo odds)
    if (roundResult === 'PLAYER') {
      if (bets.player > 0) grossReturn += bets.player * 2 // 1:1 + stake
    } else if (roundResult === 'BANKER') {
      if (bets.banker > 0) grossReturn += bets.banker * 1.95 // 0.95:1 + stake
    } else {
      if (bets.tie > 0) grossReturn += bets.tie * 9 // 8:1 + stake
      // player/banker push on tie
      grossReturn += bets.player
      grossReturn += bets.banker
    }

    // pair side bets (based on first two cards only)
    if (pairPlayer && bets.playerPair > 0) {
      grossReturn += bets.playerPair * 12 // 11:1 + stake
    }
    if (pairBanker && bets.bankerPair > 0) {
      grossReturn += bets.bankerPair * 12
    }

    const net = grossReturn - totalStake

    // credit back to active seat
    updateActivePlayer(grossReturn, net)

    setLastOutcomeTrack(prev => {
      const next = [roundResult, ...prev]
      return next.slice(0, 12)
    })

    if (roundResult === 'PLAYER') {
      setBanner(
        net > 0
          ? `PLAYER wins • +${net.toFixed(2)} BGRC (gross ${grossReturn.toFixed(
              2
            )})`
          : 'PLAYER wins • no paying bets this round.'
      )
    } else if (roundResult === 'BANKER') {
      setBanner(
        net > 0
          ? `BANKER wins • +${net.toFixed(2)} BGRC (gross ${grossReturn.toFixed(
              2
            )})`
          : 'BANKER wins • no paying bets this round.'
      )
    } else {
      setBanner(
        net > 0
          ? `TIE • +${net.toFixed(2)} BGRC (gross ${grossReturn.toFixed(2)})`
          : 'TIE • pushes on Player/Banker, tie bet only.'
      )
    }

    setDetailMsg(
      `Player ${pTotal} vs Banker ${bTotal} · ${
        pairPlayer ? 'Player Pair ' : ''
      }${pairBanker ? 'Banker Pair' : ''}`.trim()
    )
  }

  function nextRound() {
    setPhase('betting')
    setBets({
      player: 0,
      banker: 0,
      tie: 0,
      playerPair: 0,
      bankerPair: 0,
    })
    setPlayerHand({ cards: [], total: 0 })
    setBankerHand({ cards: [], total: 0 })
    setResult(null)
    setPairPlayer(false)
    setPairBanker(false)
    setBanner('Place your bets.')
    setDetailMsg('Standard baccarat rules. Player vs Banker.')
  }

  function selectSeat(idx: number) {
    if (phase !== 'betting') return
    if (idx === activeIdx) return
    setActiveIdx(idx)
    // soft reset of current round state
    setBets({
      player: 0,
      banker: 0,
      tie: 0,
      playerPair: 0,
      bankerPair: 0,
    })
    setPlayerHand({ cards: [], total: 0 })
    setBankerHand({ cards: [], total: 0 })
    setResult(null)
    setPairPlayer(false)
    setPairBanker(false)
    setPhase('betting')
    setBanner('Place your bets.')
    setDetailMsg('Standard baccarat rules. Player vs Banker.')
  }

  const canDeal = phase === 'betting' && stagedTotal > 0

  return (
    <div className="grid md:grid-cols-[minmax(360px,1.3fr)_320px] gap-6 items-start">
      {/* TABLE FELT + SEATS */}
      <div className="relative rounded-[30px] border border-emerald-400/50 bg-[radial-gradient(circle_at_10%_0%,#065f46,transparent_55%),radial-gradient(circle_at_90%_0%,#047857,transparent_55%),#022c22] shadow-[0_24px_60px_rgba(0,0,0,0.9)] px-4 py-5 md:px-6 md:py-6 overflow-hidden">
        {/* glow */}
        <div className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.45),transparent_60%)]" />

        {/* top HUD */}
        <div className="relative flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-50/90 font-semibold">
              BASE GOLD RUSH
            </div>
            <div className="text-lg md:text-xl font-extrabold text-emerald-50">
              Baccarat • BGRC Arcade Table
            </div>
            <div className="text-xs text-emerald-50/80">
              Player vs Banker with Tie &amp; Pair side bets. Local demo credits only.
            </div>
          </div>
          <div className="text-right text-[11px] text-emerald-50/80">
            <div>
              Active Seat:{' '}
              <span className="font-semibold text-emerald-100">
                {activePlayer.name}
              </span>
            </div>
            <div>
              Seat P&amp;L:{' '}
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
            <div className="text-[10px] text-emerald-100/70">
              Shoe cards remaining: {shoeCount}
            </div>
          </div>
        </div>

        {/* seat rail */}
        <div className="flex flex-wrap items-center gap-3 text-xs mb-4 relative z-10">
          <span className="text-[11px] uppercase tracking-[0.22em] text-emerald-50/60">
            Player Rail
          </span>
          {players.map((p, i) => {
            const isActive = i === activeIdx
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectSeat(i)}
                className={[
                  'flex items-center gap-2 rounded-full border px-3 py-1',
                  isActive
                    ? 'border-white bg-white/10 shadow-[0_0_14px_rgba(255,255,255,0.4)]'
                    : 'border-white/20 bg-black/40 hover:bg-white/10',
                ].join(' ')}
              >
                <span
                  className="w-5 h-5 rounded-full"
                  style={{ background: p.color }}
                />
                <span className="font-semibold text-white truncate max-w-[110px]">
                  {p.name}
                </span>
                <span className="text-[10px] text-white/60 hidden sm:inline">
                  {p.credits.toLocaleString()} BGRC
                </span>
              </button>
            )
          })}
        </div>

        {/* center felt: hands + bets */}
        <div className="relative rounded-[26px] border border-emerald-200/60 bg-[radial-gradient(circle_at_50%_0%,#059669,#065f46_55%,#022c22_80%)] px-4 py-4 md:px-6 md:py-5">
          {/* Player / Banker labels */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.24em] text-emerald-50/90">
                PLAYER
              </span>
              <span className="text-xs text-emerald-50/80">
                Pays 1:1 on win.
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[11px] uppercase tracking-[0.24em] text-emerald-50/90">
                BANKER
              </span>
              <span className="text-xs text-emerald-50/80">
                Pays 0.95:1 (5% commission).
              </span>
            </div>
          </div>

          {/* cards row */}
          <div className="grid grid-cols-[1.1fr_auto_1.1fr] gap-4 md:gap-8 items-center">
            {/* Player hand */}
            <div className="flex flex-col items-start gap-2">
              <div className="flex gap-1.5">
                {playerHand.cards.length === 0 ? (
                  <CardBack />
                ) : (
                  playerHand.cards.map((c, idx) => (
                    <BaccaratCard key={idx} card={c} side="player" />
                  ))
                )}
              </div>
              <div className="text-[11px] text-emerald-50/85">
                Total:{' '}
                <span className="font-semibold">
                  {playerHand.cards.length ? playerHand.total : '—'}
                </span>
              </div>
            </div>

            {/* VS + center chip */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-lg md:text-xl font-black tracking-[0.32em] text-[#fef9c3]">
                VS
              </div>
              <div className="relative w-10 h-10">
                <Image
                  src="/chips/chip-bgrc-25.png"
                  alt="Baccarat pot"
                  fill
                  className="object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
                />
              </div>
              <div className="text-[10px] text-emerald-50/80">
                Result:{' '}
                <span className="font-semibold">
                  {result === 'PLAYER'
                    ? 'PLAYER'
                    : result === 'BANKER'
                    ? 'BANKER'
                    : result === 'TIE'
                    ? 'TIE'
                    : '—'}
                </span>
              </div>
            </div>

            {/* Banker hand */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-1.5 justify-end">
                {bankerHand.cards.length === 0 ? (
                  <CardBack />
                ) : (
                  bankerHand.cards.map((c, idx) => (
                    <BaccaratCard key={idx} card={c} side="banker" />
                  ))
                )}
              </div>
              <div className="text-[11px] text-emerald-50/85">
                Total:{' '}
                <span className="font-semibold">
                  {bankerHand.cards.length ? bankerHand.total : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* banner + detail */}
          <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[11px]">
            <div className="inline-flex items-center rounded-full border border-amber-200/70 bg-black/60 px-3 py-1.5 text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.6)]">
              {banner}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-emerald-50/85">
              <span>{detailMsg}</span>
            </div>
          </div>

          {/* bet bands */}
          <div className="mt-4 grid grid-cols-[1.4fr_1.3fr] gap-3 text-[10px] md:text-[11px]">
            {/* main bets */}
            <div className="rounded-2xl border border-emerald-200/70 bg-black/35 px-3 py-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-50/85">
                  MAIN BETS
                </div>
                <div className="text-[10px] text-emerald-50/80">
                  Staged:{' '}
                  <span className="font-semibold text-emerald-50">
                    {stagedTotal.toFixed(2)} BGRC
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <BetChipBand
                  label="PLAYER"
                  amount={bets.player}
                  color="emerald"
                  onClick={() => addBet('player')}
                />
                <BetChipBand
                  label="BANKER"
                  amount={bets.banker}
                  color="blue"
                  onClick={() => addBet('banker')}
                />
                <BetChipBand
                  label="TIE"
                  amount={bets.tie}
                  color="purple"
                  onClick={() => addBet('tie')}
                />
              </div>
            </div>

            {/* side bets */}
            <div className="rounded-2xl border border-emerald-200/70 bg-black/35 px-3 py-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-50/85">
                  PAIR SIDE BETS
                </div>
                <div className="text-[10px] text-emerald-50/80">
                  Pairs pay 11:1
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <BetChipBand
                  label="PLAYER PAIR"
                  amount={bets.playerPair}
                  color="amber"
                  onClick={() => addBet('playerPair')}
                />
                <BetChipBand
                  label="BANKER PAIR"
                  amount={bets.bankerPair}
                  color="amber"
                  onClick={() => addBet('bankerPair')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Controls bar under felt — MOBILE FAST FLOW */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 relative z-10">
          {/* chip + clear */}
          <div>
            <div className="text-[11px] text-emerald-50/80 mb-1">
              Choose chip &amp; tap bet zones to place wagers
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {chipDenoms.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setChip(v)}
                  className={[
                    'relative rounded-full border px-2.5 py-1 flex items-center gap-1 text-[11px] font-semibold',
                    chip === v
                      ? 'border-[#facc15] bg-[#facc15]/20 text-[#fef9c3] shadow-[0_0_12px_rgba(250,204,21,0.8)]'
                      : 'border-emerald-200/60 bg-black/40 text-emerald-50 hover:bg-emerald-900/60',
                  ].join(' ')}
                >
                  <ChipIcon value={v} />
                  {v}
                </button>
              ))}
              <button
                type="button"
                onClick={clearBets}
                disabled={phase !== 'betting'}
                className="rounded-full border border-white/30 bg-black/40 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Clear Bets
              </button>
            </div>
          </div>

          {/* seat + single main CTA */}
          <div className="flex flex-col items-end gap-2 text-[11px] text-emerald-50/85">
            <div>
              Seat Credits:{' '}
              <span className="font-semibold text-emerald-50">
                {remainingCredits.toFixed(2)} BGRC
              </span>
              {priceUsd && (
                <span className="ml-1 text-emerald-100/70">
                  ({approxUsd(remainingCredits)})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (phase === 'result') {
                  nextRound()
                } else {
                  dealRound()
                }
              }}
              disabled={
                (phase === 'betting' && !canDeal) ||
                phase === 'dealing' ||
                phase === 'reveal'
              }
              className={[
                'rounded-full px-6 py-2 text-xs font-semibold tracking-[0.2em] uppercase',
                phase === 'dealing' || phase === 'reveal'
                  ? 'bg-slate-700 text-slate-300 cursor-wait'
                  : phase === 'result'
                  ? 'bg-[#facc15] text-black shadow-[0_0_18px_rgba(250,204,21,0.9)] hover:bg-[#fde68a]'
                  : phase === 'betting' && canDeal
                  ? 'bg-[#facc15] text-black shadow-[0_0_18px_rgba(250,204,21,0.9)] hover:bg-[#fde68a]'
                  : 'bg-slate-700 text-slate-300 cursor-not-allowed',
              ].join(' ')}
            >
              {phase === 'dealing' || phase === 'reveal'
                ? 'Dealing…'
                : phase === 'result'
                ? 'Deal Again'
                : 'Deal'}
            </button>
          </div>
        </div>

        {/* Outcome tracker */}
        <div className="mt-4 rounded-2xl border border-emerald-200/50 bg-black/30 px-3 py-2 text-[10px] text-emerald-50/85">
          <div className="flex items-center justify-between mb-1">
            <span className="uppercase tracking-[0.2em]">
              Last Outcomes
            </span>
            <span className="text-[10px] text-emerald-100/80">
              P = Player, B = Banker, T = Tie
            </span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {lastOutcomeTrack.length === 0 && <span>—</span>}
            {lastOutcomeTrack.map((r, i) => (
              <span
                key={i}
                className={[
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                  r === 'PLAYER'
                    ? 'bg-emerald-400 text-emerald-950'
                    : r === 'BANKER'
                    ? 'bg-sky-400 text-sky-950'
                    : 'bg-purple-400 text-purple-950',
                ].join(' ')}
              >
                {r === 'PLAYER' ? 'P' : r === 'BANKER' ? 'B' : 'T'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* SIDE PANEL / SUMMARY */}
      <div className="rounded-2xl border border-white/12 bg-gradient-to-b from-[#111827] via-[#020617] to-black p-4 md:p-5 space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.26em] text-white/60">
            GAME SUMMARY
          </div>
          <div className="mt-1 text-lg font-bold text-white">
            Baccarat Demo (BGRC Arcade)
          </div>
          <div className="mt-1 text-xs text-white/70">
            Fully local demo to model Base Gold Rush baccarat before we wire the
            V4 on-chain contract. All values are{' '}
            <span className="font-semibold">BGRC demo credits</span>.
          </div>
        </div>

        {/* Global arcade wallet + seat PnL */}
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

        <div className="rounded-xl border border-white/14 bg-black/40 p-3 text-xs space-y-2">
          <div className="text-sm font-semibold text-white">
            Table Rules (Demo)
          </div>
          <ul className="space-y-1 text-white/70 list-disc list-inside">
            <li>8-deck shoe (simulated) with standard baccarat drawing rules.</li>
            <li>
              Each round, you bet on <span className="font-semibold">Player</span>,{' '}
              <span className="font-semibold">Banker</span>, or{' '}
              <span className="font-semibold">Tie</span>.
            </li>
            <li>
              Cards 2–9 count as face value, Aces are 1, 10 / J / Q / K count as 0.
            </li>
            <li>
              Add the card values and only keep the last digit (0–9). Closest to 9
              wins.
            </li>
            <li>Player wins pay 1:1, Banker wins pay 0.95:1.</li>
            <li>Ties pay 8:1 (9x including stake).</li>
            <li>
              Optional Player / Banker Pair side bets pay 11:1 if the first two cards
              form a pair.
            </li>
          </ul>
          <div className="text-[11px] text-white/50 pt-1">
            Front-end only demonstration of gameplay &amp; UX.
            Future <span className="font-semibold text-[#facc15]">BGLD / BGRC</span>{' '}
            baccarat contracts can mirror these mechanics on-chain with
            verifiable randomness &amp; true payouts.
          </div>
          <div className="text-[11px] text-white/45 pt-1">
            Each seat tracks its own demo stack and P&amp;L. Arcade wallet tracks your
            total net across all demo games.
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- subcomponents ---------- */

function BaccaratCard({
  card,
  side,
}: {
  card: Card
  side: 'player' | 'banker'
}) {
  const isRed = card.suit === '♥' || card.suit === '♦'
  return (
    <div className="relative w-[60px] h-[86px] md:w-[72px] md:h-[104px] rounded-xl bg-white border border-slate-300 shadow-[0_8px_24px_rgba(0,0,0,0.8)] flex flex-col justify-between p-1.5">
      <div
        className={[
          'text-xs font-bold',
          isRed ? 'text-red-600' : 'text-slate-800',
        ].join(' ')}
      >
        {card.rank}
        <span className="ml-0.5">{card.suit}</span>
      </div>
      <div
        className={[
          'text-2xl md:text-3xl text-center',
          isRed ? 'text-red-600' : 'text-slate-800',
        ].join(' ')}
      >
        {card.suit}
      </div>
      <div
        className={[
          'text-xs font-bold self-end rotate-180',
          isRed ? 'text-red-600' : 'text-slate-800',
        ].join(' ')}
      >
        {card.rank}
        <span className="ml-0.5">{card.suit}</span>
      </div>
      <div
        className={[
          'pointer-events-none absolute inset-0 rounded-xl border-2',
          side === 'player'
            ? 'border-emerald-300/25'
            : 'border-sky-300/25',
        ].join(' ')}
      />
    </div>
  )
}

function CardBack() {
  return (
    <div className="w-[60px] h-[86px] md:w-[72px] md:h-[104px] rounded-xl border border-emerald-300 bg-[repeating-linear-gradient(135deg,#111827,#111827_4px,#1f2937_4px,#1f2937_8px)] shadow-[0_8px_24px_rgba(0,0,0,0.85)]" />
  )
}

function BetChipBand({
  label,
  amount,
  color,
  onClick,
}: {
  label: string
  amount: number
  color: 'emerald' | 'blue' | 'purple' | 'amber'
  onClick: () => void
}) {
  const palette =
    color === 'emerald'
      ? 'border-emerald-200/70 bg-emerald-950/60'
      : color === 'blue'
      ? 'border-sky-200/70 bg-sky-950/60'
      : color === 'purple'
      ? 'border-purple-200/70 bg-purple-950/60'
      : 'border-amber-200/70 bg-amber-950/60'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-2.5 py-2 text-left hover:bg-white/10 ${palette}`}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/85">
        {label}
      </div>
      <div className="mt-1 text-[11px] text-white/80">
        Bet:{' '}
        <span className="font-semibold">
          {amount.toLocaleString()} BGRC
        </span>
      </div>
    </button>
  )
}

function ChipIcon({ value }: { value: number }) {
  const src =
    value === 1
      ? '/chips/chip-bgrc-1.png'
      : value === 5
      ? '/chips/chip-bgrc-5.png'
      : value === 25
      ? '/chips/chip-bgrc-25.png'
      : '/chips/chip-bgrc-100.png'

  return (
    <div className="relative w-5 h-5">
      <Image
        src={src}
        alt={`${value} chip`}
        fill
        className="object-contain"
      />
    </div>
  )
}
