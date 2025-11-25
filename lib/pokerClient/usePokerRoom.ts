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

// 🔒 Single source of truth for production
const PROD_HOST = "casino.basereserve.gold";
const PROD_WS_URL = "wss://bgld-poker-coordinator-production.up.railway.app";

/**
 * Build the WebSocket URL:
 * - In prod on Vercel → always use Railway WSS
 * - In dev/local → ws://localhost:8080
 * - On SSR → fall back to env or localhost
 */
function resolveWsUrl(): string {
  // SSR / build time: no window
  if (typeof window === "undefined") {
    const raw = process.env.NEXT_PUBLIC_POKER_WS;
    if (raw && raw.trim().length > 0) {
      return raw.trim();
    }
    return "ws://localhost:8080";
  }

  const host = window.location.hostname;

  // ✅ Production domain → Railway
  if (host === PROD_HOST) {
    return PROD_WS_URL;
  }

  // ✅ Anything else (localhost, 192.168.x.x, etc.) → local coordinator
  return "ws://localhost:8080";
}

export function usePokerRoom(roomId: string, playerId: string) {
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<IncomingMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = resolveWsUrl();
    console.log("[poker] Attempting WS →", url);

    const ws = new WebSocket(url);
    wsRef.current = ws; // REQUIRED so send() can use it

    ws.onopen = () => {
      console.log("[poker] WS OPEN:", url);
      setReady(true);

      const join = {
        kind: "poker" as const,
        roomId,
        playerId,
        type: "join-room" as const,
      };

      ws.send(JSON.stringify(join));
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        console.log("[poker] incoming:", data);
        setMessages((prev) => [...prev, data]);
      } catch (err) {
        console.error("[poker] bad message:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("[poker] WS ERROR:", err);
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
