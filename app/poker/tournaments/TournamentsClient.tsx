// app/poker/tournaments/TournamentsClient.tsx  (TOURNAMENT LOBBY ONLY)
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import TournamentCreateModal from '@/components/poker/tournaments/TournamentCreateModal'

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
    status: 'waiting' | 'ready' | 'running' | 'finished' | 'cancelled' | 'complete'
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

function formatNum(n: number) {
  const v = Math.max(0, Math.floor(Number(n || 0)))
  return v.toLocaleString()
}

function tournamentIdFromTableRoomId(roomId: string) {
  const id = String(roomId || '')
  const m = id.match(/^(tourn-[a-z0-9]+)-t\d+$/)
  return m?.[1] ?? null
}

function getLocal(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function ensurePlayerId() {
  if (typeof window === 'undefined') return 'player-pending'
  try {
    let id = localStorage.getItem('pgld-poker-player-id')
    if (!id) {
      const rand =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? ((crypto as any).randomUUID?.() || '').slice(0, 8)
          : Math.random().toString(36).slice(2, 10)
      id = `player-${rand}`
      localStorage.setItem('pgld-poker-player-id', id)
    }
    return id
  } catch {
    return `player-${Math.random().toString(36).slice(2, 10)}`
  }
}

export default function TournamentsClient() {
  const [connected, setConnected] = useState(false)
  const [tournaments, setTournaments] = useState<TournamentListResultMsg['tournaments']>([])
  const [tournamentTables, setTournamentTables] = useState<RoomRow[]>([])
  const [openCreateTournament, setOpenCreateTournament] = useState(false)

  const [playerId, setPlayerId] = useState('player-pending')
  const [playerName, setPlayerName] = useState('Player')

  useEffect(() => {
    setPlayerId(ensurePlayerId())
    setPlayerName(getLocal('pgld-poker-player-name', 'Player'))
  }, [])

  const wsRef = useRef<WebSocket | null>(null)
  const pollRef = useRef<number | null>(null)

  const send = (payload: any) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    console.log('[tournaments] SEND', payload)
    ws.send(JSON.stringify(payload))
    return true
  }

  const refresh = () => {
    send({ kind: 'poker', type: 'tournament-list' })
    send({ kind: 'poker', type: 'list-rooms' }) // to pick up tournamentTables
  }

  useEffect(() => {
    const url = resolveWsUrl()
    const ws = new WebSocket(url)
    wsRef.current = ws

    const request = () => {
      if (ws.readyState !== WebSocket.OPEN) return
      ws.send(JSON.stringify({ kind: 'poker', type: 'tournament-list' }))
      ws.send(JSON.stringify({ kind: 'poker', type: 'list-rooms' }))
    }

    ws.onopen = () => {
      setConnected(true)
      request()
      pollRef.current = window.setInterval(request, 2500) as unknown as number
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        // console.log('[tournaments] RECV', msg)

        if (msg?.type === 'tournament-list-result' && Array.isArray(msg.tournaments)) {
          setTournaments(msg.tournaments)
          return
        }

        if (msg?.type === 'rooms-list') {
          const m = msg as RoomsListMsg
          if (Array.isArray(m.tournamentTables)) setTournamentTables(m.tournamentTables)
          else setTournamentTables([])
          return
        }

        // ✅ show create result + refresh
        if (msg?.type === 'tournament-created') {
          console.log('[tournaments] tournament-created', msg)
          // even if ok:false, you'll see why now
          window.setTimeout(refresh, 150)
          return
        }
      } catch (e) {
        console.warn('[tournaments] bad msg', e)
      }
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

  const upcoming = useMemo(() => {
    const list = [...tournaments].filter((t) => t.status !== 'finished' && t.status !== 'complete')
    list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    return list
  }, [tournaments])

  const tables = useMemo(() => {
    const list = [...tournamentTables]
    list.sort((a, b) => (b.seatedCount - a.seatedCount) || (b.onlineCount - a.onlineCount))
    return list
  }, [tournamentTables])

  const topTourneys = useMemo(() => upcoming.slice(0, 10), [upcoming])
  const topTables = useMemo(() => tables.slice(0, 12), [tables])

  const TOURNAMENT_HERO = '/images/poker-tournament-hero.png'

  const HybridHero = ({ src, alt }: { src: string; alt: string }) => {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-emerald-300/18 bg-black/55 shadow-[0_18px_60px_rgba(0,0,0,0.85)]">
        <div className="absolute inset-0">
          <Image src={src} alt="" fill sizes="100vw" className="object-cover opacity-45" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/20 to-black/70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),transparent_60%)]" />
        </div>

        <div className="relative h-[210px] sm:h-[250px] md:h-[280px]">
          <Image src={src} alt={alt} fill sizes="100vw" className="object-contain scale-[1.18] opacity-95" priority />
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 -z-10">
          <Image src={TOURNAMENT_HERO} alt="Poker tournaments" fill priority sizes="100vw" className="object-cover opacity-55" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.72),rgba(0,0,0,0.90))]" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pt-6 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-200">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-white/30'}`} />
              Poker • Tournament Lobby
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refresh}
                className="rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[11px] font-semibold text-white/75 hover:bg-white/5"
              >
                Refresh
              </button>
              <Link
                href="/poker"
                className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10"
              >
                ← Cash Lobby
              </Link>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-white/45">
            You: <span className="font-mono text-white/70">{playerName}</span> • <span className="font-mono text-white/60">{playerId}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOpenCreateTournament(true)}
              className="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-4 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15"
            >
              Create Tournament +
            </button>

            <div className="text-[11px] text-white/45 ml-1">
              Register → wait → host starts → auto-seat.
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-5 pb-10 space-y-6">
        <HybridHero src={TOURNAMENT_HERO} alt="Tournament Lobby" />

        {/* UPCOMING */}
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">Tournaments</div>
              <div className="mt-1 text-lg font-extrabold text-emerald-200">Upcoming</div>
            </div>
          </div>

          {topTourneys.map((t) => {
            const href = `/poker/tournaments/${t.tournamentId}?name=${encodeURIComponent(t.tournamentName)}`
            const needs = Math.max(0, (t.minPlayers ?? 2) - (t.registeredCount ?? 0))

            const statusLabel =
              t.status === 'running' ? 'RUNNING' : t.status === 'ready' ? 'READY' : 'REG OPEN'

            const statusChip =
              t.status === 'running' || t.status === 'ready'
                ? 'border-emerald-300/25 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-300/25 bg-amber-500/10 text-amber-200'

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
                      {t.status === 'waiting' || t.status === 'ready'
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
              No tournaments posted yet. Create the first one.
            </div>
          )}
        </div>

        {/* ACTIVE TABLES */}
        <div className="space-y-2">
          <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-[12px] text-white/75">
            Active tournament tables (running)…
          </div>

          {topTables.map((r) => {
            const tid = tournamentIdFromTableRoomId(r.roomId)
            const href = tid
              ? `/poker/${r.roomId}?mode=tournament&tournamentId=${encodeURIComponent(tid)}&name=${encodeURIComponent('Tournament')}`
              : `/poker/${r.roomId}?mode=tournament`

            return (
              <Link
                key={r.roomId}
                href={href}
                className="block rounded-2xl border border-white/10 bg-black/55 hover:bg-black/70 hover:border-white/15 transition px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12px] font-extrabold text-white/85 truncate">Tournament Table</div>
                    <div className="mt-1 text-[11px] text-white/55 font-mono truncate">{safeRoomLabel(r.roomId)}</div>
                    <div className="mt-1 text-[11px] text-white/55">
                      {r.seatedCount}/9 seated • {formatNum(r.onlineCount)} online
                    </div>
                    {tid && <div className="mt-1 text-[11px] text-white/45">From {tid}</div>}
                  </div>

                  <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-extrabold text-emerald-200">
                    Join →
                  </span>
                </div>
              </Link>
            )
          })}

          {topTables.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/50 p-4 text-[12px] text-white/60">
              No tournament tables running right now.
            </div>
          )}
        </div>
      </section>

      <TournamentCreateModal
        open={openCreateTournament}
        onClose={() => setOpenCreateTournament(false)}
        onCreate={(payload: any) => {
          // ✅ MUST include playerId or server rejects creation
          const ok = send({
            kind: 'poker',
            type: 'tournament-create',
            playerId,
            ...payload,
          })
          if (!ok) alert('Still connecting to coordinator… try again.')

          setOpenCreateTournament(false)
          window.setTimeout(refresh, 250)
        }}
      />
    </main>
  )
}
