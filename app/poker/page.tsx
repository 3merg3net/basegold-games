// app/poker/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type RoomsListMsg = {
  kind: 'poker'
  type: 'rooms-list'
  rooms: Array<{
    roomId: string
    onlineCount: number
    seatedCount: number
  }>
  blinds?: string
  game?: string
}

function resolveWsUrl(): string {
  const raw = process.env.NEXT_PUBLIC_POKER_WS
  if (!raw || raw.trim() === '') return 'ws://localhost:8080'
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
  // client-safe admin key (ONLY for dev / internal admin usage)
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

  // wait for result (best-effort)
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


export default function PokerHubPage() {
  const router = useRouter()

  const [connected, setConnected] = useState(false)
  const [rooms, setRooms] = useState<RoomsListMsg['rooms']>([])
  const [openSeatsOnly, setOpenSeatsOnly] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const pollRef = useRef<number | null>(null)

  const GAME_NAME = `No Limit Texas Gold Hold'em`
  const BLINDS = `50/100`

  const [newTableName, setNewTableName] = useState('Gold Table')
  const [isPrivate, setIsPrivate] = useState(false)

    const [busyRoomId, setBusyRoomId] = useState<string | null>(null)

  const refreshRooms = () => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ kind: 'poker', type: 'list-rooms' }))
  }

  const deleteRoomLocalOnly = (roomId: string) => {
    deleteRoomMeta(roomId)
    // If you want it to disappear instantly in UI:
    setRooms((prev) => prev.filter((r) => r.roomId !== roomId))
  }

  const deleteRoomAdmin = async (roomId: string) => {
    try {
      setBusyRoomId(roomId)
      await adminDeletePokerRoom(roomId)
      deleteRoomMeta(roomId)
      // remove from UI immediately
      setRooms((prev) => prev.filter((r) => r.roomId !== roomId))
      // then re-poll to be safe
      setTimeout(refreshRooms, 400)
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

    const requestList = () => {
      if (ws.readyState !== WebSocket.OPEN) return
      ws.send(JSON.stringify({ kind: 'poker', type: 'list-rooms' }))
    }

    ws.onopen = () => {
      setConnected(true)
      requestList()
      pollRef.current = window.setInterval(requestList, 2500) as unknown as number
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as RoomsListMsg
        if (msg?.type === 'rooms-list' && Array.isArray(msg.rooms)) {
          setRooms(msg.rooms)
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

  const filtered = useMemo(() => {
    const list = [...rooms]
    const withFilter = openSeatsOnly ? list.filter((r) => r.seatedCount < 9) : list
    withFilter.sort((a, b) => (b.seatedCount - a.seatedCount) || (b.onlineCount - a.onlineCount))
    return withFilter
  }, [rooms, openSeatsOnly])

  const totalTables = rooms.length
  const totalSeated = rooms.reduce((acc, r) => acc + r.seatedCount, 0)

  const createNamedTable = () => {
    const id = makeRoomId()
    const name = (newTableName || '').trim().slice(0, 24) || 'Gold Table'

    // local cache so THIS browser can show names in lobby immediately
    saveRoomMeta(id, name, isPrivate)

    const qs = new URLSearchParams()
    qs.set('name', name)
    if (isPrivate) qs.set('private', '1')

    router.push(`/poker/${id}?${qs.toString()}`)
  }

  

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/live-poker-hero3.png"
            alt="Poker lobby"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.72),rgba(0,0,0,0.92))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.20),transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.14),transparent_60%)]" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pt-6 pb-5 space-y-4">
          {/* top strip */}
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/60 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#FFD700]/90">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connected ? 'bg-emerald-400' : 'bg-white/30'
                }`}
              />
              Poker Lobby
            </div>

            <Link
              href="/"
              className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10"
            >
              ← Home
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                <span className="text-[#FFD700]">Texas Gold</span> is live.
              </h1>

              <div className="text-[12px] sm:text-sm text-white/75">
                {GAME_NAME} • <span className="text-[#FFD700] font-semibold">{BLINDS}</span>
              </div>

              <div className="text-[11px] sm:text-xs text-white/60 max-w-xl">
                Pick a table, take a seat, and let the room fill. Tables are sorted by action —
                most seated first.
              </div>

              <div className="flex flex-wrap gap-2 pt-2 text-[11px]">
                <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-white/70">
                  {totalTables} tables
                </span>
                <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-white/70">
                  {totalSeated} seated
                </span>
                <span className="rounded-full border border-[#FFD700]/35 bg-black/60 px-3 py-1 text-[#FFD700]/90">
                  9-max • No Limit
                </span>
              </div>

              {/* CREATE TABLE PANEL */}
              <div className="pt-3">
                <div className="rounded-3xl border border-white/15 bg-black/60 overflow-hidden shadow-[0_18px_60px_rgba(0,0,0,0.85)]">
                  <div className="grid md:grid-cols-[0.9fr_1.1fr]">
                    <div className="relative min-h-[140px] md:min-h-[180px]">
                      <Image
                        src="/images/poker-felt-panel1.png"
                        alt="Table felt"
                        fill
                        sizes="(max-width:768px) 100vw, 420px"
                        className="object-cover opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" />
                      <div className="absolute left-4 top-4">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-white/60">
                          Create Table
                        </div>
                        <div className="mt-1 text-lg font-extrabold text-[#FFD700]">
                          Texas Gold Hold’em
                        </div>
                        <div className="mt-1 text-[11px] text-white/70">
                          Name it • share it • fill it
                        </div>
                      </div>
                    </div>

                    <div className="p-4 md:p-5 space-y-3">
                      <div className="grid gap-2">
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

                      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-3 py-2">
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

                      <button
                        type="button"
                        onClick={createNamedTable}
                        className="w-full rounded-full bg-[#FFD700] px-6 py-3 text-sm font-extrabold text-black shadow-[0_20px_55px_rgba(250,204,21,0.9)] hover:bg-yellow-400 transition"
                      >
                        Create Table →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* promo card */}
            <div className="relative w-full overflow-hidden rounded-3xl border border-white/15 bg-black/70 shadow-[0_18px_60px_rgba(0,0,0,0.95)]">
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src="/images/live-poker-hero3.png"
                  alt="No Limit Texas Gold Hold'em"
                  fill
                  sizes="(max-width:768px) 100vw, 420px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/85" />
                <div className="absolute left-4 top-4 rounded-full border border-[#FFD700]/50 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#FFD700]/90">
                  NL • {BLINDS}
                </div>
              </div>
              <div className="px-4 py-3 text-[11px] text-white/70">
                <span className="font-semibold text-white/85">Fast seats.</span> Clean action timers.
                Real poker pacing.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FILTER BAR */}
      <section className="mx-auto max-w-6xl px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-white/15 bg-black/60 px-3 py-2 text-[11px] text-white/65 flex items-center gap-2">
            <span className="opacity-70">Filter</span>
          </div>

          <button
            type="button"
            onClick={() => setOpenSeatsOnly(false)}
            className={`rounded-full px-4 py-2 text-[11px] font-semibold border transition ${
              !openSeatsOnly
                ? 'border-[#FFD700]/60 bg-[#FFD700]/15 text-[#FFD700]'
                : 'border-white/15 bg-black/50 text-white/70 hover:bg-white/5'
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setOpenSeatsOnly(true)}
            className={`rounded-full px-4 py-2 text-[11px] font-semibold border transition ${
              openSeatsOnly
                ? 'border-emerald-300/60 bg-emerald-400/10 text-emerald-200'
                : 'border-white/15 bg-black/50 text-white/70 hover:bg-white/5'
            }`}
          >
            Open Seats
          </button>
        </div>
      </section>

      {/* TABLE LIST */}
      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="mt-3 space-y-2">
          {filtered.map((r) => {
            const seats = `${r.seatedCount}/9`
            const open = r.seatedCount < 9

            const meta = typeof window !== 'undefined' ? getRoomMeta(r.roomId) : null
            const displayName = (meta?.name && String(meta.name).trim()) ? String(meta.name).trim() : GAME_NAME

            

            const href = (() => {
              if (meta?.name && String(meta.name).trim()) {
                const qs = new URLSearchParams()
                qs.set('name', String(meta.name).trim())
                if (meta?.isPrivate) qs.set('private', '1')
                return `/poker/${r.roomId}?${qs.toString()}`
              }
              return `/poker/${r.roomId}`
            })()

            

                        return (
              <div
                key={r.roomId}
                className="rounded-2xl border border-white/10 bg-[#0b1220]/70 hover:bg-[#0b1220]/90 hover:border-white/15 transition shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
              >
                {/* main clickable row */}
                <Link
                  href={href}
                  className="block px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white/90 truncate">
                        {displayName}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-white/55">
                        <span className="rounded-full border border-white/10 bg-black/50 px-2 py-0.5 font-mono">
                          {safeRoomLabel(r.roomId)}
                        </span>
                        <span className="rounded-full border border-[#FFD700]/25 bg-black/50 px-2 py-0.5 text-[#FFD700]/85 font-mono">
                          {BLINDS}
                        </span>
                        <span className="text-white/45">•</span>
                        <span className="text-white/60">{r.onlineCount} online</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-[12px] font-bold text-white/85 tabular-nums">
                          {seats}
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

                {/* manage strip */}
                <div className="px-4 pb-3 -mt-1 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-white/40">
                    {meta?.createdByMe ? 'Created by you' : 'Public table'}
                    {meta?.isPrivate ? ' • Private' : ''}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* local delete (only for creator on this device) */}
                    {meta?.createdByMe && (
                      <button
                        type="button"
                        onClick={() => deleteRoomLocalOnly(r.roomId)}
                        className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] font-bold text-white/70 hover:bg-white/10"
                      >
                        Remove (Me)
                      </button>
                    )}

                    {/* admin delete (only if key exists) */}
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

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-white/15 bg-black/60 p-4 text-[12px] text-white/65">
              No tables yet. Hit <span className="text-[#FFD700] font-semibold">Create Table</span>{' '}
              to start the action.
            </div>
          )}
        </div>

        <div className="mt-5 text-center text-[11px] text-white/45">
          Tables auto-appear here as soon as someone opens a new room link.
        </div>
      </section>
    </main>
  )
}
