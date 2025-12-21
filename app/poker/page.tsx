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
  // show shorter IDs nicely
  if (id.length <= 18) return id
  return `${id.slice(0, 10)}…${id.slice(-6)}`
}

function makeRoomId() {
  // short, readable, “casino-ish”
  const a = Math.random().toString(36).slice(2, 6).toUpperCase()
  const b = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `gold-holdem-${a}${b}`.toLowerCase()
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

  useEffect(() => {
    const url = resolveWsUrl()
    const ws = new WebSocket(url)
    wsRef.current = ws

    const requestList = () => {
      if (ws.readyState !== WebSocket.OPEN) return
      ws.send(
        JSON.stringify({
          kind: 'poker',
          type: 'list-rooms',
        })
      )
    }

    ws.onopen = () => {
      setConnected(true)
      requestList()
      // poll every 2.5s (feels “live” but not spammy)
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

    // open seats means seated < 9
    const withFilter = openSeatsOnly ? list.filter((r) => r.seatedCount < 9) : list

    // already sorted server-side, but keep stable here too
    withFilter.sort(
      (a, b) => (b.seatedCount - a.seatedCount) || (b.onlineCount - a.onlineCount)
    )

    return withFilter
  }, [rooms, openSeatsOnly])

  const totalTables = rooms.length
  const totalSeated = rooms.reduce((acc, r) => acc + r.seatedCount, 0)

  const createTable = () => {
    const id = makeRoomId()
    router.push(`/poker/${id}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      {/* HERO (WPT-ish) */}
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
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-white/30'}`} />
              Poker Lobby
            </div>

            <Link
              href="/"
              className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10"
            >
              ← Home
            </Link>
          </div>

          {/* hero copy + promo image */}
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                <span className="text-[#FFD700]">Texas Gold</span> is live.
              </h1>
              <div className="text-[12px] sm:text-sm text-white/75">
                {GAME_NAME} • <span className="text-[#FFD700] font-semibold">{BLINDS}</span>
              </div>
              <div className="text-[11px] sm:text-xs text-white/60 max-w-xl">
                Pick a table, take a seat, and let the room fill. Tables are sorted by action — most seated first.
              </div>

              {/* quick stats */}
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

              {/* create */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={createTable}
                  className="rounded-full bg-[#FFD700] px-6 py-2.5 text-sm font-extrabold text-black shadow-[0_20px_55px_rgba(250,204,21,0.9)] hover:bg-yellow-400 transition"
                >
                  Create Table →
                </button>
                
              </div>
            </div>

            {/* promo card image (use your poker hero asset) */}
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
                <span className="font-semibold text-white/85">Fast seats.</span> Clean action timers. Real poker pacing.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FILTER BAR (WPT-ish) */}
      <section className="mx-auto max-w-6xl px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-white/15 bg-black/60 px-3 py-2 text-[11px] text-white/65 flex items-center gap-2">
            <span className="opacity-70">Filter</span>
          </div>

          <button
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
            return (
              <Link
                key={r.roomId}
                href={`/poker/${r.roomId}`}
                className="block rounded-2xl border border-white/10 bg-[#0b1220]/70 hover:bg-[#0b1220]/90 hover:border-white/15 transition shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
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
                      <div className={`text-[10px] uppercase tracking-[0.18em] ${
                        open ? 'text-emerald-200/80' : 'text-white/35'
                      }`}>
                        {open ? 'Open' : 'Full'}
                      </div>
                    </div>

                    <div className="text-white/35 text-xl">›</div>
                  </div>
                </div>
              </Link>
            )
          })}

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-white/15 bg-black/60 p-4 text-[12px] text-white/65">
              No tables yet. Hit <span className="text-[#FFD700] font-semibold">Create Table</span> to start the action.
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
