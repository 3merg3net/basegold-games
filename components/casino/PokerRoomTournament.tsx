// components/casino/PokerRoomTournament.tsx
'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePokerRoom } from '@/lib/pokerClient/usePokerRoom'
import { usePlayerProfileContext } from '@/lib/player/PlayerProfileProvider'
import PokerCard from '@/components/poker/PokerCard'
import type { HandHelper } from '@/lib/poker/handHelper'
import { getHandHelper } from '@/lib/poker/handHelper'


/**
 * TOURNAMENT TABLE CLIENT (auto-seat + private hole cards)
 * - Keeps old tournament WS logic (sit-on-connect, hole-cards, action envelope)
 * - New layout/vibe: BLUE felt, bumper seats, solid cards, compact hero actions (FLAT OVERLAY)
 * - No sit button, no dealer log, no unnecessary panels
 */

type SeatView = {
  seatIndex: number
  playerId: string | null
  name?: string
  chips?: number
}

type BettingPlayer = {
  seatIndex: number
  playerId: string
  stack: number
  inHand: boolean
  hasFolded: boolean
  committed: number
  totalContributed: number
}

type BettingState = {
  type: 'betting-state'
  handId: number
  street: 'preflop' | 'flop' | 'turn' | 'river' | 'done'
  pot: number
  buttonSeatIndex: number
  currentSeatIndex: number | null
  bigBlind: number
  smallBlind: number
  maxCommitted: number
  players: BettingPlayer[]
  smallBlindSeatIndex?: number | null
  bigBlindSeatIndex?: number | null
}

type TableState = {
  type: 'table-state'
  handId: number
  board: string[]
  players: Array<{
    seatIndex: number
    playerId: string
    name?: string
    cards?: string[]
  }>
}

type ShowdownMsg = {
  type: 'showdown'
  handId: number
  board: string[]
  players: Array<{
    seatIndex: number
    playerId: string
    name?: string
    cards?: string[]
    handName?: string
    winAmount?: number
  }>
}

type SeatUpdateMsg = {
  type: 'seats-update' | 'tournament-seats' | 'tournament-seats-update'
  seats: SeatView[]
}

type TournamentTableComplete = {
  type: 'tournament-table-complete'
  tournamentId?: string | null
  reason?: string
}

type Props = {
  tableRoomId: string
  tournamentId: string
  tournamentName?: string
  blindLevelSeconds?: number
  startCountdownSeconds?: number
}

/* ---------- Seat geometry (tight to bumper) ---------- */
/** NOTE: slot 0 is HERO seat; keep it HARD bottom-center */
const SEAT_GEOMETRY_PC_BUMPER: React.CSSProperties[] = [
  { bottom: '1.0%', left: '50%', transform: 'translate(-50%, 0)' }, // 0 hero
  { bottom: '6.5%', left: '28%', transform: 'translate(-50%, 0)' }, // 1
  { bottom: '6.5%', left: '72%', transform: 'translate(-50%, 0)' }, // 2
  { top: '78%', left: '13.5%', transform: 'translate(-50%, -50%)' }, // 3
  { top: '50%', left: '6%', transform: 'translate(-50%, -50%)' }, // 4
  { top: '22%', left: '13.5%', transform: 'translate(-50%, -50%)' }, // 5
  { top: '78%', right: '13.5%', transform: 'translate(50%, -50%)' }, // 6
  { top: '50%', right: '6%', transform: 'translate(50%, -50%)' }, // 7
  { top: '22%', right: '13.5%', transform: 'translate(50%, -50%)' }, // 8
]

const SEAT_GEOMETRY_MOBILE_BUMPER: React.CSSProperties[] = [
  { bottom: '1.5%', left: '51%', transform: 'translate(-50%, 0)' }, // 0 hero
  { bottom: '10%', left: '18%', transform: 'translate(-50%, 0)' }, // 1
  { bottom: '10%', left: '84%', transform: 'translate(-50%, 0)' }, // 2
  { top: '62%', left: '8%', transform: 'translate(-50%, -50%)' }, // 3
  { top: '40%', left: '6.5%', transform: 'translate(-50%, -50%)' }, // 4
  { top: '18%', left: '12%', transform: 'translate(-50%, -50%)' }, // 5
  { top: '62%', right: '8%', transform: 'translate(50%, -50%)' }, // 6
  { top: '40%', right: '6.5%', transform: 'translate(50%, -50%)' }, // 7
  { top: '18%', right: '12%', transform: 'translate(50%, -50%)' }, // 8
]

const DEFAULT_AVATARS = ['/avatars/av-1.png', '/avatars/av-2.png', '/avatars/av-3.png', '/avatars/av-4.png', '/avatars/av-5.png', '/avatars/av-6.png']

/* ---------- Formatting ---------- */

function formatChips(amount: number) {
  const n = Math.max(0, Math.floor(Number(amount || 0)))
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 2).replace(/\.0+$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 2).replace(/\.0+$/, '')}k`
  return String(n)
}

function clampInt(n: any, min: number, max: number) {
  const v = Math.floor(Number(n))
  if (!Number.isFinite(v)) return min
  return Math.max(min, Math.min(max, v))
}

function msToClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${mm}:${String(ss).padStart(2, '0')}`
}

function computeCallAmount(betting: BettingState | null, heroSeatIndex: number | null) {
  if (!betting || heroSeatIndex == null) return 0
  const hero = betting.players.find((p) => p.seatIndex === heroSeatIndex)
  if (!hero) return 0
  return Math.max(0, Math.floor((betting.maxCommitted ?? 0) - (hero.committed ?? 0)))
}

/* ---------- Component ---------- */

export default function PokerRoomTournament({
  tableRoomId,
  tournamentId,
  tournamentName,
  blindLevelSeconds = 600,
  startCountdownSeconds = 10,
}: Props) {
  const router = useRouter()
  const { profile } = usePlayerProfileContext() as any

  // Stable player id
  const [fallbackId, setFallbackId] = useState<string>('player-pending')
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      let id = window.localStorage.getItem('pgld-poker-player-id')
      if (!id) {
        const rand =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? ((crypto as any).randomUUID?.() || '').slice(0, 8)
            : Math.random().toString(36).slice(2, 10)
        id = `player-${rand}`
        window.localStorage.setItem('pgld-poker-player-id', id)
      }
      setFallbackId(id)
    } catch {
      setFallbackId('player-' + Math.random().toString(36).slice(2, 10))
    }
  }, [])

  const playerId = profile?.id || fallbackId
  const playerName = ((profile?.name ?? '') || 'Player').slice(0, 32)

  const { ready, messages, send } = usePokerRoom({
    roomId: tableRoomId,
    playerId,
    playerName,
    tableName: tournamentName || undefined,
    isPrivate: false,
  })

  const sendMessage = useCallback((msg: any) => (send as any)(msg), [send])

  /* ---------- Latest messages ---------- */

  const seatsMsg = useMemo<SeatUpdateMsg | null>(() => {
    const arr = (messages as any[]).filter(
      (m) =>
        m &&
        (m.type === 'seats-update' || m.type === 'tournament-seats' || m.type === 'tournament-seats-update') &&
        Array.isArray(m.seats)
    )
    return arr.length ? (arr[arr.length - 1] as SeatUpdateMsg) : null
  }, [messages])

  const seats = useMemo<SeatView[]>(() => seatsMsg?.seats ?? [], [seatsMsg])

  const table = useMemo<TableState | null>(() => {
    const arr = (messages as any[]).filter((m) => m && m.type === 'table-state')
    return arr.length ? (arr[arr.length - 1] as TableState) : null
  }, [messages])

  const betting = useMemo<BettingState | null>(() => {
    const arr = (messages as any[]).filter((m) => m && m.type === 'betting-state')
    return arr.length ? (arr[arr.length - 1] as BettingState) : null
  }, [messages])

  const showdown = useMemo<ShowdownMsg | null>(() => {
    const arr = (messages as any[]).filter((m) => m && m.type === 'showdown')
    return arr.length ? (arr[arr.length - 1] as ShowdownMsg) : null
  }, [messages])

  const tableComplete = useMemo<TournamentTableComplete | null>(() => {
    const arr = (messages as any[]).filter((m) => m && m.type === 'tournament-table-complete')
    return arr.length ? (arr[arr.length - 1] as TournamentTableComplete) : null
  }, [messages])

  const lastError = useMemo<string | null>(() => {
    const arr = (messages as any[]).filter((m) => m && m.type === 'error' && typeof m.message === 'string')
    return arr.length ? String(arr[arr.length - 1].message) : null
  }, [messages])

  /* ---------- Derived ---------- */

  const heroSeat = useMemo(() => seats.find((s) => s.playerId === playerId) || null, [seats, playerId])
  const heroSeatIndex = heroSeat?.seatIndex ?? null
  const isHeroSeated = Boolean(heroSeat?.playerId)

  const heroBetting = useMemo(() => {
    if (!betting || heroSeatIndex == null) return null
    return betting.players.find((p) => p.seatIndex === heroSeatIndex) || null
  }, [betting, heroSeatIndex])

  const heroStack = useMemo(() => {
    const fromBetting = heroBetting?.stack
    if (typeof fromBetting === 'number') return Math.max(0, Math.floor(fromBetting))
    return Math.max(0, Math.floor(Number(heroSeat?.chips ?? 0)))
  }, [heroBetting, heroSeat])

  const eligibleCount = useMemo(() => seats.filter((s) => s.playerId && (s.chips ?? 0) > 0).length, [seats])
  const occupiedCount = useMemo(() => seats.filter((s) => s.playerId).length, [seats])

  const currentSeatIndex = betting?.currentSeatIndex ?? null
  const isMyTurn = Boolean(
    betting &&
      betting.street !== 'done' &&
      currentSeatIndex != null &&
      heroSeatIndex != null &&
      currentSeatIndex === heroSeatIndex
  )

  const handInProgress = Boolean(betting && betting.street !== 'done')
  const callAmount = useMemo(() => computeCallAmount(betting, heroSeatIndex), [betting, heroSeatIndex])

  const heroInHand = Boolean(heroBetting?.inHand && !heroBetting?.hasFolded)
  const canCheck = Boolean(callAmount === 0)
  const canCall = Boolean(callAmount > 0 && heroStack > 0)

  const board = useMemo(() => {
  const b = (table?.board?.length ? table.board : showdown?.board) ?? []
  return Array.isArray(b) ? b : []
}, [table?.board, showdown?.board])


  

  const pot = betting?.pot ?? 0
  const street = betting?.street ?? 'done'

  // Host = lowest occupied seatIndex
  const hostSeatIndex = useMemo(() => {
    const occ = seats.filter((s) => s.playerId)
    if (!occ.length) return null
    return occ.reduce((min, s) => (min == null ? s.seatIndex : Math.min(min, s.seatIndex)), null as any)
  }, [seats])

  const isHost = Boolean(heroSeatIndex != null && hostSeatIndex != null && heroSeatIndex === hostSeatIndex)
  const isWaiting = !betting || betting.street === 'done'

  /* ---------- Mobile geometry + table tilt ---------- */

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 767px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
    ;(mq as any).addListener(apply)
    return () => (mq as any).removeListener(apply)
  }, [])

  const ACTIVE_GEOMETRY = isMobile ? SEAT_GEOMETRY_MOBILE_BUMPER : SEAT_GEOMETRY_PC_BUMPER
  const tableTiltDeg = isMobile ? 14 : 18

  /* ---------- PRIVATE hole cards ---------- */

  const [myHoleCards, setMyHoleCards] = useState<string[] | null>(null)

  const holeMsg = useMemo<{ handId: number; cards: string[] } | null>(() => {
    const arr = (messages as any[]).filter((m) => m && m.type === 'hole-cards' && Array.isArray(m.cards))
    if (!arr.length) return null
    const last = arr[arr.length - 1]
    return { handId: Number(last.handId ?? 0), cards: (last.cards as string[]).slice(0, 2) }
  }, [messages])

  useEffect(() => {
    if (!table?.handId) return
    setMyHoleCards(null)
  }, [table?.handId])

  useEffect(() => {
    const m = (messages as any[]).slice(-1)[0]
    if (!m) return

    const t = String(m.type || '')
    const cards: string[] | null =
      (Array.isArray(m.holeCards) ? (m.holeCards as string[]) : null) ||
      (Array.isArray(m.cards) ? (m.cards as string[]) : null) ||
      (Array.isArray(m.hand) ? (m.hand as string[]) : null)

    const target = String(m.playerId || m.toPlayerId || m.to || '')
    const isMine = target ? target === String(playerId) : Boolean(m.private === true || m.scope === 'private')

    const looksLikeHoleCards =
      t === 'hole-cards' ||
      t === 'private-hole-cards' ||
      t === 'your-hole-cards' ||
      t === 'player-hole-cards' ||
      t === 'deal-hole-cards'

    if (looksLikeHoleCards && cards && cards.length >= 2 && isMine) {
      setMyHoleCards(cards.slice(0, 2))
    }
  }, [messages, playerId])

  useEffect(() => {
    if (!holeMsg?.cards?.length) return
    setMyHoleCards(holeMsg.cards.slice(0, 2))
  }, [holeMsg?.handId])

  const [joinedMidHand, setJoinedMidHand] = useState(false)

  useEffect(() => {
    if (!isHeroSeated) return
    if (handInProgress && (!myHoleCards || myHoleCards.length < 2)) {
      setJoinedMidHand(true)
      return
    }
    if (myHoleCards && myHoleCards.length >= 2) {
      setJoinedMidHand(false)
    }
  }, [isHeroSeated, handInProgress, myHoleCards])

  const handKey = useMemo(
    () => (betting?.handId ? String(betting.handId) : table?.handId ? String(table.handId) : 'none'),
    [betting?.handId, table?.handId]
  )
  useEffect(() => {
    setJoinedMidHand(false)
  }, [handKey])

  const heroHand = useMemo(() => {
    if (joinedMidHand && handInProgress && (!myHoleCards || myHoleCards.length < 2)) return null
    if (myHoleCards && myHoleCards.length === 2) return myHoleCards
    return null
  }, [myHoleCards, joinedMidHand, handInProgress])


  const heroHandHelper = useMemo<HandHelper | null>(() => {
  if (!heroHand || heroHand.length < 2) return null
  if (!board || board.length < 3) return null
  return getHandHelper(heroHand, board)
}, [heroHand, board])

// ---- Hand helper (reuse cash helper) ----
// Make sure these are imported in this file:
// import type { HandHelper } from "@/lib/poker/handHelper" (or wherever)
// import { getHandHelper } from "@/lib/poker/handHelper"




  /* ---------- Timers ---------- */

  const ACTION_SECONDS = 18
  const [actionLeft, setActionLeft] = useState<number>(ACTION_SECONDS)
  const actionKey = useMemo(() => {
    if (!betting) return 'none'
    return `${betting.handId}:${betting.street}:${betting.currentSeatIndex ?? 'x'}`
  }, [betting])

  useEffect(() => setActionLeft(ACTION_SECONDS), [actionKey])

  useEffect(() => {
    if (!isMyTurn) return
    const t = setInterval(() => setActionLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [isMyTurn])

  const actionPct = useMemo(() => {
    const p = (actionLeft / ACTION_SECONDS) * 100
    return Math.max(0, Math.min(100, p))
  }, [actionLeft])

  const levelStartRef = useRef<number | null>(null)
  const [levelMsLeft, setLevelMsLeft] = useState<number>(blindLevelSeconds * 1000)

  useEffect(() => {
    if (!betting?.handId) return
    if (levelStartRef.current == null) {
      levelStartRef.current = Date.now()
      setLevelMsLeft(blindLevelSeconds * 1000)
    }
  }, [betting?.handId, blindLevelSeconds])

  useEffect(() => {
    if (levelStartRef.current == null) return
    const t = setInterval(() => {
      const elapsed = Date.now() - (levelStartRef.current as number)
      const left = blindLevelSeconds * 1000 - elapsed
      setLevelMsLeft(left)
    }, 1000)
    return () => clearInterval(t)
  }, [blindLevelSeconds])

  const levelClock = useMemo(() => msToClock(levelMsLeft), [levelMsLeft])

  const [startLeft, setStartLeft] = useState<number>(startCountdownSeconds)
  const shouldShowStartCountdown = useMemo(() => {
    const noHandYet = !betting || !betting.handId
    return noHandYet && eligibleCount >= 2
  }, [betting, eligibleCount])

  useEffect(() => {
    if (!shouldShowStartCountdown) return
    setStartLeft(startCountdownSeconds)
    const t = setInterval(() => setStartLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [shouldShowStartCountdown, startCountdownSeconds])

  /* ---------- Tournament closure ---------- */

  const [showComplete, setShowComplete] = useState(false)
  useEffect(() => {
    if (!tableComplete) return
    setShowComplete(true)
    const t = setTimeout(() => router.push('/poker/tournaments'), 1800)
    return () => clearTimeout(t)
  }, [tableComplete, router])

  /* ---------- Actions ---------- */

  const [raiseAmt, setRaiseAmt] = useState<number>(0)

  const minRaise = useMemo(() => {
    if (!betting) return 0
    const bb = Math.max(0, Math.floor(betting.bigBlind ?? 0))
    return Math.max(1, bb)
  }, [betting])

  useEffect(() => {
    setRaiseAmt((prev) => {
      const base = minRaise
      if (!Number.isFinite(prev) || prev <= 0) return base
      return Math.max(base, prev)
    })
  }, [minRaise, betting?.handId, betting?.street])

  const doAction = useCallback(
    (action: 'fold' | 'check' | 'call' | 'bet', amount?: number) => {
      if (!ready) return
      if (!isHeroSeated) return
      if (!isMyTurn) return
      sendMessage({ kind: 'poker', type: 'action', playerId, action, amount })
    },
    [ready, isHeroSeated, isMyTurn, sendMessage, playerId]
  )

  const leaveTable = useCallback(() => router.push('/poker/tournaments'), [router])

  // Auto-seat once connected
  useEffect(() => {
    if (!ready) return
    if (!playerId) return
    if (isHeroSeated) return
    sendMessage({ type: 'sit', name: playerName } as any)
  }, [ready, playerId, playerName, isHeroSeated, sendMessage])

  /* ---------- Winner display ---------- */

  const [winnerLine, setWinnerLine] = useState<string | null>(null)
  useEffect(() => {
    if (!showdown?.players?.length) return
    const byWin = [...showdown.players].filter((p) => typeof p.winAmount === 'number')
    if (byWin.length) {
      byWin.sort((a, b) => (Number(b.winAmount) || 0) - (Number(a.winAmount) || 0))
      const w = byWin[0]
      const nm = (w.name || (w.playerId === playerId ? 'You' : 'Player')).slice(0, 18)
      setWinnerLine(`${nm} wins ${formatChips(Number(w.winAmount || 0))}`)
      const t = setTimeout(() => setWinnerLine(null), 3500)
      return () => clearTimeout(t)
    } else {
      setWinnerLine('Hand complete')
      const t = setTimeout(() => setWinnerLine(null), 2500)
      return () => clearTimeout(t)
    }
  }, [showdown, playerId])

  /* ---------- Title ---------- */

  const title = tournamentName || 'Tournament'
  useEffect(() => {
    document.title = `${title} • Table`
  }, [title])

  const avatarSizeCls = isMobile ? 'h-12 w-12' : 'h-14 w-14 md:h-20 md:w-20'
  const labelWidthCls = isMobile ? 'w-[96px] text-[10px]' : 'w-[110px] md:w-[150px] text-[10px] md:text-[11px]'

  /* ---------- Helpers for seat rendering ---------- */

  const totalBySeat: Record<number, number> = useMemo(() => {
    const map: Record<number, number> = {}
    if (!betting?.players) return map
    for (const p of betting.players) map[p.seatIndex] = Number((p as any).totalContributed ?? 0)
    return map
  }, [betting])

  const seatByIndex = useMemo(() => {
    const m = new Map<number, SeatView>()
    seats.forEach((s) => m.set(s.seatIndex, s))
    return m
  }, [seats])

  const slotToSeatIndex = useMemo(() => {
    const N = 9
    const out: number[] = Array.from({ length: N }, (_, i) => i)
    if (heroSeatIndex == null) return out
    const REL = [0, -1, +1, -2, -3, -4, +2, +3, +4]
    for (let slot = 0; slot < N; slot++) out[slot] = (heroSeatIndex + REL[slot] + N) % N
    return out
  }, [heroSeatIndex])

  


  /* ---------- Render ---------- */

  return (
    <main className="min-h-screen bg-black text-white">
      {/* TOP HUD */}
      <div className="mx-auto max-w-6xl px-4 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${ready ? 'bg-emerald-400' : 'bg-white/30'}`} />
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">Tournament Table</div>
              <span className="rounded-full border border-sky-300/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-extrabold text-sky-200">
                {betting ? (street === 'done' ? 'WAITING' : street.toUpperCase()) : 'WAITING'}
              </span>
            </div>

            <div className="mt-1 truncate text-lg md:text-xl font-extrabold text-white/90">{title}</div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/70">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Table <span className="font-mono text-white/85">{tableRoomId}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Players <span className="font-mono text-white/85">{occupiedCount}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Alive <span className="font-mono text-white/85">{eligibleCount}</span>
              </span>
              {betting?.smallBlind != null && betting?.bigBlind != null && (
                <span className="rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1 text-amber-200">
                  Blinds <span className="font-mono text-amber-100">{betting.smallBlind}/{betting.bigBlind}</span>
                </span>
              )}
              {levelStartRef.current != null && (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Level <span className="font-mono text-white/85">{levelClock}</span>
                </span>
              )}
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Stack <span className="font-mono text-white/85">{formatChips(heroStack)}</span>
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              href="/poker/tournaments"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-extrabold text-white/80 hover:bg-white/10"
            >
              ← Tournaments
            </Link>

            <button
              type="button"
              onClick={leaveTable}
              className="rounded-full border border-white/15 bg-black/40 px-4 py-2 text-[12px] font-extrabold text-white/70 hover:bg-white/10"
              title="Leave table"
            >
              Leave
            </button>
          </div>
        </div>

        {isHost && isWaiting && eligibleCount >= 2 && (
          <button
            type="button"
            onClick={() => sendMessage({ type: 'start-hand' } as any)}
            className="mt-3 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-4 py-2 text-[12px] font-extrabold text-emerald-100 hover:bg-emerald-500/20"
            title="Host: start the next hand"
          >
            Start Hand
          </button>
        )}

        {winnerLine && (
          <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-[12px] text-emerald-200">
            {winnerLine}
          </div>
        )}

        {lastError && (
          <div className="mt-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-[12px] text-rose-200">
            {lastError}
          </div>
        )}

        {shouldShowStartCountdown && (
          <div className="mt-3 rounded-2xl border border-sky-300/20 bg-sky-500/10 px-4 py-2 text-[12px] text-sky-200">
            Next hand starts in <span className="font-extrabold">{startLeft}</span>s
          </div>
        )}
      </div>

      {/* TABLE */}
      <section className="mx-auto max-w-6xl px-4 pb-36 md:pb-40">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#030712] via-black to-black p-4 md:p-6 shadow-[0_0_70px_rgba(0,0,0,0.95)]">
          <div className="relative mx-auto w-full max-w-[1320px] h-[66svh] md:h-[72vh] [perspective:1800px]">
            {/* ✅ 3D TABLE ONLY */}
            <div
              className="absolute inset-0 [transform-style:preserve-3d]"
              style={{ transform: `rotateX(${tableTiltDeg}deg)` }}
            >
              {/* rail */}
              <div className="absolute inset-0 rounded-[999px] bg-[radial-gradient(circle_at_top,#1b1f2e_0,#0b1020_55%,#05060b_100%)] shadow-[0_26px_90px_rgba(0,0,0,1)]" />

              {/* felt */}
              <div
                className={[
                  'absolute inset-[4%] md:inset-[5%] rounded-[999px] overflow-hidden',
                  'border border-[#93c5fd]/35',
                  'shadow-[0_0_40px_rgba(59,130,246,0.10),0_0_90px_rgba(0,0,0,0.9)]',
                  'bg-[radial-gradient(circle_at_top,#2563eb_0,#1d4ed8_18%,#0b2a68_45%,#081a3a_72%,#050914_100%)]',
                ].join(' ')}
              >
                {/* center logo */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-90">
                  <div className="flex flex-col items-center">
                    <Image
                      src="/felt/bgrc-logo.png"
                      alt="Logo"
                      width={140}
                      height={140}
                      className="opacity-85 drop-shadow-[0_0_18px_rgba(59,130,246,0.45)]"
                    />
                    <div className="mt-1 text-[9px] uppercase tracking-[0.35em] text-white/70">TOURNAMENT TABLE</div>
                  </div>
                </div>

                {/* pot + street */}
                <div className="pointer-events-none absolute left-1/2 top-[11%] z-[60] -translate-x-1/2 flex flex-col items-center gap-1">
                  <div className="rounded-full border border-white/15 bg-black/70 px-4 py-1 text-[11px] md:text-[12px] font-extrabold text-white/90">
                    Pot <span className="font-mono text-sky-200">{formatChips(pot)}</span>
                  </div>
                  {betting && betting.street !== 'done' && (
                    <div className="rounded-full border border-white/10 bg-black/55 px-3 py-[2px] text-[10px] font-semibold text-white/70">
                      {betting.street.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* board */}
                <div className="pointer-events-none absolute left-1/2 top-[48%] z-[40] -translate-x-1/2 -translate-y-1/2 px-2">
                  <div className="flex gap-1.5 md:gap-2">
                    {board.map((c, i) => {
                      const tilts = [-3, 0, 0, 0, 3]
                      return (
                        <PokerCard
                          key={`${betting?.handId ?? table?.handId ?? 0}-board-${i}-${c}`}
                          card={c}
                          delayIndex={i}
                          tilt={tilts[i]}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* seats */}
                <div className="absolute inset-[2%] text-[10px] text-white/80 md:text-[11px]">
                  {Array.from({ length: 9 }).map((_, slotIndex) => {
                    const seatIndex = slotToSeatIndex[slotIndex]
                    const seat = typeof seatIndex === 'number' ? seatByIndex.get(seatIndex) : undefined

                    const isOccupied = !!seat?.playerId
                    const isHero = isOccupied && seat!.playerId === playerId

                    const seatBetting = isOccupied ? betting?.players.find((p) => p.seatIndex === seat!.seatIndex) : undefined
                    const isInHand = !!seatBetting && seatBetting.inHand && !seatBetting.hasFolded

                    const isActing =
                      isOccupied && betting?.street !== 'done' && betting?.currentSeatIndex != null && betting.currentSeatIndex === seat!.seatIndex

                    const isButton =
                      isOccupied && betting?.buttonSeatIndex != null && betting.buttonSeatIndex === seat!.seatIndex

                    const sbSeatIndex =
                      betting && typeof betting.smallBlindSeatIndex === 'number' ? betting.smallBlindSeatIndex : null
                    const bbSeatIndex =
                      betting && typeof betting.bigBlindSeatIndex === 'number' ? betting.bigBlindSeatIndex : null

                    const isSB =
                      isOccupied && sbSeatIndex != null && betting?.street === 'preflop' && sbSeatIndex === seat!.seatIndex
                    const isBB =
                      isOccupied && bbSeatIndex != null && betting?.street === 'preflop' && bbSeatIndex === seat!.seatIndex

                    const committed = isOccupied ? (totalBySeat[seat!.seatIndex] ?? 0) : 0

                    const stylePos: React.CSSProperties =
                      ACTIVE_GEOMETRY[slotIndex] ?? ACTIVE_GEOMETRY[ACTIVE_GEOMETRY.length - 1]

                    const fallbackAvatar = DEFAULT_AVATARS[(seat?.seatIndex ?? slotIndex) % DEFAULT_AVATARS.length]
                    const label = !isOccupied
                      ? `Seat ${slotIndex + 1}`
                      : seat!.name?.trim()
                      ? seat!.name
                      : `Seat ${seat!.seatIndex + 1}`

                    const stackAmount = isOccupied ? (seatBetting?.stack ?? seat!.chips ?? 0) : 0

                    const showCards = isOccupied && isInHand && handInProgress
                    const showRealHeroCards = Boolean(isHero && heroHand && heroHand.length === 2 && handInProgress)

                    return (
                      <div
                        key={`slot-${slotIndex}`}
                        className={['absolute flex flex-col items-center gap-1', isHero ? 'z-[95]' : 'z-[70]'].join(' ')}
                        style={stylePos}
                      >
                        {/* tags */}
                        <div className="mb-0.5 flex gap-1">
                          {isOccupied && isButton && (
                            <div className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-black shadow">
                              D
                            </div>
                          )}
                          {isOccupied && isSB && (
                            <div className="rounded-full bg-sky-300 px-1.5 py-0.5 text-[9px] font-bold text-black shadow">
                              SB
                            </div>
                          )}
                          {isOccupied && isBB && (
                            <div className="rounded-full bg-emerald-300 px-1.5 py-0.5 text-[9px] font-bold text-black shadow">
                              BB
                            </div>
                          )}
                        </div>

                        {/* bet pill */}
                        {isOccupied && committed > 0 && (
                          <div className="pointer-events-none rounded-full bg-black/70 border border-white/15 px-2 py-[2px] text-[10px] font-bold text-white/85">
                            BET <span className="font-mono text-sky-200">{formatChips(committed)}</span>
                          </div>
                        )}

                        {/* cards above avatar */}
                        <div className="relative">
                          {showCards && (
                            <div className="pointer-events-none absolute left-1/2 top-[6px] z-20 -translate-x-1/2">
                              {showRealHeroCards && heroHand ? (
                                <div className="relative flex -space-x-5 md:-space-x-6">
                                  {heroHand.slice(0, 2).map((c, i) => (
                                    <div
                                      key={`${betting?.handId ?? 0}-hero-seat-${seat!.seatIndex}-card-${i}-${c}`}
                                      style={{
                                        transform: `translateY(0px) rotate(${i === 0 ? -10 : 10}deg)`,
                                        transformOrigin: '50% 80%',
                                      }}
                                    >
                                      <PokerCard card={c} />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                // show backs for non-hero (and optionally hero)
                                <div className="relative flex -space-x-5 md:-space-x-6">
                                  {[0, 1].map((i) => (
                                    <div
                                      key={i}
                                      style={{
                                        transform: `translateY(0px) rotate(${i === 0 ? -10 : 10}deg)`,
                                        transformOrigin: '50% 80%',
                                      }}
                                    >
                                      <PokerCard card={'As'} isBack={true} highlight={false} size="normal" tilt={0} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* avatar circle */}
                          <div
                            className={[
                              `relative flex ${avatarSizeCls} items-center justify-center rounded-full overflow-hidden border`,
                              isOccupied ? 'bg-slate-900' : 'bg-black/35',
                              isHero
                                ? 'border-sky-300/65 shadow-[0_0_18px_rgba(56,189,248,0.55)]'
                                : isActing
                                ? 'border-amber-300/55 shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                                : 'border-white/20 shadow-[0_0_10px_rgba(0,0,0,0.9)]',
                              !isInHand && isOccupied && handInProgress ? 'opacity-70' : '',
                            ].join(' ')}
                          >
                            {isOccupied ? (
                              isHero && (profile as any)?.avatarUrl ? (
                                <Image src={(profile as any).avatarUrl} alt="Avatar" fill className="object-cover" />
                              ) : (
                                <Image src={fallbackAvatar} alt="Avatar" fill className="object-cover" />
                              )
                            ) : (
                              <div className="text-[10px] font-bold tracking-widest text-white/60">OPEN</div>
                            )}

                            {isActing && <div className="pointer-events-none absolute inset-[-6px] rounded-full border border-amber-300/35" />}
                          </div>

                          {/* stack + name pill */}
                          {isOccupied && (
                            <div className="mt-1 flex justify-center">
                              <div
                                className={[
                                  'pointer-events-none flex flex-col items-center',
                                  'rounded-xl',
                                  'bg-gradient-to-r from-black/70 via-[#0b1220]/78 to-black/70',
                                  'border border-white/12',
                                  'shadow-[0_0_10px_rgba(0,0,0,0.9)]',
                                  'px-2 py-[2px]',
                                  'w-[96px] md:min-w-[108px] md:max-w-[150px]',
                                ].join(' ')}
                              >
                                <div className="rounded-full bg-black/60 px-2 py-[1px] text-[11px] md:text-[13px] text-sky-200 font-mono leading-tight">
                                  {formatChips(stackAmount)}
                                </div>
                                <div className={['mt-[1px] truncate text-white/85 leading-tight', labelWidthCls].join(' ')}>
                                  {label}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

          {/* ✅ HERO ACTION OVERLAY (DROPPED BELOW FELT) */}
{isHeroSeated && (
  <div className="absolute inset-0 z-[9999] pointer-events-none">
    <div
      className={[
        // mobile: fixed to bottom of screen (below table area)
        'pointer-events-auto fixed left-1/2 bottom-3 -translate-x-1/2 w-[92vw] max-w-[420px]',
        // desktop: anchored to table container, pushed DOWN below the oval
        'md:absolute md:left-1/2 md:bottom-0 md:-translate-x-1/2 md:translate-y-[115%] md:w-[460px]',
      ].join(' ')}
    >
      <div className="rounded-3xl border border-white/15 bg-black/85 backdrop-blur-md p-3 shadow-[0_18px_70px_rgba(0,0,0,0.85)]">
        {/* timer bar + helper */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] text-white/60">
            <div className="flex items-center gap-2 min-w-0">
              <span className="uppercase tracking-[0.22em] shrink-0">Actions</span>

              {/* Hand helper (desktop only, postflop only) */}
              {/* Hand helper (desktop only, postflop only) */}
{!isMobile &&
  heroHandHelper &&
  betting &&
  betting.street !== 'preflop' &&
  (board?.length ?? 0) >= 3 && (
    <span
      className={[
        'min-w-0 truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        'border-white/12 bg-black/60',
        heroHandHelper.category >= 6
          ? 'text-emerald-300'
          : heroHandHelper.category >= 4
          ? 'text-sky-300'
          : heroHandHelper.category >= 2
          ? 'text-amber-200'
          : 'text-white/70',
      ].join(' ')}
      title={heroHandHelper.label}
    >
      {heroHandHelper.label}
    </span>
  )}

            </div>

            <span className="font-mono text-white/70 shrink-0">
              {isMyTurn ? `${actionLeft}s` : '—'}
            </span>
          </div>

          <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-amber-400/90 transition-[width]"
              style={{ width: `${isMyTurn ? actionPct : 0}%` }}
            />
          </div>
        </div>

        {/* ✅ WSOP-style compact sizing (NO duplicated panels, NO nested IIFEs) */}
        {(() => {
          const callNeeded = Math.max(0, Math.floor(callAmount || 0))
          const maxAdd = Math.max(0, Math.floor(heroStack - callNeeded))
          const minAdd = Math.max(1, Math.floor(minRaise || 1))

          const raiseAdd = Math.min(maxAdd, Math.max(minAdd, Math.floor(raiseAmt || minAdd)))
          const raiseTo = Math.min(heroStack, callNeeded + raiseAdd)

          const canBet = ready && isMyTurn && heroInHand && heroStack > 0
          const canSize = canBet && maxAdd > 0

          return (
            <div className="flex gap-3">
              {/* LEFT: sizing lane */}
              <div className="shrink-0 w-[150px]">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex items-center justify-between text-[10px] text-white/60">
                    <span className="uppercase tracking-[0.22em]">Raise-add</span>
                    <span className="font-mono text-amber-200">{formatChips(raiseAdd)}</span>
                  </div>

                  {/* thin slider with ticks */}
                  <div className="mt-2 relative">
                    <div
                      className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[10px] opacity-70"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(to right, rgba(255,255,255,0.18), rgba(255,255,255,0.18) 1px, transparent 1px, transparent 16px)',
                      }}
                    />

                    <input
                      type="range"
                      min={minAdd}
                      max={Math.max(minAdd, maxAdd)}
                      step={Math.max(1, Math.floor(minAdd / 2))}
                      value={raiseAdd}
                      onChange={(e) =>
                        setRaiseAmt(clampInt(e.target.value, minAdd, Math.max(minAdd, maxAdd)))
                      }
                      disabled={!canSize}
                      className="w-full h-1.5 accent-amber-400"
                    />
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[9px] text-white/45">
                    <span className="font-mono">min {formatChips(minAdd)}</span>
                    <span className="font-mono">max {formatChips(maxAdd)}</span>
                  </div>

                  {/* quick sizing */}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRaiseAmt(Math.max(minAdd, Math.floor(maxAdd * 0.5)))}
                      disabled={!canSize}
                      className="rounded-xl border border-white/12 bg-white/10 px-2 py-2 text-[11px] font-extrabold text-white/85 hover:bg-white/15 disabled:opacity-35"
                    >
                      1/2
                    </button>
                    <button
                      type="button"
                      onClick={() => setRaiseAmt(Math.max(minAdd, Math.floor(maxAdd * (2 / 3))))}
                      disabled={!canSize}
                      className="rounded-xl border border-white/12 bg-white/10 px-2 py-2 text-[11px] font-extrabold text-white/85 hover:bg-white/15 disabled:opacity-35"
                    >
                      2/3
                    </button>
                    <button
                      type="button"
                      onClick={() => setRaiseAmt(Math.max(minAdd, Math.floor(maxAdd * 0.75)))}
                      disabled={!canSize}
                      className="rounded-xl border border-white/12 bg-white/10 px-2 py-2 text-[11px] font-extrabold text-white/85 hover:bg-white/15 disabled:opacity-35"
                    >
                      3/4
                    </button>
                    <button
                      type="button"
                      onClick={() => setRaiseAmt(Math.max(minAdd, maxAdd))}
                      disabled={!canSize}
                      className="rounded-xl border border-white/12 bg-white/10 px-2 py-2 text-[11px] font-extrabold text-white/85 hover:bg-white/15 disabled:opacity-35"
                    >
                      All
                    </button>
                  </div>

                  <div className="mt-2 text-[10px] text-white/45">
                    Raise-add sets sizing. Bet sends{' '}
                    <span className="text-white/70">{canCheck ? 'bet' : 'call + raise'}</span>.
                  </div>
                </div>
              </div>

              {/* RIGHT: action buttons */}
              <div className="flex-1">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => doAction('fold')}
                    disabled={!canBet}
                    className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-[13px] font-extrabold text-white hover:bg-white/15 disabled:opacity-35"
                  >
                    Fold
                  </button>

                  <button
                    type="button"
                    onClick={() => doAction(canCheck ? 'check' : 'call', canCheck ? undefined : callAmount)}
                    disabled={!canBet || (!canCheck && !canCall)}
                    className="rounded-2xl border border-sky-300/25 bg-sky-500/20 px-3 py-3 text-[13px] font-extrabold text-sky-100 hover:bg-sky-500/25 disabled:opacity-35"
                  >
                    {canCheck ? 'Check' : `Call ${formatChips(callAmount)}`}
                  </button>

                  <button
                    type="button"
                    onClick={() => doAction('bet', raiseTo)}
                    disabled={!canSize}
                    className="rounded-2xl border border-emerald-300/25 bg-emerald-500/25 px-3 py-3 text-[13px] font-extrabold text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-35"
                  >
                    Bet
                  </button>
                </div>

                {/* readout */}
                <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/55">
                    {canCheck ? 'Bet to' : 'Raise to'}
                  </div>
                  <div className="font-mono text-[12px] text-amber-200">{formatChips(raiseTo)}</div>
                </div>

                <div className="mt-2 text-[10px] text-white/45">
                  Slider sets <span className="text-white/70">raise-add</span>. Bet sends{' '}
                  <span className="text-white/70">{canCheck ? 'bet' : 'call + raise'}</span>.
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  </div>
)}




          </div>

          <div className="mt-4 text-center text-[11px] text-white/45">
            Tournament chips only • Auto-seat & auto-deal • Private hole cards
          </div>
        </div>
      </section>

      {showComplete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#05060a] p-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.75)]">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">Tournament</div>
            <div className="mt-2 text-xl font-extrabold text-white">Table Complete</div>
            <div className="mt-2 text-sm text-white/70">Returning to the tournament lobby…</div>
          </div>
        </div>
      )}
    </main>
  )
}
