// lib/pokerClient/usePokerRoom.ts
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

// Hard-coded production WS URL for now.
// This avoids all the "wss://<your-socket-host>" / env weirdness.
const PROD_WS_URL = "wss://bgld-poker-coordinator-production.up.railway.app";

/**
 * Very simple, robust WS URL resolver:
 * - localhost → ws://localhost:8080
 * - anything else (Vercel, mobile, etc.) → PROD_WS_URL
 */
function resolveWsUrl(): string {
  if (typeof window === "undefined") {
    // SSR fallback – doesn't actually open sockets on server
    return "ws://localhost:8080";
  }

  const host = window.location.hostname;

  // Local dev
  if (host === "localhost" || host === "127.0.0.1") {
    return "ws://localhost:8080";
  }

  // Deployed (Vercel, custom domain, etc.)
  return PROD_WS_URL;
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
