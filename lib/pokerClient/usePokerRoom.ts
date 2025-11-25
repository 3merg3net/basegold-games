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

/**
 * Build the WebSocket URL:
 * - Vercel + Railway: uses NEXT_PUBLIC_POKER_WS (wss://...)
 * - Local dev: falls back to ws://localhost:8080
 */
function resolveWsUrl(): string {
  const raw = process.env.NEXT_PUBLIC_POKER_WS;

  // 1) If env is set, use it as-is (after trimming)
  if (raw && raw.trim().length > 0) {
    const trimmed = raw.trim();
    // Allow either ws(s):// or http(s):// in env:
    if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
      return trimmed;
    }
    if (trimmed.startsWith("https://")) {
      return trimmed.replace(/^https:\/\//, "wss://");
    }
    if (trimmed.startsWith("http://")) {
      return trimmed.replace(/^http:\/\//, "ws://");
    }
    // Bare host like "bgld-poker-coordinator-production.up.railway.app"
    const isSecure =
      typeof window !== "undefined" &&
      window.location.protocol === "https:";
    return `${isSecure ? "wss://" : "ws://"}${trimmed}`;
  }

  // 2) No env → local dev fallback
  if (typeof window !== "undefined") {
    // Assume local coordinator on 8080
    return "ws://localhost:8080";
  }

  // 3) SSR fallback (never actually used by the browser)
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
    wsRef.current = ws; // make send() work

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
