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
 * Build the WebSocket URL in a way that works:
 * - On Vercel + Railway (wss://…)
 * - On localhost (ws://localhost:8080)
 * - On both desktop and mobile browsers
 */
function resolveWsUrl(): string {
  // 1. Read env var (Vercel injects this at build time)
  let raw = process.env.NEXT_PUBLIC_POKER_WS;

  // If NOTHING was provided, fall back to current origin
  // This prevents "invalid URL" in the WebSocket constructor.
  if (!raw || raw.trim() === "") {
    if (typeof window !== "undefined") {
      const isSecure = window.location.protocol === "https:";
      return `${isSecure ? "wss" : "ws"}://${window.location.host}`;
    }
    // SSR fallback
    return "ws://localhost:8080";
  }

  raw = raw.trim();

  // 2. If already ws:// or wss:// → good
  if (raw.startsWith("ws://") || raw.startsWith("wss://")) {
    return raw;
  }

  // 3. If user entered https:// or http:// → convert to wss:// or ws://
  if (raw.startsWith("https://")) {
    return raw.replace(/^https:\/\//, "wss://");
  }
  if (raw.startsWith("http://")) {
    return raw.replace(/^http:\/\//, "ws://");
  }

  // 4. If it's just a bare domain/subdomain → prepend protocol
  const isSecure =
    typeof window !== "undefined" &&
    window.location.protocol === "https:";
  return `${isSecure ? "wss://" : "ws://"}${raw}`;
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
