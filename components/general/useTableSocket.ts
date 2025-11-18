'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

export type TableEvent = { type: 'join' | 'bet' | 'check' | 'fold'; name: string; amount?: number; t: number }

export function useTableSocket(url = 'ws://localhost:8787') {
  const [events, setEvents] = useState<TableEvent[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(url)
    wsRef.current = ws
    ws.onmessage = (msg) => {
      try {
        const ev = JSON.parse(msg.data as string) as TableEvent
        setEvents((arr) => [...arr.slice(-100), ev])
      } catch {}
    }
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', name: 'Guest', t: Date.now() }))
    }
    return () => { ws.close() }
  }, [url])

  const send = (ev: TableEvent) => {
    wsRef.current?.readyState === 1 && wsRef.current?.send(JSON.stringify(ev))
  }

  return { events, send }
}
