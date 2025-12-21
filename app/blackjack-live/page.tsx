// app/blackjack-live/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type RoomsListMsg = {
  kind: 'blackjack'
  type: 'rooms-list'
  rooms: Array<{
    roomId: string
    onlineCount: number
    seatedCount: number
  }>
  game?: string
}

function resolveWsUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BLACKJACK_WS // ✅ blackjack env
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

function makeTierRoomId(min: number, max: number) {
  const suffix = Math.random().toString(36).slice(2, 6).toLowerCase()
  // ✅ encode min/max into the roomId so server can infer if it wants
  return `bj-${min}-${max}-${suffix}`
}

export default function BlackjackLobbyPage() {
  const router = useRouter()

  const [connected, setConnected] = useState(false)
  const [rooms, setRooms] = useState<RoomsListMsg['rooms']>([])
  const [openSeatsOnly, setOpenSeatsOnly] = useState(false)

  // ✅ optional tier selector (if you still want a single Create button)
  const [tier, setTier] = useState<'100-500' | '500-2500'>('100-500')

  // ✅ admin mode (simple)
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const v = window.localStorage.getItem('bj-admin') === '1'
      setIsAdmin(v)
    } catch {}
  }, [])

  const wsRef = useRef<WebSocket | null>(null)
  const pollRef = useRef<number | null>(null)

  const GAME_NAME = `Big Nugget 21`

  // ✅ create tiered table (push to dynamic route)
  const createTableTier = (min: number, max: number) => {
    const id = makeTierRoomId(min, max)
    // You can include query params if you want the UI to *display* them,
    // but the BJ component should rely on server table.minBet/maxBet once connected.
    router.push(`/blackjack-live/${id}?name=${encodeURIComponent(GAME_NAME)}&min=${min}&max=${max}&seats=7`)
  }

  const createTable = () => {
    const [minStr, maxStr] = tier.split('-')
    const min = Number(minStr)
    const max = Number(maxStr)
    createTableTier(min, max)
  }

  // ✅ send delete-room (server must support this)
  const deleteRoom = (roomId: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    // OPTIONAL: include an admin key if your server expects it
    const adminKey =
      (typeof window !== 'undefined' && window.localStorage.getItem('bj-admin-key')) ||
      process.env.NEXT_PUBLIC_BLACKJACK_ADMIN_KEY ||
      undefined

    ws.send(JSON.stringify({ kind: 'blackjack', type: 'delete-room', roomId, adminKey }))
  }

  useEffect(() => {
    const url = resolveWsUrl()
    const ws = new WebSocket(url)
    wsRef.current = ws

    const requestList = () => {
      if (ws.readyState !== WebSocket.OPEN) return
      ws.send(JSON.stringify({ kind: 'blackjack', type: 'list-rooms' }))
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
    const maxSeats = 7
    const withFilter = openSeatsOnly ? list.filter((r) => r.seatedCount < maxSeats) : list
    withFilter.sort((a, b) => (b.seatedCount - a.seatedCount) || (b.onlineCount - a.onlineCount))
    return withFilter
  }, [rooms, openSeatsOnly])

  const totalTables = rooms.length
  const totalSeated = rooms.reduce((acc, r) => acc + r.seatedCount, 0)

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/blackjack-live-hero.png"
            alt="Blackjack lobby"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-65"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.72),rgba(0,0,0,0.92))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),transparent_55%),radial-gradient(circle_at_bottom,_rgba(255,215,0,0.12),transparent_60%)]" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pt-6 pb-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-200/90">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-white/30'}`} />
              Blackjack Lobby
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !isAdmin
                  setIsAdmin(next)
                  try { window.localStorage.setItem('bj-admin', next ? '1' : '0') } catch {}
                }}
                className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10"
              >
                {isAdmin ? 'Admin: ON' : 'Admin: OFF'}
              </button>

              <Link
                href="/"
                className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10"
              >
                ← Home
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                <span className="text-emerald-200">Big Nugget</span> 21 is live.
              </h1>

              <div className="text-[11px] sm:text-xs text-white/60 max-w-xl">
                Create a table, take a seat, and the pit fills. Tables sort by action — most seated first.
              </div>

              <div className="flex flex-wrap gap-2 pt-2 text-[11px]">
                <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-white/70">
                  {totalTables} tables
                </span>
                <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-white/70">
                  {totalSeated} seated
                </span>
                <span className="rounded-full border border-emerald-300/30 bg-black/60 px-3 py-1 text-emerald-200/90">
                  100 GLD = $1
                </span>
              </div>

              {/* ✅ tier buttons (working) */}
              <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-white/55">Table limits:</span>

                <button
                  type="button"
                  onClick={() => createTableTier(100, 500)}
                  className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-white/80 hover:bg-white/10"
                >
                  Create 100 / 500
                </button>

                <button
                  type="button"
                  onClick={() => createTableTier(500, 2500)}
                  className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-white/80 hover:bg-white/10"
                >
                  Create 500 / 2500
                </button>
              </div>

              {/* Optional single Create button w/ selector */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as any)}
                  className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-[11px] text-white/80"
                >
                  <option value="100-500">100 / 500</option>
                  <option value="500-2500">500 / 2500</option>
                </select>

                <button
                  onClick={createTable}
                  className="rounded-full bg-emerald-400 px-6 py-2.5 text-sm font-extrabold text-black shadow-[0_20px_55px_rgba(34,197,94,0.35)] hover:bg-emerald-300 transition"
                >
                  Create Table →
                </button>
              </div>
            </div>

            {/* promo card */}
            <div className="relative w-full overflow-hidden rounded-3xl border border-white/15 bg-black/70 shadow-[0_18px_60px_rgba(0,0,0,0.95)]">
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src="/images/blackjack-live-hero.png"
                  alt="Big Nugget 21"
                  fill
                  sizes="(max-width:768px) 100vw, 420px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/85" />
                <div className="absolute left-4 top-4 rounded-full border border-emerald-300/45 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-200/90">
                  BIG NUGGET 21
                </div>
              </div>
              <div className="px-4 py-3 text-[11px] text-white/70">
                <span className="font-semibold text-white/85">Fast hands.</span> Dealer-paced reveals. Clean totals.
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
            onClick={() => setOpenSeatsOnly(false)}
            className={`rounded-full px-4 py-2 text-[11px] font-semibold border transition ${
              !openSeatsOnly
                ? 'border-emerald-300/60 bg-emerald-400/10 text-emerald-200'
                : 'border-white/15 bg-black/50 text-white/70 hover:bg-white/5'
            }`}
          >
            All
          </button>

          <button
            onClick={() => setOpenSeatsOnly(true)}
            className={`rounded-full px-4 py-2 text-[11px] font-semibold border transition ${
              openSeatsOnly
                ? 'border-[#FFD700]/60 bg-[#FFD700]/10 text-[#FFD700]'
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
            const maxSeats = 7
            const seats = `${r.seatedCount}/${maxSeats}`
            const open = r.seatedCount < maxSeats

            return (
              <div
                key={r.roomId}
                className="rounded-2xl border border-white/10 bg-[#0b1220]/70 hover:bg-[#0b1220]/90 hover:border-white/15 transition shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
              >
                <Link
                  href={`/blackjack-live/${r.roomId}`}
                  className="block"
                >
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white/90 truncate">
                        {GAME_NAME}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-white/55">
                        <span className="rounded-full border border-white/10 bg-black/50 px-2 py-0.5 font-mono">
                          {safeRoomLabel(r.roomId)}
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

                {/* ✅ admin delete */}
                {isAdmin && (
                  <div className="px-4 pb-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const ok = window.confirm(`Delete room ${r.roomId}?`)
                        if (!ok) return
                        deleteRoom(r.roomId)
                      }}
                      className="rounded-full border border-red-400/50 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-500/15"
                    >
                      Delete room
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-white/15 bg-black/60 p-4 text-[12px] text-white/65">
              No tables yet. Hit <span className="text-emerald-200 font-semibold">Create Table</span> to start the action.
            </div>
          )}
        </div>

        <div className="mt-5 text-center text-[11px] text-white/45">
          Tables appear here as soon as someone opens the room link (and joins the WS).
        </div>
      </section>
    </main>
  )
}
