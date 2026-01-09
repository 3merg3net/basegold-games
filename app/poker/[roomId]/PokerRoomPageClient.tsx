// app/poker/[roomId]/PokerRoomPageClient.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { POKER_ROOMS, PokerRoomConfig } from '@/config/pokerRooms'

const PokerRoomArcade = dynamic(
  () => import('@/components/casino/arcade/PokerRoomArcade'),
  { ssr: false }
)

const PokerRoomTournamentTable = dynamic(
  () => import('@/components/casino/PokerRoomTournament'),
  { ssr: false }
)

type ClientProps = {
  params: {
    roomId: string
  }
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

function safeBool(v: string | null) {
  return v === '1' || v === 'true' || v === 'yes'
}

function makeFallbackRoom(roomId: string): PokerRoomConfig {
  return {
    id: roomId,
    label: "No Limit Texas Gold Hold’em",
    status: 'live',
    tier: 'low' as any,
    stakes: '50/100',
    description: 'Public table • share the link • sit and play.',
    private: false,
  } as PokerRoomConfig
}

function safeName(v: string) {
  const s = (v || '').trim()
  if (!s) return ''
  return s.replace(/\s+/g, ' ').slice(0, 32)
}

export default function PokerRoomPageClient({ params }: ClientProps) {
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()

  const roomId = params.roomId

  const roomMeta: PokerRoomConfig = useMemo(() => {
    return POKER_ROOMS[roomId] ?? makeFallbackRoom(roomId)
  }, [roomId])

  // query meta
  const tableName = safeName(searchParams?.get('name') || '')
  const mode = (searchParams?.get('mode') || 'cash').toLowerCase()
  const tournamentId = safeName(searchParams?.get('tournamentId') || '')

  const configured = Boolean(POKER_ROOMS[roomId])

  const displayLabel = useMemo(() => {
    return tableName || roomMeta.label || 'Poker'
  }, [tableName, roomMeta.label])

  const backHref = useMemo(() => {
    return mode === 'tournament' ? '/poker/tournaments' : '/poker'
  }, [mode])

  // mount flag
  useEffect(() => setMounted(true), [])

  // title
  useEffect(() => {
    const base = roomMeta.label || 'Poker'
    document.title = tableName ? `${tableName} • ${base}` : base
  }, [tableName, roomMeta.label])

  // ✅ announce/register cash room on coordinator (so lobby lists it)
  useEffect(() => {
    if (!mounted) return
    if (mode !== 'cash') return

    const url = resolveWsUrl()
    const ws = new WebSocket(url)

    const privateFlag =
      safeBool(searchParams?.get('private')) ||
      safeBool(searchParams?.get('isPrivate'))

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          kind: 'poker',
          type: 'poker-create-room',
          roomId,
          tableName: displayLabel || 'Cash Table',
          isPrivate: privateFlag,
        })
      )

      // quick close (announce only)
      setTimeout(() => {
        try { ws.close() } catch {}
      }, 150)
    }

    ws.onerror = () => {
      try { ws.close() } catch {}
    }

    return () => {
      try { ws.close() } catch {}
    }
    // NOTE: searchParams is stable in next/navigation but not referentially equal always.
    // Only depend on the specific values we read.
  }, [
    mounted,
    mode,
    roomId,
    displayLabel,
    searchParams?.get('private'),
    searchParams?.get('isPrivate'),
  ])

  // ─────────────────────────────
  // RETURNS (AFTER ALL HOOKS)
  // ─────────────────────────────

  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white flex items-center justify-center px-4">
        <div className="text-sm text-white/60">Loading poker room…</div>
      </main>
    )
  }

  // If configured room is not live, block it
  if (configured && roomMeta.status !== 'live') {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-2">{roomMeta.label}</h1>
        <p className="text-white/70 text-sm max-w-md text-center">
          This table is not currently live. Status:&nbsp;
          <span className="font-semibold">{roomMeta.status}</span>.
        </p>
        <Link
          href="/poker"
          className="mt-4 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          ← Back to Lobby
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <div className="fixed left-3 top-[72px] z-[60]">
        <Link
          href={backHref}
          className="rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white/75 hover:bg-white/10"
        >
          ← {mode === 'tournament' ? 'Tournaments' : 'Lobby'}
        </Link>
      </div>

      {mode === 'tournament' ? (
        <PokerRoomTournamentTable
          tableRoomId={roomId}
          tournamentId={tournamentId}
          tournamentName={displayLabel}
        />
      ) : (
        <PokerRoomArcade
          roomId={roomId}
          tableName={displayLabel}
        />
      )}
    </main>
  )
}
