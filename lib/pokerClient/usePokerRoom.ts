"use client";

import { useEffect, useRef, useState } from "react";

type IncomingMessage = any;

type SendPayload =
  | { type: "ping"; payload?: string }
  | { type: "chat"; text: string }
  | { type: "sit"; name?: string; seatIndex?: number; buyIn?: number }
  | { type: "stand" }
  | { type: "start-hand" }
  | {
      type: "action";
      action: "fold" | "check" | "call" | "bet";
      amount?: number;
    };

/**
 * SUPER SIMPLE URL RESOLVER
 * - Local dev: ws://localhost:8080 (coordinator)
 * - Vercel: uses NEXT_PUBLIC_POKER_WS (wss://your-railway)
 */
function resolveWsUrl(): string {
  const raw = process.env.NEXT_PUBLIC_POKER_WS;

  // Local default: coordinator on :8080
  if (!raw || raw.trim() === "") {
    return "ws://localhost:8080";
  }

  const v = raw.trim();

  // Already a ws:// or wss:// URL → use as-is
  if (v.startsWith("ws://") || v.startsWith("wss://")) {
    return v;
  }

  // Convert http(s) → ws(s)
  if (v.startsWith("https://")) {
    return v.replace(/^https:\/\//, "wss://");
  }
  if (v.startsWith("http://")) {
    return v.replace(/^http:\/\//, "ws://");
  }

  // Bare host like "bgld-poker-coordinator-production.up.railway.app"
  return `wss://${v}`;
}

export function usePokerRoom(roomId: string, playerId: string) {
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<IncomingMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const manualCloseRef = useRef(false);
  const attemptsRef = useRef(0);

  useEffect(() => {
    manualCloseRef.current = false;
    attemptsRef.current = 0;

    let didUnmount = false;

    function clearReconnectTimer() {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }

    function clearHeartbeat() {
      if (heartbeatIntervalRef.current !== null) {
        window.clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    }

    function startHeartbeat() {
      clearHeartbeat();
      // Light heartbeat every ~25s to keep Railway / proxies from idling us out
      heartbeatIntervalRef.current = window.setInterval(() => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        const ping = {
          kind: "poker" as const,
          roomId,
          playerId,
          type: "ping" as const,
          payload: "hb",
        };
        try {
          ws.send(JSON.stringify(ping));
        } catch (err) {
          console.warn("[poker] heartbeat send failed:", err);
        }
      }, 25000) as unknown as number;
    }

    function connect() {
      const url = resolveWsUrl();
      console.log("[poker] Attempting WS →", url);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (didUnmount) return;
        console.log("[poker] WS OPEN:", url);
        setReady(true);
        attemptsRef.current = 0; // reset backoff on success

        const join = {
          kind: "poker" as const,
          roomId,
          playerId,
          type: "join-room" as const,
        };

        try {
          ws.send(JSON.stringify(join));
        } catch (err) {
          console.error("[poker] failed to send join-room:", err);
        }

        startHeartbeat();
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          // console.log("[poker] incoming:", data);
          setMessages((prev) => [...prev, data]);
        } catch (err) {
          console.error("[poker] bad message:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("[poker] WS ERROR:", err);
      };

      ws.onclose = (event) => {
        if (didUnmount) return;

        console.log(
          "[poker] WS closed",
          "code:",
          event.code,
          "reason:",
          event.reason
        );
        setReady(false);
        clearHeartbeat();

        // If we intentionally closed (unmount / route change), don't reconnect
        if (manualCloseRef.current) {
          return;
        }

        // Auto-reconnect with backoff
        const attempt = attemptsRef.current + 1;
        attemptsRef.current = attempt;
        const delay = Math.min(1000 * Math.pow(2, attempt), 15000); // 1s → 2s → 4s … max 15s

        console.log(`[poker] Scheduling reconnect in ${delay}ms (attempt ${attempt})`);

        clearReconnectTimer();
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (!didUnmount && !manualCloseRef.current) {
            connect();
          }
        }, delay) as unknown as number;
      };
    }

    connect();

    return () => {
      didUnmount = true;
      manualCloseRef.current = true;
      setReady(false);

      clearHeartbeat();
      clearReconnectTimer();

      const ws = wsRef.current;
      wsRef.current = null;

      if (ws) {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            const leave = {
              kind: "poker" as const,
              roomId,
              playerId,
              type: "leave-room" as const,
            };
            ws.send(JSON.stringify(leave));
          }
          ws.close();
        } catch (err) {
          console.warn("[poker] error during WS cleanup:", err);
        }
      }
    };
  }, [roomId, playerId]);

  function send(msg: SendPayload) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[poker] Tried to send but WS not open", {
        hasWs: !!ws,
        readyState: ws?.readyState,
      });
      return;
    }

    const full = {
      kind: "poker" as const,
      roomId,
      playerId,
      ...msg,
    };

    // console.log("[poker] outgoing:", full);
    try {
      ws.send(JSON.stringify(full));
    } catch (err) {
      console.error("[poker] send failed:", err);
    }
  }

  return { ready, messages, send };
}
