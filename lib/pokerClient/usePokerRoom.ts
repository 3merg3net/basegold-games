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
 * Build the WebSocket URL in a way that works:
 * - On Vercel + Railway (wss://…)
 * - On localhost (ws://localhost:8080)
 * - Ignores the "<your-socket-host>" placeholder
 */
function resolveWsUrl(): string {
  let raw = process.env.NEXT_PUBLIC_POKER_WS;

  // Guard against leftover tutorial placeholder
  if (raw && raw.includes("<your-socket-host>")) {
    console.warn(
      "[poker] NEXT_PUBLIC_POKER_WS contains placeholder '<your-socket-host>', ignoring it."
    );
    raw = "";
  }

  // If env is set and not empty → normalize it
  if (raw && raw.trim() !== "") {
    raw = raw.trim();

    // Already ws:// or wss:// → good
    if (raw.startsWith("ws://") || raw.startsWith("wss://")) {
      return raw;
    }

    // Convert https:// → wss://, http:// → ws://
    if (raw.startsWith("https://")) {
      return raw.replace(/^https:\/\//, "wss://");
    }
    if (raw.startsWith("http://")) {
      return raw.replace(/^http:\/\//, "ws://");
    }

    // Bare domain / host → assume wss:// in prod
    return `wss://${raw}`;
  }

  // No env (or placeholder) → dev default
  // This is what makes local dev work with a localhost coordinator.
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
