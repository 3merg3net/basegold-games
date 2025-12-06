// lib/blackjackClient/useBlackjackRoom.ts
"use client";

import { useEffect, useRef, useState } from "react";

export type BlackjackMessage = any;

type UseBlackjackRoomResult = {
  ready: boolean;
  messages: BlackjackMessage[];
  send: (msg: any) => void;
};

const DEFAULT_WS_URL = "ws://localhost:8090";

/**
 * Client hook for the live blackjack WebSocket room.
 *
 * Mirrors the pattern of usePokerRoom:
 *   const { ready, messages, send } = useBlackjackRoom(tableId, playerId)
 *
 * The server should accept:
 *   ws://.../ ?tableId=...&playerId=...
 */
export function useBlackjackRoom(
  tableId: string,
  playerId: string
): UseBlackjackRoomResult {
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<BlackjackMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const manuallyClosedRef = useRef(false);

  // Resolve WS URL from env or fallback
  const wsBase =
    process.env.NEXT_PUBLIC_BLACKJACK_WS?.trim() || DEFAULT_WS_URL;

  useEffect(() => {
    manuallyClosedRef.current = false;

    const url = (() => {
      try {
        const u = new URL(wsBase);
        u.searchParams.set("tableId", tableId);
        u.searchParams.set("playerId", playerId);
        return u.toString();
      } catch {
        // if env is just host:port
        const proto = wsBase.startsWith("ws") ? "" : "ws://";
        return `${proto}${wsBase}?tableId=${encodeURIComponent(
          tableId
        )}&playerId=${encodeURIComponent(playerId)}`;
      }
    })();

    function connect() {
      if (manuallyClosedRef.current) return;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setReady(true);
        // optional hello
        ws.send(
          JSON.stringify({
            type: "hello",
            tableId,
            playerId,
          })
        );
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          setMessages((prev) => [...prev, data]);
        } catch {
          // ignore bad JSON
        }
      };

      ws.onclose = () => {
        setReady(false);
        wsRef.current = null;

        if (!manuallyClosedRef.current) {
          // simple backoff reconnect
          reconnectRef.current = window.setTimeout(() => {
            connect();
          }, 1500);
        }
      };

      ws.onerror = () => {
        // let onclose handle reconnect
      };
    }

    connect();

    // heartbeat ping to keep Railway WS alive
    const pingId = window.setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);

    return () => {
      manuallyClosedRef.current = true;

      if (reconnectRef.current != null) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }

      if (pingId) {
        clearInterval(pingId);
      }

      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
    // re-connect if table or player changes
  }, [wsBase, tableId, playerId]);

  const send = (msg: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const payload = {
      ...msg,
      tableId,
      playerId,
    };

    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // ignore send errors
    }
  };

  return { ready, messages, send };
}
