"use client";

import { useEffect, useRef, useState } from "react";
import { POKER_WS_URL } from "@/lib/poker/net";

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
 * Build a WebSocket URL that is safe for:
 * - Vercel (https → wss)
 * - Railway
 * - Local dev (http → ws)
 * - Mobile Safari (hates mixed content + weird schemes)
 */
function buildWsUrl(): string {
  const raw = process.env.NEXT_PUBLIC_POKER_WS;

  // SSR fallback
  if (typeof window === "undefined") {
    return raw || "ws://localhost:8080";
  }

  // No env set → local dev default
  if (!raw) {
    const isSecure = window.location.protocol === "https:";
    return (isSecure ? "wss://" : "ws://") + "localhost:8080";
  }

  // If already ws:// or wss:// use as-is
  if (raw.startsWith("ws://") || raw.startsWith("wss://")) {
    return raw;
  }

  // If someone put https:// or http:// → convert to wss/ws
  const cleaned = raw.replace(/^https?:\/\//, "");
  const isSecure = window.location.protocol === "https:";
  return (isSecure ? "wss://" : "ws://") + cleaned;
}

export function usePokerRoom(roomId: string, playerId: string) {
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<IncomingMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Build URL once per mount
    const url = buildWsUrl();
    console.log("[poker] connecting to WS:", {
      env: process.env.NEXT_PUBLIC_POKER_WS,
      resolvedUrl: url,
      netConst: POKER_WS_URL,
    });

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[poker] WS opened:", url);
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
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
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
        if (wsRef.current === ws) {
          wsRef.current = null;
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

    console.log("[poker] outgoing:", full);
    ws.send(JSON.stringify(full));
  }

  return { ready, messages, send };
}
