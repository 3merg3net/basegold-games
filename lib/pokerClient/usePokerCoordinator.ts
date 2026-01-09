'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Msg = any

// TODO: match whatever you already use in usePokerRoom().
// Common patterns: NEXT_PUBLIC_COORDINATOR_WS_URL, NEXT_PUBLIC_WS_URL, etc.
const WS_URL =
  process.env.NEXT_PUBLIC_COORDINATOR_WS_URL ||
  process.env.NEXT_PUBLIC_WS_URL ||
  'ws://localhost:8080'

export function usePokerCoordinator() {
  const wsRef = useRef<WebSocket | null>(null)
  const [ready, setReady] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setReady(true)
    ws.onclose = () => setReady(false)
    ws.onerror = () => setReady(false)
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(String(ev.data))
        setMessages((prev) => {
          const next = prev.length > 250 ? prev.slice(-200) : prev
          return [...next, m]
        })
      } catch {}
    }

    return () => {
      try {
        ws.close()
      } catch {}
      wsRef.current = null
    }
  }, [])

  const send = useCallback((payload: any) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify(payload))
  }, [])

  const last = useMemo(() => {
    return (pred: (m: any) => boolean) => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (pred(messages[i])) return messages[i]
      }
      return null
    }
  }, [messages])

  return { ready, messages, send, last }
}
