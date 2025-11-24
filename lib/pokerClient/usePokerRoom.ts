"use client";

import { useEffect, useRef, useState } from "react";

type IncomingMessage = any;

type SendPayload =
  | { type: "ping"; payload?: string }
  | { type: "chat"; text: string }
  | { type: "sit"; name?: string; seatIndex?: number; buyIn?: number }
  | { type: "stand" }
  | { type: "start-hand" }
  | { type: "action"; action: "fold" | "check" | "call" | "bet"; amount?: number };

// Read the env that Vercel injects at build time
const WS_ENV = process.env.NEXT_PUBLIC_POKER_WS;

/**
 * Build the WebSocket URL in a way that works:
 * - On Vercel + Railway (wss://…)
 * - On localhost (ws://localhost:8080)
 * - On both desktop and mobile browsers
 */
function resolveWsUrl(): string {
  // SSR / Next.js server side: just return env or localhost
  if (typeof window === "undefined") {
    return WS_ENV || "ws://localhost:8080";
  }

  // No env set → fall back to current host (useful in dev)
  if (!WS_ENV) {
    const isSecure = window.location.protocol === "https:";
    const defaultHost =
      window.location.hostname === "localhost"
        ? "localhost:8080"
        : window.location.host;
    return `${isSecure ? "wss" : "ws"}://${defaultHost}`;
  }

  // If env is already ws:// or wss://, use as-is
  if (WS_ENV.startsWith("ws://") || WS_ENV.startsWith("wss://")) {
    return WS_ENV;
  }

  // If env is http(s)://, convert to ws(s)://
  const cleaned = WS_ENV.replace(/^https?:\/\//, "");
  const isSecure = window.location.protocol === "https:";
  return `${isSecure ? "wss" : "ws"}://${cleaned}`;
}

export function usePokerRoom(roomId: string, playerId: string) {
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<IncomingMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = resolveWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws; // 🔥 CRUCIAL: wire into ref so send() works

    console.log("[poker] opening WS:", url);

    ws.onopen = () => {
      console.log("[poker] WS opened");
      setReady(true);

      const join = {
        kind: "poker" as const,
        roomId,
        playerId,
        type: "join-room" as const,
      };

      ws.send(JSON.stringify(join));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[poker] incoming:", data);
        setMessages((prev) => [...prev, data]);
      } catch (err) {
        console.error("[poker] Failed to parse WS message", err);
      }
    };

    ws.onerror = (event) => {
      console.error("[poker] WS error", event);
    };

    ws.onclose = (event) => {
      console.log(
        "[poker] WS closed",
        "code:",
        event.code,
        "reason:",
        event.reason
      );
      setReady(false);
      wsRef.current = null;
    };

    return () => {
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
      } catch {
        // ignore cleanup errors
      } finally {
        wsRef.current = null;
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

    console.log("[poker] outgoing:", full);
    ws.send(JSON.stringify(full));
  }

  return { ready, messages, send };
}
