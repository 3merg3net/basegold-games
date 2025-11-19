'use client'

import { useEffect, useMemo, useState } from 'react'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2'

type Card = {
  rank: Rank
  suit: Suit
}

type Phase = 'betting' | 'dealing' | 'result'

type Bets = {
  player: number
  banker: number
  tie: number
  playerPair: number
  bankerPair: number
}

const RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']
const SUITS: Suit[] = ['♠', '♥', '♦', '♣']

// --------- deck + baccarat helpers ---------

function buildDeck(shoeSize = 6): Card[] {
  const deck: Card[] = []
  for (let s = 0; s < shoeSize; s++) {
    for (const r of RANKS) {
      for (const su of SUITS) {
        deck.push({ rank: r, suit: su })
      }
    }
  }
  // shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function cardValue(c: Card | undefined): number {
  if (!c) return 0
  if (c.rank === 'A') return 1
  if (['10', 'J', 'Q', 'K'].includes(c.rank)) return 0
  return parseInt(c.rank, 10)
}

function handTotal(hand: Card[]): number {
  const sum = hand.reduce((acc, c) => acc + cardValue(c), 0)
  return sum % 10
}

type Outcome = 'PLAYER' | 'BANKER' | 'TIE'

type Payouts = {
  payout: number
  net: number
  outcome: Outcome
  playerPair: boolean
  bankerPair: boolean
}

function evalBets(
  bets: Bets,
  playerHand: Card[],
  bankerHand: Card[]
): Payouts {
  const totalBet =
    bets.player + bets.banker + bets.tie + bets.playerPair + bets.bankerPair

  if (totalBet <= 0) {
    return {
      payout: 0,
      net: 0,
      outcome: 'TIE',
      playerPair: false,
      bankerPair: false,
    }
  }

  const pTotal = handTotal(playerHand)
  const bTotal = handTotal(bankerHand)

  let outcome: Outcome
  if (pTotal > bTotal) outcome = 'PLAYER'
  else if (bTotal > pTotal) outcome = 'BANKER'
  else outcome = 'TIE'

  const playerPair =
    playerHand.length >= 2 &&
    playerHand[0].rank === playerHand[1].rank
  const bankerPair =
    bankerHand.length >= 2 &&
    bankerHand[0].rank === bankerHand[1].rank

  let payout = 0

  // Player / Banker / Tie
  if (outcome === 'PLAYER') {
    payout += bets.player * 2 // 1:1 plus stake
    // banker + tie bets are lost
  } else if (outcome === 'BANKER') {
    payout += bets.banker * 2 // 1:1 plus stake (ignoring commission in demo)
  } else {
    // TIE: pays 8:1, pushes on Player/Banker
    payout += bets.tie * 9 // 8:1 plus stake
    payout += bets.player // push
    payout += bets.banker // push
  }

  // Pairs (11:1, stake + 11x = 12x total)
  if (playerPair) {
    payout += bets.playerPair * 12
  }
  if (bankerPair) {
    payout += bets.bankerPair * 12
  }

  const net = payout - totalBet

  return { payout, net, outcome, playerPair, bankerPair }
}

// Banker draw rules for 3rd card
function shouldBankerDraw(bankerTotal: number, playerThird: Card | undefined): boolean {
  // if player stood (no third card), banker draws on 0–5
  if (!playerThird) return bankerTotal <= 5

  const pt = cardValue(playerThird)

  if (bankerTotal <= 2) return true
  if (bankerTotal === 3) return pt !== 8
  if (bankerTotal === 4) return pt >= 2 && pt <= 7
  if (bankerTotal === 5) return pt >= 4 && pt <= 7
  if (bankerTotal === 6) return pt === 6 || pt === 7
  return false
}

// --------- UI ---------

export default function BaccaratArcade() {
  const { credits, initialCredits, recordSpin } = useArcadeWallet()

  const [phase, setPhase] = useState<Phase>('betting')
  const [deck, setDeck] = useState<Card[]>(() => buildDeck(6))
  const [playerHand, setPlayerHand] = useState<Card[]>([])
  const [bankerHand, setBankerHand] = useState<Card[]>([])
  const [bets, setBets] = useState<Bets>({
    player: 0,
    banker: 0,
    tie: 0,
    playerPair: 0,
    bankerPair: 0,
  })
  const [chipValue, setChipValue] = useState(5)
  const [status, setStatus] = useState('Place your chips and deal a hand.')
  const [lastNet, setLastNet] = useState(0)
  const [lastOutcome, setLastOutcome] = useState<Outcome | null>(null)
  const [lastPairs, setLastPairs] = useState<{ playerPair: boolean; bankerPair: boolean }>({
    playerPair: false,
    bankerPair: false,
  })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768)
    }
  }, [])

  const totalBet = useMemo(
    () =>
      bets.player +
      bets.banker +
      bets.tie +
      bets.playerPair +
      bets.bankerPair,
    [bets]
  )

  const sessionPnL = useMemo(
    () => credits - initialCredits,
    [credits, initialCredits]
  )

  const playerTotal = handTotal(playerHand)
  const bankerTotal = handTotal(bankerHand)

  function ensureDeck() {
    if (deck.length < 20) {
      setDeck(buildDeck(6))
    }
  }

  function placeBet(key: keyof Bets) {
    if (phase !== 'betting') return
    if (chipValue <= 0) return
    // Very loose credit guard; full check is when dealing
    setBets(prev => ({
      ...prev,
      [key]: prev[key] + chipValue,
    }))
    setStatus('Tap DEAL HAND when your bets are set.')
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
    setStatus('Bets cleared. Place new chips.')
  }

  function dealHand() {
    if (phase !== 'betting') return
    if (totalBet <= 0) {
      setStatus('No bets placed. Tap the layout to add chips.')
      return
    }
    if (totalBet > credits) {
      setStatus('Not enough demo credits for that total bet.')
      return
    }

    ensureDeck()
    let d = [...deck]

    const drawCard = (): Card => {
      if (d.length === 0) {
        d = buildDeck(6)
      }
      const c = d.pop()
      if (!c) return drawCard()
      return c
    }

    const p: Card[] = [drawCard(), drawCard()]
    const b: Card[] = [drawCard(), drawCard()]

    let pTotal = handTotal(p)
    let bTotal = handTotal(b)

    // naturals
    const natural = pTotal >= 8 || bTotal >= 8

    let pThird: Card | undefined
    let bThird: Card | undefined

    if (!natural) {
      // Player draw
      if (pTotal <= 5) {
        pThird = drawCard()
        p.push(pThird)
        pTotal = handTotal(p)
      }

      // Banker draw per rules
      if (shouldBankerDraw(bTotal, pThird)) {
        bThird = drawCard()
        b.push(bThird)
        bTotal = handTotal(b)
      }
    }

    // log wager
    recordSpin({ wager: totalBet, payout: 0 })

    setDeck(d)
    setPlayerHand(p)
    setBankerHand(b)
    setPhase('dealing')
    setStatus('Dealing… tap RESOLVE HAND to see the result.')
    setLastNet(0)
    setLastOutcome(null)
    setLastPairs({ playerPair: false, bankerPair: false })
  }

  function resolveHand() {
    if (phase !== 'dealing') return

    const { payout, net, outcome, playerPair, bankerPair } = evalBets(
      bets,
      playerHand,
      bankerHand
    )

    if (payout > 0) {
      recordSpin({ wager: 0, payout })
    }

    setLastNet(net)
    setLastOutcome(outcome)
    setLastPairs({ playerPair, bankerPair })

    const base =
      outcome === 'PLAYER'
        ? 'Player wins.'
        : outcome === 'BANKER'
        ? 'Banker wins.'
        : 'Tie hand.'

    const pairBits = []
    if (playerPair) pairBits.push('Player Pair')
    if (bankerPair) pairBits.push('Banker Pair')

    const pairsText =
      pairBits.length > 0 ? ` ${pairBits.join(' & ')} hit.` : ''

    const netText =
      net > 0
        ? ` Net +${net} credits.`
        : net < 0
        ? ` Net ${net} credits.`
        : ' You broke even.'

    setStatus(base + pairsText + netText)
    setPhase('result')
  }

  function newRound() {
    setPhase('betting')
    setPlayerHand([])
    setBankerHand([])
    setStatus('Place your chips and deal a hand.')
    // keep bets if you want “Repeat” behavior,
    // or uncomment below to always clear:
    // setBets({ player: 0, banker: 0, tie: 0, playerPair: 0, bankerPair: 0 })
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
      {/* MOBILE TIP */}
      {isMobile && (
        <div className="mb-3 rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-[11px] text-white/75">
          <span className="font-semibold text-emerald-300">Tip:</span>{' '}
          For the cleanest view of both hands,{' '}
          <span className="font-semibold text-white">rotate your phone sideways</span>.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(360px,1.6fr)_minmax(260px,0.9fr)] items-start">
        {/* LEFT: TABLE / FELT */}
        <div className="rounded-[24px] border border-emerald-400/50 bg-[radial-gradient(circle_at_10%_0%,#065f46,transparent_55%),radial-gradient(circle_at_90%_0%,#047857,transparent_55%),#022c22] shadow-[0_24px_60px_rgba(0,0,0,0.9)] px-3 py-4 sm:px-4 sm:py-5 overflow-hidden">
          <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-[0.35em] text-emerald-100/80">
                Baccarat Arcade
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-white">
                Player • Banker • Tie
              </div>
              <div className="text-[11px] text-emerald-50/80">
                Single-player demo shoe with classic baccarat draw rules.
              </div>
            </div>

            <div className="flex items-end gap-2 sm:flex-col sm:items-end text-[11px]">
              <div className="rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-right">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/70">
                  Demo Credits
                </div>
                <div className="text-2xl font-black text-[#bbf7d0] tabular-nums">
                  {credits.toLocaleString()}
                </div>
              </div>
              <div className="text-right text-white/70">
                <div>
                  Session P&amp;L:{' '}
                  <span
                    className={
                      sessionPnL > 0
                        ? 'text-emerald-300 font-semibold'
                        : sessionPnL < 0
                        ? 'text-rose-300 font-semibold'
                        : 'text-slate-100 font-semibold'
                    }
                  >
                    {sessionPnL > 0 ? '+' : ''}
                    {sessionPnL}
                  </span>
                </div>
                <div>
                  Last Net:{' '}
                  <span
                    className={
                      lastNet > 0
                        ? 'text-emerald-300 font-semibold'
                        : lastNet < 0
                        ? 'text-rose-300 font-semibold'
                        : 'text-slate-100 font-semibold'
                    }
                  >
                    {lastNet > 0 ? '+' : ''}
                    {lastNet}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* HAND DISPLAY */}
          <div className="mt-2 rounded-2xl border border-emerald-200/50 bg-black/30 px-3 py-3">
            {/* Player row */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-emerald-600/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-50">
                  Player
                </div>
                <div className="text-[11px] text-emerald-100/80">
                  Total:{' '}
                  <span className="font-bold text-emerald-200">
                    {playerHand.length ? playerTotal : '—'}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 overflow-x-auto">
                {playerHand.length === 0 ? (
                  <span className="text-[11px] text-emerald-50/60">
                    No cards yet.
                  </span>
                ) : (
                  playerHand.map((c, idx) => (
                    <BaccaratCard key={idx} card={c} />
                  ))
                )}
              </div>
            </div>

            {/* Banker row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-emerald-900/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                  Banker
                </div>
                <div className="text-[11px] text-emerald-100/80">
                  Total:{' '}
                  <span className="font-bold text-emerald-200">
                    {bankerHand.length ? bankerTotal : '—'}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 overflow-x-auto">
                {bankerHand.length === 0 ? (
                  <span className="text-[11px] text-emerald-50/60">
                    No cards yet.
                  </span>
                ) : (
                  bankerHand.map((c, idx) => (
                    <BaccaratCard key={idx} card={c} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* STATUS */}
          <div className="mt-3 rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-[11px] text-white/80">
            {status}
          </div>

          {/* BETTING LAYOUT */}
          <div className="mt-3 grid gap-2 text-[11px] md:grid-cols-2">
            {/* Main bets */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-50/80">
                Main Bets
              </div>
              <BetTile
                label="Player"
                subtitle="1:1"
                amount={bets.player}
                highlight={lastOutcome === 'PLAYER'}
                onClick={() => placeBet('player')}
                color="emerald"
              />
              <BetTile
                label="Banker"
                subtitle="1:1 (no commission in demo)"
                amount={bets.banker}
                highlight={lastOutcome === 'BANKER'}
                onClick={() => placeBet('banker')}
                color="blue"
              />
              <BetTile
                label="Tie"
                subtitle="8:1"
                amount={bets.tie}
                highlight={lastOutcome === 'TIE'}
                onClick={() => placeBet('tie')}
                color="yellow"
              />
            </div>

            {/* Side bets + chip selector */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-50/80">
                Side Bets &amp; Chips
              </div>
              <BetTile
                label="Player Pair"
                subtitle="11:1"
                amount={bets.playerPair}
                highlight={lastPairs.playerPair}
                onClick={() => placeBet('playerPair')}
              />
              <BetTile
                label="Banker Pair"
                subtitle="11:1"
                amount={bets.bankerPair}
                highlight={lastPairs.bankerPair}
                onClick={() => placeBet('bankerPair')}
              />

              <div className="mt-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-50/80">
                  Chip Value
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {[1, 5, 10, 25, 100].map(v => (
                    <button
                      key={v}
                      onClick={() => setChipValue(v)}
                      className={[
                        'rounded-full px-3 py-1.5 text-[11px] font-semibold border',
                        chipValue === v
                          ? 'border-yellow-300 bg-yellow-400/20 text-yellow-50 shadow-[0_0_14px_rgba(250,204,21,0.8)]'
                          : 'border-emerald-200/70 bg-emerald-900/50 text-emerald-100 hover:bg-emerald-800/80',
                      ].join(' ')}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-[11px] text-emerald-50/90">
              Total Bet:{' '}
              <span className="font-semibold text-emerald-200">
                {totalBet}
              </span>{' '}
              credits
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={clearBets}
                disabled={phase !== 'betting' || totalBet === 0}
                className="h-9 rounded-full border border-emerald-200/60 bg-black/60 px-4 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-900/70 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Clear Bets
              </button>
              {phase === 'betting' && (
                <button
                  onClick={dealHand}
                  disabled={totalBet === 0}
                  className="h-10 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 px-6 text-[12px] font-extrabold uppercase tracking-[0.25em] text-black shadow-[0_0_24px_rgba(250,204,21,0.9)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Deal Hand
                </button>
              )}
              {phase === 'dealing' && (
                <button
                  onClick={resolveHand}
                  className="h-10 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500 px-6 text-[12px] font-extrabold uppercase tracking-[0.25em] text-black shadow-[0_0_24px_rgba(34,197,94,0.9)]"
                >
                  Resolve Hand
                </button>
              )}
              {phase === 'result' && (
                <button
                  onClick={newRound}
                  className="h-10 rounded-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 px-6 text-[12px] font-extrabold uppercase tracking-[0.25em] text-slate-900 shadow-[0_0_18px_rgba(148,163,184,0.9)]"
                >
                  New Round
                </button>
              )}
            </div>
          </div>

          <div className="mt-2 text-[10px] text-emerald-50/70">
            Demo arcade only — no real BGLD used. Payouts are simplified for fast
            play; final odds may adjust before on-chain baccarat launches.
          </div>
        </div>

        {/* RIGHT: SUMMARY PANEL */}
        <div className="rounded-[24px] border border-white/12 bg-gradient-to-b from-black/40 via-[#020617] to-black p-3 sm:p-4 space-y-3 text-xs text-white/80">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">
              Table Summary
            </div>
            <div className="mt-1 text-[13px] text-white">
              Single-seat baccarat demo tuned for quick mobile play. All action is
              tracked through your BGRC demo wallet.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <SummaryStat label="Player Bet" value={bets.player} />
            <SummaryStat label="Banker Bet" value={bets.banker} />
            <SummaryStat label="Tie Bet" value={bets.tie} />
            <SummaryStat label="Side Bets" value={bets.playerPair + bets.bankerPair} />
          </div>

          <div className="rounded-xl border border-white/12 bg-black/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 mb-1">
              Last Result
            </div>
            <div className="text-[13px] text-white">
              {lastOutcome == null ? (
                'No completed hands yet.'
              ) : (
                <>
                  Outcome:{' '}
                  <span className="font-semibold">
                    {lastOutcome === 'PLAYER'
                      ? 'Player Wins'
                      : lastOutcome === 'BANKER'
                      ? 'Banker Wins'
                      : 'Tie'}
                  </span>
                  {lastPairs.playerPair || lastPairs.bankerPair ? (
                    <>
                      {' • '}
                      <span className="text-emerald-300 font-semibold">
                        {lastPairs.playerPair && 'Player Pair'}
                        {lastPairs.playerPair && lastPairs.bankerPair && ' & '}
                        {lastPairs.bankerPair && 'Banker Pair'}
                      </span>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-[11px]">
            <div className="font-semibold mb-1">How this demo works</div>
            <ul className="list-disc pl-4 space-y-1 text-white/70">
              <li>Place bets on Player, Banker, Tie, and optional Pair side bets.</li>
              <li>Demo shoe uses standard baccarat draw rules and totals (0–9).</li>
              <li>
                All chips are free-play BGRC demo credits tracked locally. On-chain
                baccarat will use real BGLD on Base.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// --------- small UI helpers ---------

function BaccaratCard({ card }: { card: Card }) {
  const isRed = card.suit === '♥' || card.suit === '♦'
  return (
    <div className="w-[52px] h-[76px] sm:w-[60px] sm:h-[86px] rounded-lg bg-white border border-emerald-100 shadow-[0_10px_20px_rgba(0,0,0,0.85)] flex flex-col justify-between p-1.5">
      <div className={isRed ? 'text-[11px] font-bold text-red-600' : 'text-[11px] font-bold text-slate-800'}>
        {card.rank}
        <span className="ml-0.5">{card.suit}</span>
      </div>
      <div className={isRed ? 'text-2xl text-center text-red-600' : 'text-2xl text-center text-slate-800'}>
        {card.suit}
      </div>
      <div
        className={
          (isRed ? 'text-[11px] font-bold text-red-600' : 'text-[11px] font-bold text-slate-800') +
          ' self-end rotate-180'
        }
      >
        {card.rank}
        <span className="ml-0.5">{card.suit}</span>
      </div>
    </div>
  )
}

function BetTile({
  label,
  subtitle,
  amount,
  onClick,
  highlight,
  color,
}: {
  label: string
  subtitle: string
  amount: number
  onClick: () => void
  highlight?: boolean
  color?: 'emerald' | 'blue' | 'yellow'
}) {
  let base =
    'border-emerald-200/70 bg-emerald-900/60 text-emerald-50 hover:bg-emerald-800/80'
  if (color === 'blue') {
    base = 'border-sky-200/70 bg-sky-900/60 text-sky-50 hover:bg-sky-800/80'
  } else if (color === 'yellow') {
    base = 'border-yellow-200/70 bg-yellow-900/40 text-yellow-50 hover:bg-yellow-800/50'
  }

  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center justify-between rounded-xl border px-3 py-2 text-left transition',
        base,
        highlight
          ? 'ring-2 ring-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.9)]'
          : '',
      ].join(' ')}
    >
      <div>
        <div className="text-[12px] font-semibold">{label}</div>
        <div className="text-[10px] text-emerald-100/80">{subtitle}</div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-100/70">
          Bet
        </div>
        <div className="text-sm font-bold text-emerald-50">
          {amount.toLocaleString()}
        </div>
      </div>
    </button>
  )
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/12 bg-black/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-white">
        {value.toLocaleString()}
      </div>
    </div>
  )
}
