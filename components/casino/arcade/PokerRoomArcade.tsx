'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Image from 'next/image'
import { useArcadeWallet } from '@/lib/useArcadeWallet'

type SeatId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

type PlayerSeat = {
  seatId: SeatId
  name: string
  stack: number
  committed: number
  isYou: boolean
  isDealer: boolean
  isActive: boolean
  hasFolded: boolean
}

// Types for player actions at the table
type PlayerAction =
  | 'fold'
  | 'check'
  | 'call'
  | 'bet'
  | 'raise'
  | 'allin'

type BoardCard = {
  rank: string
  suit: string
}

type Pot = {
  id: number
  amount: number
}

type TablePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'

type TableState = {
  tableId: string
  bigBlind: number
  smallBlind: number
  minBuyIn: number
  maxBuyIn: number
  seats: PlayerSeat[]
  board: BoardCard[]
  pots: Pot[]
  phase: TablePhase
  heroSeatId: SeatId | null
  heroCards: BoardCard[]
  toActSeatId: SeatId | null
}

type ServerMessage =
  | { type: 'table_state'; payload: TableState }
  | { type: 'chat'; from: string; message: string }

type BaseClientMessage = {
  tableId: string
  playerId?: string
}

export type ClientMessage =
  | (BaseClientMessage & {
      kind: 'join'
      seatName: string
    })
  | (BaseClientMessage & {
      kind: 'leave'
    })
  | (BaseClientMessage & {
      kind: 'chat'
      text: string
    })
  | (BaseClientMessage & {
      kind: 'action'
      action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin'
      amount?: number
    })

const DEFAULT_TABLE_STATE: TableState = {
  tableId: 'bgld-holdem-1',
  bigBlind: 20,
  smallBlind: 10,
  minBuyIn: 1000,
  maxBuyIn: 5000,
  seats: [],
  board: [],
  pots: [],
  phase: 'waiting',
  heroSeatId: null,
  heroCards: [],
  toActSeatId: null,
}

/**
 * Simple WebSocket wrapper hook – points at NEXT_PUBLIC_POKER_WS_URL.
 * For now we gracefully fall back to local-only mode if no URL or connection issue.
 */
function usePokerSocket(onMessage: (msg: ServerMessage) => void) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_POKER_WS_URL
    if (!url) return

    let ws: WebSocket | null = null
    let alive = true

    try {
      ws = new WebSocket(url)
    } catch {
      return
    }

    ws.onopen = () => {
      if (!alive) return
      setReady(true)
    }

    ws.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data) as ServerMessage
        onMessage(msg)
      } catch {
        // ignore malformed
      }
    }

    ws.onclose = () => {
      if (!alive) return
      setReady(false)
    }

    ws.onerror = () => {
      setReady(false)
    }

    return () => {
      alive = false
      ws?.close()
    }
  }, [onMessage])

  const send = useCallback(
    (msg: ClientMessage) => {
      const url = process.env.NEXT_PUBLIC_POKER_WS_URL
      if (!url) return

      try {
        const ws = new WebSocket(url)
        ws.onopen = () => {
          ws.send(JSON.stringify(msg))
        }
      } catch {
        // ignore for now
      }
    },
    []
  )

  return { socketReady: ready, send }
}

export default function PokerRoomArcade() {
  const { credits, net } = useArcadeWallet()
  const [table, setTable] = useState<TableState>(DEFAULT_TABLE_STATE)
  const [nickname, setNickname] = useState('You')
  const [joined, setJoined] = useState(false)
  const [buyIn, setBuyIn] = useState(2000)
  const [lastBanner, setLastBanner] = useState<string>(
    'Grab a seat at the Gold Rush Hold’em table.'
  )

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    if (msg.type === 'table_state') {
      setTable(msg.payload)
    } else if (msg.type === 'chat') {
      setLastBanner(`${msg.from}: ${msg.message}`)
    }
  }, [])

  const { socketReady, send } = usePokerSocket(handleServerMessage)

  // Temporary local seeding when there is no backend yet
  useEffect(() => {
    if (socketReady || table.seats.length > 0) return
    // seed dummy table
    const heroSeat: PlayerSeat = {
      seatId: 0,
      name: nickname,
      stack: buyIn,
      committed: 0,
      isYou: true,
      isDealer: true,
      isActive: true,
      hasFolded: false,
    }
    const bots: PlayerSeat[] = [
      {
        seatId: 2,
        name: 'Prospector Pete',
        stack: 3200,
        committed: 0,
        isYou: false,
        isDealer: false,
        isActive: true,
        hasFolded: false,
      },
      {
        seatId: 4,
        name: 'Lucky Lil',
        stack: 2800,
        committed: 0,
        isYou: false,
        isDealer: false,
        isActive: true,
        hasFolded: false,
      },
      {
        seatId: 6,
        name: 'Railway Rick',
        stack: 4500,
        committed: 0,
        isYou: false,
        isDealer: false,
        isActive: true,
        hasFolded: false,
      },
    ]

    setTable(t => ({
      ...t,
      heroSeatId: 0,
      heroCards: [
        { rank: 'A', suit: '♠' },
        { rank: 'K', suit: '♠' },
      ],
      seats: [heroSeat, ...bots],
      phase: 'flop',
      board: [
        { rank: 'K', suit: '♦' },
        { rank: 'Q', suit: '♠' },
        { rank: '2', suit: '♣' },
      ],
      pots: [{ id: 1, amount: 180 }],
      toActSeatId: 2,
    }))
    setJoined(true)
  }, [socketReady, buyIn, nickname, table.seats.length])

  const heroSeat = useMemo(
    () => table.seats.find(s => s.isYou) ?? null,
    [table.seats]
  )

  const sortedSeats: PlayerSeat[] = useMemo(() => {
    if (!heroSeat) return table.seats
    const order: SeatId[] = [0, 1, 2, 3, 4, 5, 6, 7, 8]
    const heroIndex = order.indexOf(heroSeat.seatId)
    const rotated = [...order.slice(heroIndex), ...order.slice(0, heroIndex)]
    return rotated
      .map(id => table.seats.find(s => s.seatId === id))
      .filter(Boolean) as PlayerSeat[]
  }, [table.seats, heroSeat])

  const canAct =
    !!heroSeat && table.toActSeatId === heroSeat.seatId && !heroSeat.hasFolded

  function sendAction(action: PlayerAction, amount?: number) {
    if (!heroSeat) return

    if (socketReady) {
      const msg: ClientMessage = {
        tableId: table.tableId,
        playerId: heroSeat.name,
        kind: 'action',
        action,
        ...(amount !== undefined ? { amount } : {}),
      }
      send(msg)
    } else {
      // local-only demo banner
      setLastBanner(
        `You ${action}${amount ? ` ${amount} BGRC` : ''}. (Local demo – no backend yet.)`
      )
    }
  }

  const totalPot = table.pots.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="grid md:grid-cols-[minmax(360px,1.4fr)_320px] gap-5 items-start">
      {/* LEFT: TABLE */}
      <div className="relative rounded-[30px] border border-emerald-400/50 bg-[radial-gradient(circle_at_10%_0%,#064e3b,transparent_50%),radial-gradient(circle_at_90%_0%,#047857,transparent_50%),#022c22] shadow-[0_24px_70px_rgba(0,0,0,0.96)] px-4 py-5 md:px-6 md:py-6 overflow-hidden">
        {/* top glow */}
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.5),transparent_60%)]" />

        {/* header strip */}
        <div className="relative flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.32em] text-emerald-100/85 font-semibold">
              BASE GOLD RUSH
            </div>
            <div className="mt-1 text-xl md:text-2xl font-extrabold text-emerald-50">
              Hold’em Poker Room (Arcade)
            </div>
            <div className="text-[11px] text-emerald-100/80">
              6–9 player Texas Hold’em on BGRC demo credits. Railway socket ready.
            </div>
          </div>
          <div className="text-right text-[11px] text-emerald-100/80 space-y-1">
            <div>
              Blinds:{' '}
              <span className="font-semibold text-[#facc15]">
                {table.smallBlind}/{table.bigBlind} BGRC
              </span>
            </div>
            <div>
              Buy-in:{' '}
              <span className="font-semibold">
                {table.minBuyIn}–{table.maxBuyIn} BGRC
              </span>
            </div>
            <div>
              Phase:{' '}
              <span className="font-semibold capitalize">{table.phase}</span>
            </div>
          </div>
        </div>

        {/* TABLE FELT */}
        <div className="relative rounded-[26px] border border-emerald-200/70 bg-[radial-gradient(circle_at_40%_0%,#059669,#065f46_55%,#022c22_80%)] px-4 py-4 md:px-6 md:py-5 overflow-hidden">
          {/* Oval table graphic */}
          <div className="absolute inset-4 md:inset-6 rounded-[999px] border border-emerald-100/40 bg-[radial-gradient(circle_at_50%_20%,rgba(16,185,129,0.3),rgba(6,95,70,0.95)_70%)] shadow-[0_0_60px_rgba(0,0,0,0.9)]" />

          {/* POT + BOARD CENTER */}
          <div className="relative flex flex-col items-center justify-center mt-6 mb-7">
            <div className="text-[11px] text-emerald-50/90 flex items-center gap-2 mb-2">
              <span className="rounded-full bg-black/50 border border-emerald-200/60 px-3 py-1">
                Pot:{' '}
                <span className="font-semibold text-[#fef9c3]">
                  {totalPot.toLocaleString()} BGRC
                </span>
              </span>
              {table.pots.length > 1 && (
                <span className="text-[10px] text-emerald-50/70">
                  {table.pots.length} pots
                </span>
              )}
            </div>

            {/* board cards */}
            <div className="flex items-center gap-2">
              {([0, 1, 2, 3, 4] as const).map(i => {
                const card = table.board[i]
                return (
                  <div key={i} className="w-[52px] h-[76px] md:w-[60px] md:h-[90px]">
                    {card ? (
                      <PokerCard rank={card.rank} suit={card.suit} />
                    ) : (
                      <div className="w-full h-full rounded-xl border border-emerald-100/30 bg-black/30" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* banner */}
            <div className="mt-3 text-[11px] text-amber-50 bg-black/60 border border-amber-200/60 rounded-full px-3 py-1 shadow-[0_0_16px_rgba(251,191,36,0.6)] max-w-xs text-center">
              {lastBanner}
            </div>
          </div>

          {/* SEATS AROUND TABLE */}
          <div className="relative">
            {/* top row */}
            <div className="flex justify-between px-8 md:px-12 mb-4">
              {sortedSeats.slice(0, 3).map(seat => (
                <SeatPill
                  key={seat.seatId}
                  seat={seat}
                  isHero={seat.isYou}
                  toAct={table.toActSeatId === seat.seatId}
                />
              ))}
            </div>

            {/* mid-left & mid-right */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col gap-3 ml-2 md:ml-5">
                {sortedSeats.slice(3, 5).map(seat => (
                  <SeatPill
                    key={seat.seatId}
                    seat={seat}
                    isHero={seat.isYou}
                    toAct={table.toActSeatId === seat.seatId}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-3 mr-2 md:mr-5 items-end">
                {sortedSeats.slice(5, 7).map(seat => (
                  <SeatPill
                    key={seat.seatId}
                    seat={seat}
                    isHero={seat.isYou}
                    toAct={table.toActSeatId === seat.seatId}
                  />
                ))}
              </div>
            </div>

            {/* hero row bottom */}
            <div className="flex justify-center gap-4 md:gap-6 mt-2">
              {heroSeat && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-end gap-2">
                    {table.heroCards.map((c, i) => (
                      <PokerCard key={i} rank={c.rank} suit={c.suit} highlight />
                    ))}
                  </div>
                  <SeatPill
                    seat={heroSeat}
                    isHero
                    toAct={table.toActSeatId === heroSeat.seatId}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ACTION BAR */}
          <div className="relative mt-6 rounded-2xl border border-emerald-200/60 bg-black/75 px-3 py-3 flex flex-col gap-3">
            {!joined ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[11px] text-emerald-50/80">
                <div className="space-y-1">
                  <div className="font-semibold text-emerald-100">
                    Buy in to the Gold Rush table
                  </div>
                  <div>
                    Choose a nickname and buy-in amount. This is demo-only BGRC and won&apos;t
                    move real chips.
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    className="rounded-full border border-emerald-300/60 bg-black/70 px-3 py-1 text-[11px] text-emerald-50 outline-none"
                    placeholder="Nickname"
                  />
                  <select
                    value={buyIn}
                    onChange={e => setBuyIn(Number(e.target.value))}
                    className="rounded-full border border-emerald-300/60 bg-black/70 px-2 py-1 text-[11px] text-emerald-50 outline-none"
                  >
                    {[1000, 2000, 3000, 4000, 5000].map(v => (
                      <option key={v} value={v}>
                        {v.toLocaleString()} BGRC
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setJoined(true)}
                    className="rounded-full bg-gradient-to-r from-[#facc15] to-[#f97316] px-4 py-1.5 text-[11px] font-bold text-black tracking-[0.16em] uppercase shadow-[0_0_18px_rgba(250,204,21,0.9)]"
                  >
                    Sit Down
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-[11px] text-emerald-50/85">
                  <div>
                    Your stack:{' '}
                    <span className="font-semibold text-[#fef9c3]">
                      {heroSeat?.stack.toLocaleString() ?? '--'} BGRC
                    </span>
                  </div>
                  <div>
                    Arcade net:{' '}
                    <span
                      className={
                        net >= 0
                          ? 'text-emerald-300 font-semibold'
                          : 'text-rose-300 font-semibold'
                      }
                    >
                      {net >= 0 ? '+' : ''}
                      {net.toFixed(2)} BGRC
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => sendAction('fold')}
                    disabled={!canAct}
                    className="h-9 rounded-lg border border-rose-400/70 bg-rose-900/80 text-rose-100 font-semibold uppercase disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Fold
                  </button>
                  <button
                    type="button"
                    onClick={() => sendAction('check')}
                    disabled={!canAct}
                    className="h-9 rounded-lg border border-slate-300/70 bg-slate-800/90 text-white font-semibold uppercase disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Check
                  </button>
                  <button
                    type="button"
                    onClick={() => sendAction('call')}
                    disabled={!canAct}
                    className="h-9 rounded-lg border border-emerald-300/70 bg-emerald-700/90 text-white font-semibold uppercase disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Call
                  </button>
                  <button
                    type="button"
                    onClick={() => sendAction('bet', table.bigBlind)}
                    disabled={!canAct}
                    className="h-9 rounded-lg border border-[#facc15]/70 bg-black/85 text-[#facc15] font-semibold uppercase disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Bet {table.bigBlind}
                  </button>
                  <button
                    type="button"
                    onClick={() => sendAction('raise', table.bigBlind * 3)}
                    disabled={!canAct}
                    className="h-9 rounded-lg border border-indigo-300/70 bg-indigo-900/90 text-indigo-100 font-semibold uppercase disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Raise {table.bigBlind * 3}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: SIDEBAR SUMMARY */}
      <aside className="rounded-2xl border border-white/12 bg-gradient-to-b from-[#111827] via-[#020617] to-black p-4 md:p-5 space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.26em] text-white/60">
            GAME SUMMARY
          </div>
          <div className="mt-1 text-lg font-bold text-white">
            Hold’em Poker Room (Arcade)
          </div>
          <div className="mt-1 text-xs text-white/70">
            Multiplayer Texas Hold’em table running on BGRC demo credits. This front-end is wired
            for a Railway-hosted WebSocket coordinator and will eventually settle hands on Base
            via dedicated poker contracts.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-white/14 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">
              Demo Arcade Stack
            </div>
            <div className="mt-1 text-xl font-extrabold text-white">
              {credits.toLocaleString()}{' '}
              <span className="text-xs text-white/70">BGRC</span>
            </div>
            <div className="mt-1 text-[11px] text-white/55">
              Shared demo balance across all arcade games.
            </div>
          </div>

          <div className="rounded-xl border border-white/14 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">
              Seats in Action
            </div>
            <div className="mt-1 text-xl font-extrabold text-emerald-300">
              {table.seats.length}
            </div>
            <div className="mt-1 text-[11px] text-white/55">
              Supports up to 9 total seats around the Gold Rush table.
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/14 bg-black/40 p-3 text-xs space-y-2">
          <div className="text-sm font-semibold text-white">
            Table Rules (Demo)
          </div>
          <ul className="space-y-1 text-white/70 list-disc list-inside">
            <li>Texas Hold’em, 2 cards in hand and up to 5 on the board.</li>
            <li>Blinds structure {table.smallBlind}/{table.bigBlind} with configurable buy-in.</li>
            <li>6–9 players supported via centralized WebSocket coordinator.</li>
            <li>Demo arcade only — all chips are BGRC play credits.</li>
          </ul>
          <div className="text-[11px] text-white/50 pt-1">
            This room is built to plug into a Railway Node server that will manage shuffles, deal
            order, betting rounds, and rake, with eventual settlement flowing to on-chain poker
            contracts on Base mainnet.
          </div>
        </div>
      </aside>
    </div>
  )
}

/* ---------- smaller subcomponents ---------- */

function PokerCard({
  rank,
  suit,
  highlight,
}: {
  rank: string
  suit: string
  highlight?: boolean
}) {
  const isRed = suit === '♥' || suit === '♦'
  return (
    <div
      className={[
        'w-full h-full rounded-xl bg-white border flex flex-col justify-between p-1.5 md:p-2 shadow-[0_10px_24px_rgba(0,0,0,0.9)]',
        highlight
          ? 'border-[#facc15] ring-2 ring-[#facc15]/60'
          : 'border-slate-300',
      ].join(' ')}
    >
      <div
        className={
          isRed
            ? 'text-[10px] font-bold text-red-600'
            : 'text-[10px] font-bold text-slate-900'
        }
      >
        {rank}
        <span className="ml-0.5">{suit}</span>
      </div>
      <div
        className={
          isRed
            ? 'text-2xl text-center text-red-600'
            : 'text-2xl text-center text-slate-900'
        }
      >
        {suit}
      </div>
      <div
        className={[
          'text-[10px] font-bold self-end rotate-180',
          isRed ? 'text-red-600' : 'text-slate-900',
        ].join(' ')}
      >
        {rank}
        <span className="ml-0.5">{suit}</span>
      </div>
    </div>
  )
}

function SeatPill({
  seat,
  isHero,
  toAct,
}: {
  seat: PlayerSeat
  isHero: boolean
  toAct: boolean
}) {
  return (
    <div
      className={[
        'rounded-full border px-3 py-1.5 flex items-center gap-2 bg-black/65 backdrop-blur-sm',
        isHero
          ? 'border-[#facc15]/70 shadow-[0_0_18px_rgba(250,204,21,0.7)]'
          : 'border-emerald-200/60',
      ].join(' ')}
    >
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-900 flex items-center justify-center text-[11px] font-bold text-white">
        {seat.isDealer ? 'D' : seat.seatId + 1}
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] font-semibold text-emerald-50 truncate max-w-[120px]">
          {seat.name}
          {isHero && ' • You'}
        </span>
        <span className="text-[10px] text-emerald-100/80">
          {seat.stack.toLocaleString()} BGRC
          {seat.committed > 0 && ` • In: ${seat.committed}`}
        </span>
      </div>
      {toAct && (
        <span className="ml-1 text-[10px] text-[#facc15] font-semibold animate-pulse">
          TO ACT
        </span>
      )}
    </div>
  )
}
