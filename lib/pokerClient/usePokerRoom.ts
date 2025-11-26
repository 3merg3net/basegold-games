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

  useEffect(() => {
    const url = resolveWsUrl();
    console.log("[poker] Attempting WS →", url);

    const ws = new WebSocket(url);
    wsRef.current = ws;

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
