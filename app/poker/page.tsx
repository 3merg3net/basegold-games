// app/poker/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import TournamentCreateModal from "@/components/poker/tournaments/TournamentCreateModal";


type RoomRow = {
  roomId: string
  onlineCount: number
  seatedCount: number
  tableName?: string | null
  isPrivate?: boolean
}

type RoomsListMsg = {
  kind: 'poker'
  type: 'rooms-list'
  rooms: RoomRow[] // cash rooms
  tournamentTables?: RoomRow[]
  blinds?: string
  game?: string
}

type TournamentListResultMsg = {
  kind: 'poker'
  type: 'tournament-list-result'
  tournaments: Array<{
    tournamentId: string
    tournamentName: string
    buyIn: number
    startingStack: number
    seatsPerTable: number
    isPrivate: boolean
    status: 'waiting' | 'running' | 'finished'
    minPlayers: number
    registeredCount: number
    hostPlayerId: string
    createdAt: number
  }>
}

function resolveWsUrl(): string {
  const raw = process.env.NEXT_PUBLIC_POKER_WS

  if (!raw || raw.trim() === '') {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname
      const isHttps = window.location.protocol === 'https:'
      return `${isHttps ? 'wss' : 'ws'}://${host}:8080`
    }
    return 'ws://localhost:8080'
  }

  const v = raw.trim()
  if (v.startsWith('ws://') || v.startsWith('wss://')) return v
  if (v.startsWith('https://')) return v.replace(/^https:\/\//, 'wss://')
  if (v.startsWith('http://')) return v.replace(/^http:\/\//, 'ws://')
  return `wss://${v}`
}

function safeRoomLabel(id: string) {
  if (id.length <= 18) return id
  return `${id.slice(0, 10)}…${id.slice(-6)}`
}

function makeRoomId() {
  const a = Math.random().toString(36).slice(2, 6).toUpperCase()
  const b = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `gold-holdem-${a}${b}`.toLowerCase()
}

function saveRoomMeta(roomId: string, name: string, isPrivate: boolean) {
  try {
    const key = 'poker_room_meta_v1'
    const raw = localStorage.getItem(key)
    const meta = raw ? JSON.parse(raw) : {}
    meta[roomId] = { name, isPrivate, ts: Date.now(), createdByMe: true }
    localStorage.setItem(key, JSON.stringify(meta))
  } catch {}
}

type RoomMeta = {
  name?: string
  isPrivate?: boolean
  createdByMe?: boolean
  ts?: number
}

function getRoomMeta(roomId: string): RoomMeta | null {
  try {
    const raw = localStorage.getItem('poker_room_meta_v1')
    if (!raw) return null
    const meta = JSON.parse(raw)
    const v = meta?.[roomId]
    if (!v) return null
    return v
  } catch {
    return null
  }
}

function deleteRoomMeta(roomId: string) {
  try {
    const key = 'poker_room_meta_v1'
    const raw = localStorage.getItem(key)
    if (!raw) return
    const meta = JSON.parse(raw)
    if (meta && meta[roomId]) {
      delete meta[roomId]
      localStorage.setItem(key, JSON.stringify(meta))
    }
  } catch {}
}

function getAdminKey(): string {
  return (process.env.NEXT_PUBLIC_COORDINATOR_ADMIN_KEY ?? '').trim()
}

async function adminDeletePokerRoom(roomId: string) {
  const adminKey = getAdminKey()
  if (!adminKey) throw new Error('Missing NEXT_PUBLIC_COORDINATOR_ADMIN_KEY')

  const url = resolveWsUrl()
  const ws = new WebSocket(url)

  await new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error('Admin WS timeout')), 5000)
    ws.onopen = () => {
      window.clearTimeout(t)
      resolve()
    }
    ws.onerror = () => reject(new Error('Admin WS connect failed'))
  })

  ws.send(
    JSON.stringify({
      type: 'admin-delete-room',
      adminKey,
      kind: 'poker',
      roomId,
    })
  )

  await new Promise<void>((resolve) => {
    const t = window.setTimeout(() => resolve(), 1500)
    ws.onmessage = () => {
      window.clearTimeout(t)
      resolve()
    }
  })

  try {
    ws.close()
  } catch {}
}

function formatNum(n: number) {
  const v = Math.max(0, Math.floor(Number(n || 0)))
  return v.toLocaleString()
}

function tournamentIdFromTableRoomId(roomId: string) {
  const id = String(roomId || '')
  const m = id.match(/^(tourn-[a-z0-9]+)-t\d+$/)
  return m?.[1] ?? null
}

export default function PokerHubPage() {
  const router = useRouter()

  const [connected, setConnected] = useState(false)
  const [rooms, setRooms] = useState<RoomRow[]>([])
  const [tournamentTables, setTournamentTables] = useState<RoomRow[]>([])
  const [tournaments, setTournaments] = useState<TournamentListResultMsg['tournaments']>([])
  const [openSeatsOnly, setOpenSeatsOnly] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const pollRef = useRef<number | null>(null)

  const GAME_NAME = `No Limit Texas Gold Hold'em`
  const BLINDS = `50/100`

  const [newTableName, setNewTableName] = useState('Gold Table')
  const [isPrivate, setIsPrivate] = useState(false)
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null)

  const cashSectionRef = useRef<HTMLDivElement | null>(null)
  const tourneySectionRef = useRef<HTMLDivElement | null>(null)

  const scrollToCash = () =>
    cashSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const scrollToTourney = () =>
    tourneySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const refreshAll = () => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ kind: 'poker', type: 'list-rooms' }))
    ws.send(JSON.stringify({ kind: 'poker', type: 'tournament-list' }))
  }

  const deleteRoomLocalOnly = (roomId: string) => {
    deleteRoomMeta(roomId)
    setRooms((prev) => prev.filter((r) => r.roomId !== roomId))
  }

  const deleteRoomAdmin = async (roomId: string) => {
    try {
      setBusyRoomId(roomId)
      await adminDeletePokerRoom(roomId)
      deleteRoomMeta(roomId)
      setRooms((prev) => prev.filter((r) => r.roomId !== roomId))
      setTimeout(refreshAll, 400)
    } catch (e: any) {
      console.warn(e)
      alert(e?.message || 'Admin delete failed')
    } finally {
      setBusyRoomId(null)
    }
  }

  useEffect(() => {
    const url = resolveWsUrl()
    const ws = new WebSocket(url)
    wsRef.current = ws

    const requestAll = () => {
      if (ws.readyState !== WebSocket.OPEN) return
      ws.send(JSON.stringify({ kind: 'poker', type: 'list-rooms' }))
      ws.send(JSON.stringify({ kind: 'poker', type: 'tournament-list' }))
    }

    ws.onopen = () => {
      setConnected(true)
      requestAll()
      pollRef.current = window.setInterval(requestAll, 2500) as unknown as number
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)

        if (msg?.type === 'rooms-list') {
          const m = msg as RoomsListMsg
          if (Array.isArray(m.rooms)) setRooms(m.rooms)
          if (Array.isArray(m.tournamentTables)) setTournamentTables(m.tournamentTables)
          else setTournamentTables([])
          return
        }

        if (msg?.type === 'tournament-list-result' && Array.isArray(msg.tournaments)) {
          setTournaments(msg.tournaments)
          return
        }
      } catch {}
    }

    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
      try {
        ws.close()
      } catch {}
      wsRef.current = null
    }
  }, [])

  const cashFiltered = useMemo(() => {
    const list = [...rooms]
    const withFilter = openSeatsOnly ? list.filter((r) => r.seatedCount < 9) : list
    withFilter.sort(
      (a, b) => (b.seatedCount - a.seatedCount) || (b.onlineCount - a.onlineCount)
    )
    return withFilter
  }, [rooms, openSeatsOnly])

  const tourneyFiltered = useMemo(() => {
    const list = [...tournaments].filter((t) => t.status !== 'finished')
    list.sort((a, b) => b.createdAt - a.createdAt)
    return list
  }, [tournaments])

  const tournamentTablesFiltered = useMemo(() => {
    const list = [...tournamentTables]
    list.sort(
      (a, b) => (b.seatedCount - a.seatedCount) || (b.onlineCount - a.onlineCount)
    )
    return list
  }, [tournamentTables])

  const topCash = useMemo(() => cashFiltered.slice(0, 10), [cashFiltered])
  const topTourneys = useMemo(() => tourneyFiltered.slice(0, 6), [tourneyFiltered])
  const topTourneyTables = useMemo(
    () => tournamentTablesFiltered.slice(0, 8),
    [tournamentTablesFiltered]
  )
const [openCreateTournament, setOpenCreateTournament] = useState(false);

  const createAndJoinCash = () => {
    const id = makeRoomId()
    const name = (newTableName || '').trim().slice(0, 24) || 'Gold Table'
    saveRoomMeta(id, name, isPrivate)

    // best-effort: if server supports poker-create-room, this makes it list immediately cross-browser
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(
          JSON.stringify({
            kind: 'poker',
            type: 'poker-create-room',
            roomId: id,
            tableName: name,
            private: isPrivate ? '1' : '0',
          })
        )
      } catch {}
    }

    // force refresh so the list updates immediately if server created the room
    window.setTimeout(refreshAll, 200)

    const qs = new URLSearchParams()
    qs.set('name', name)
    if (isPrivate) qs.set('private', '1')
    router.push(`/poker/${id}?${qs.toString()}`)
  }

  const TOURNAMENT_HERO = '/images/poker-tournament-hero.png'
  const CASH_HERO = '/images/live-poker-hero3.png'

  // “middle ground” image style:
  // - background: cover (fills)
  // - foreground: contain but scaled up (so it’s not tiny)
  const HybridHero = ({
    src,
    alt,
    tone = 'gold',
  }: {
    src: string
    alt: string
    tone?: 'gold' | 'green'
  }) => {
    const ring =
      tone === 'gold'
        ? 'border-[#FFD700]/22'
        : 'border-emerald-300/18'

    const glow =
      tone === 'gold'
        ? 'bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.18),transparent_60%)]'
        : 'bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),transparent_60%)]'

    return (
      <div className={`relative overflow-hidden rounded-3xl border ${ring} bg-black/55 shadow-[0_18px_60px_rgba(0,0,0,0.85)]`}>
        <div className="absolute inset-0">
          {/* cover backdrop */}
          <Image
            src={src}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-45"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/20 to-black/70" />
          <div className={`absolute inset-0 ${glow}`} />
        </div>

        {/* “between cover and contain”: contain but scaled up */}
        <div className="relative h-[210px] sm:h-[250px] md:h-[280px]">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="100vw"
            className="object-contain scale-[1.18] opacity-95"
            priority
          />
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      {/* HERO STRIP */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 -z-10">
          <Image
            src={CASH_HERO}
            alt="Poker lobby"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.72),rgba(0,0,0,0.90))]" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pt-6 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/60 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#FFD700]/90">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-white/30'}`} />
              Poker • Cash + Tournaments
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshAll}
                className="rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[11px] font-semibold text-white/75 hover:bg-white/5"
              >
                Refresh
              </button>
              <Link
                href="/"
                className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10"
              >
                ← Home
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={scrollToCash}
              className="rounded-full border border-[#FFD700]/30 bg-black/60 px-4 py-2 text-[11px] font-extrabold text-[#FFD700]/90 hover:bg-white/5"
            >
              Cash Games ↓
            </button>
            <button
              type="button"
              onClick={scrollToTourney}
              className="rounded-full border border-emerald-300/25 bg-black/60 px-4 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-white/5"
            >
              Tournaments ↓
            </button>
            <div className="text-[11px] text-white/45 ml-1">
              Join tables from the lists below (create is secondary).
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-5 pb-10">
        {/* CASH */}
        <div ref={cashSectionRef} className="space-y-3">
          <HybridHero src={CASH_HERO} alt="Cash Games" tone="gold" />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">Cash Games</div>
              <div className="mt-1 text-lg font-extrabold text-[#FFD700]">Join a Table</div>
              <div className="mt-1 text-[11px] text-white/60">{GAME_NAME} • {BLINDS} • 9-max</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenSeatsOnly((v) => !v)}
                className="rounded-full border border-[#FFD700]/25 bg-black/60 px-4 py-2 text-[11px] font-extrabold text-[#FFD700]/90 hover:bg-white/10"
              >
                {openSeatsOnly ? 'Open seats only' : 'Filter open seats'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {topCash.map((r) => {
              const open = r.seatedCount < 9
              const meta = typeof window !== 'undefined' ? getRoomMeta(r.roomId) : null

              const displayName =
                (r.tableName && String(r.tableName).trim())
                  ? String(r.tableName).trim()
                  : (meta?.name && String(meta.name).trim())
                  ? String(meta.name).trim()
                  : 'Cash Table'

              const href = (() => {
                const qs = new URLSearchParams()
                qs.set('name', displayName)
                if (Boolean(r.isPrivate ?? meta?.isPrivate)) qs.set('private', '1')
                const q = qs.toString()
                return q ? `/poker/${r.roomId}?${q}` : `/poker/${r.roomId}`
              })()

              return (
                <div
                  key={r.roomId}
                  className="rounded-2xl border border-white/10 bg-[#0b1220]/70 hover:bg-[#0b1220]/90 hover:border-white/15 transition shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
                >
                  <Link href={href} className="block px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-white/90 truncate">
                          {displayName}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
                          <span className="rounded-full border border-white/10 bg-black/50 px-2 py-0.5 font-mono">
                            {safeRoomLabel(r.roomId)}
                          </span>
                          <span className="rounded-full border border-[#FFD700]/25 bg-black/50 px-2 py-0.5 text-[#FFD700]/85 font-mono">
                            {BLINDS}
                          </span>
                          <span className="rounded-full border border-white/10 bg-black/50 px-2 py-0.5">
                            {GAME_NAME}
                          </span>
                          <span className="text-white/45">•</span>
                          <span className="text-white/60">{r.onlineCount} online</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-[12px] font-bold text-white/85 tabular-nums">
                            {r.seatedCount}/9
                          </div>
                          <div
                            className={`text-[10px] uppercase tracking-[0.18em] ${
                              open ? 'text-emerald-200/80' : 'text-white/35'
                            }`}
                          >
                            {open ? 'Open' : 'Full'}
                          </div>
                        </div>
                        <div className="text-white/35 text-xl">›</div>
                      </div>
                    </div>
                  </Link>

                  <div className="px-4 pb-3 -mt-1 flex items-center justify-between gap-2">
                    <div className="text-[10px] text-white/40">
                      {meta?.createdByMe ? 'Created by you' : 'Public table'}
                      {Boolean(r.isPrivate ?? meta?.isPrivate) ? ' • Private' : ''}
                    </div>

                    <div className="flex items-center gap-2">
                      {meta?.createdByMe && (
                        <button
                          type="button"
                          onClick={() => deleteRoomLocalOnly(r.roomId)}
                          className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] font-bold text-white/70 hover:bg-white/10"
                        >
                          Remove (Me)
                        </button>
                      )}

                      {!!getAdminKey() && (
                        <button
                          type="button"
                          disabled={busyRoomId === r.roomId}
                          onClick={() => deleteRoomAdmin(r.roomId)}
                          className={`rounded-full border px-3 py-1 text-[11px] font-extrabold transition ${
                            busyRoomId === r.roomId
                              ? 'border-white/10 bg-black/40 text-white/35 cursor-not-allowed'
                              : 'border-rose-400/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15'
                          }`}
                        >
                          {busyRoomId === r.roomId ? 'Deleting…' : 'Admin Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {topCash.length === 0 && (
              <div className="rounded-2xl border border-white/15 bg-black/60 p-4 text-[12px] text-white/65">
                No cash tables listed by the coordinator yet.
                <div className="mt-2 text-white/50">
                  If you just created one, it should appear after you join-room. If it still doesn’t,
                  apply the server list split patch so cash rooms aren’t being swallowed by tournament IDs.
                </div>
              </div>
            )}
          </div>

          {/* Create cash */}
          <div className="rounded-3xl border border-[#FFD700]/18 bg-black/60 overflow-hidden shadow-[0_18px_60px_rgba(0,0,0,0.85)]">
            <div className="p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/55">
                    Create Cash Table
                  </div>
                  <div className="mt-1 text-lg font-extrabold text-[#FFD700]">
                    Create + Join
                  </div>
                  <div className="mt-1 text-[11px] text-white/70">
                    Join is the focus — this button drops you straight into the game.
                  </div>
                </div>
                <div className="rounded-full border border-[#FFD700]/30 bg-black/60 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#FFD700]/90">
                  {BLINDS}
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <label className="text-[10px] uppercase tracking-[0.22em] text-white/45">
                  Table name
                </label>
                <input
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="Table name (e.g. High Roller)"
                  className="w-full rounded-2xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white/90 outline-none focus:border-[#FFD700]/60"
                />
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-3 py-2">
                <div>
                  <div className="text-xs font-semibold text-white/85">
                    {isPrivate ? 'Private table' : 'Public table'}
                  </div>
                  <div className="text-[11px] text-white/55">
                    {isPrivate ? 'Invite-only link.' : 'Anyone with link can join.'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPrivate((v) => !v)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold border transition ${
                    isPrivate
                      ? 'border-white/25 bg-white/10 text-white'
                      : 'border-emerald-300/40 bg-emerald-500/10 text-emerald-100'
                  }`}
                >
                  {isPrivate ? 'Private' : 'Public'}
                </button>
              </div>

              <div className="mt-3 flex md:justify-end">
                <button
                  type="button"
                  onClick={createAndJoinCash}
                  className="w-full md:w-auto md:px-10 rounded-full bg-[#FFD700] px-6 py-3 text-sm font-extrabold text-black shadow-[0_20px_55px_rgba(250,204,21,0.9)] hover:bg-yellow-400 transition"
                >
                  Create + Join →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TOURNAMENTS */}
        <div ref={tourneySectionRef} className="mt-8 space-y-3">
          <HybridHero src={TOURNAMENT_HERO} alt="Tournament Lobby" tone="green" />

          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">Tournaments</div>
              <div className="mt-1 text-lg font-extrabold text-emerald-200">Upcoming</div>
            </div>
            <button
  type="button"
  onClick={() => setOpenCreateTournament(true)}
  className="block w-full text-left rounded-3xl border border-emerald-300/20 bg-black/60 overflow-hidden shadow-[0_18px_60px_rgba(0,0,0,0.85)] hover:border-emerald-300/35 transition"
>
              Open Tournament Lobby →
            </button>
          </div>

          <div className="space-y-2">
            {topTourneys.map((t) => {
              const href = `/poker/tournaments/${t.tournamentId}?name=${encodeURIComponent(t.tournamentName)}`
              const needs = Math.max(0, (t.minPlayers ?? 2) - (t.registeredCount ?? 0))

              const statusLabel =
                t.status === 'running' ? 'RUNNING' : t.status === 'waiting' ? 'REG OPEN' : 'FINISHED'

              const statusChip =
                t.status === 'running'
                  ? 'border-amber-300/25 bg-amber-500/10 text-amber-200'
                  : 'border-emerald-300/25 bg-emerald-500/10 text-emerald-200'

              return (
                <Link
                  key={t.tournamentId}
                  href={href}
                  className="block rounded-2xl border border-emerald-300/15 bg-black/55 hover:bg-black/70 hover:border-emerald-300/25 transition shadow-[0_12px_40px_rgba(0,0,0,0.7)] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-white/90 truncate">{t.tournamentName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
                        <span className={`rounded-full border px-2 py-0.5 font-mono ${statusChip}`}>
                          {statusLabel}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/50 px-2 py-0.5 font-mono">
                          Buy-in {formatNum(t.buyIn)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/50 px-2 py-0.5 font-mono">
                          Stack {formatNum(t.startingStack)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/50 px-2 py-0.5 font-mono">
                          {t.registeredCount}/{t.minPlayers} reg
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-white/50">
                        {t.status === 'waiting'
                          ? needs > 0
                            ? `Needs ${needs} more to start`
                            : 'Ready to start'
                          : t.status === 'running'
                          ? 'Tables assigned'
                          : 'Complete'}
                      </div>
                    </div>
                    <div className="text-white/35 text-xl mt-0.5">›</div>
                  </div>
                </Link>
              )
            })}

            {topTourneys.length === 0 && (
              <div className="rounded-2xl border border-emerald-300/15 bg-black/60 p-4 text-[12px] text-white/65">
                No tournaments posted yet. Open the lobby to create the first one.
              </div>
            )}
          </div>

          <div className="pt-1">
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-[12px] text-white/75">
              Active tournament tables (running)…
            </div>

            <div className="mt-2 space-y-2">
              {topTourneyTables.map((r) => {
                const tid = tournamentIdFromTableRoomId(r.roomId)
                return (
                  <div
                    key={r.roomId}
                    className="rounded-2xl border border-white/10 bg-black/55 hover:bg-black/70 hover:border-white/15 transition px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[12px] font-extrabold text-white/85 truncate">Tournament Table</div>
                        <div className="mt-1 text-[11px] text-white/55 font-mono truncate">{safeRoomLabel(r.roomId)}</div>
                        <div className="mt-1 text-[11px] text-white/55">{r.seatedCount}/9 seated • {r.onlineCount} online</div>
                        {tid && <div className="mt-1 text-[11px] text-white/45">From {tid}</div>}
                      </div>

                      <Link
                        href={`/poker/${r.roomId}?mode=tournament`}
                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-extrabold text-white/80 hover:bg-white/10"
                      >
                        Join
                      </Link>
                    </div>
                  </div>
                )
              })}

              {topTourneyTables.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/50 p-4 text-[12px] text-white/60">
                  No tournament tables running right now.
                </div>
              )}
            </div>
          </div>

          <Link
            href="/poker/tournaments"
            className="block rounded-3xl border border-emerald-300/20 bg-black/60 overflow-hidden shadow-[0_18px_60px_rgba(0,0,0,0.85)] hover:border-emerald-300/35 transition"
          >
            <div className="p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/55">Create Tournament</div>
                  <div className="mt-1 text-lg font-extrabold text-emerald-200">Enter the Lobby</div>
                  <div className="mt-1 text-[11px] text-white/70">Create events • register • start</div>
                </div>
                <div className="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-200">
                  BGLD Poker Tournaments 
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-black/45 px-4 py-3 text-[12px] text-white/80">
                <span className="font-extrabold text-emerald-200">Flow:</span> Register → Wait → Start →
                Tables assigned.
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-5 text-center text-[11px] text-white/45">
          Cash games and tournaments are listed separately.
        </div>
      </section>
      <TournamentCreateModal
  open={openCreateTournament}
  onClose={() => setOpenCreateTournament(false)}
  onCreate={(payload: any) => {
    // payload should match what your modal already returns
    // Send through the existing WS connection if you want instant create + refresh
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ kind: "poker", type: "tournament-create", ...payload }));
    }
    setOpenCreateTournament(false);
    window.setTimeout(refreshAll, 250);
    window.setTimeout(scrollToTourney, 350);
  }}
/>

    </main>
  )
}
