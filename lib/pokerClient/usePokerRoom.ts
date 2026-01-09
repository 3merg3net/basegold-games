"use client";

import { useEffect, useRef, useState } from "react";

type IncomingMessage = any;

type SendPayload =
  | { type: "ping"; payload?: string }
  | { type: "chat"; text: string }
  | { type: "sit"; name?: string; seatIndex?: number; buyIn?: number }
  | { type: "stand" }
  | { type: "start-hand" | "start-game" }
  | { type: "refill-stack"; amount: number }
  | { type: "demo-topup"; target: number }
  | { type: "show-cards" }
  | { type: "reset-table" }
  | { type: "close-room" }

  // ✅ tournaments
  | {
      type: "tournament-create";
      playerId: string;
      tournamentName?: string;
      buyIn: number;
      startingStack: number;
      seatsPerTable?: number;
      isPrivate?: boolean;
      minPlayers?: number;
      maxTables?: number;
    }
  | { type: "tournament-join"; playerId: string; tournamentId: string; name?: string }
  | { type: "tournament-start"; playerId: string; tournamentId: string }
  | { type: "tournament-list" }

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

  // If env not set, default to same host as the page, port 8080.
  // Fixes mobile/LAN testing (phone hitting http://10.0.0.159:3000 should WS to ws://10.0.0.159:8080).
  if (!raw || raw.trim() === "") {
    if (typeof window !== "undefined") {
      const host = window.location.hostname; // e.g. 10.0.0.159
      const isHttps = window.location.protocol === "https:";
      return `${isHttps ? "wss" : "ws"}://${host}:8080`;
    }
    return "ws://localhost:8080";
  }

  const v = raw.trim();

  if (v.startsWith("ws://") || v.startsWith("wss://")) return v;

  if (v.startsWith("https://")) return v.replace(/^https:\/\//, "wss://");
  if (v.startsWith("http://")) return v.replace(/^http:\/\//, "ws://");

  return `wss://${v}`;
}

type UsePokerRoomOpts = {
  roomId: string;
  playerId: string;

  // Player display name (handle/nickname) — OPTIONAL but recommended
  playerName?: string;

  // Table meta — OPTIONAL
  tableName?: string;
  isPrivate?: boolean;
};

export function usePokerRoom(opts: UsePokerRoomOpts) {
  const { roomId, playerId } = opts;

  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<IncomingMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const manualCloseRef = useRef(false);
  const attemptsRef = useRef(0);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [lastTournamentStart, setLastTournamentStart] = useState<any | null>(null);
  const [lastTournamentJoin, setLastTournamentJoin] = useState<any | null>(null);
  const [lastTournamentCreate, setLastTournamentCreate] = useState<any | null>(null);

  useEffect(() => {
    manualCloseRef.current = false;
    attemptsRef.current = 0;

    setLastTournamentStart(null);
setLastTournamentJoin(null);
setLastTournamentCreate(null);


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
      }, 25_000) as unknown as number;
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

        // Prefer opts.tableName / opts.isPrivate if passed.
        // Fallback to URL query params if not provided.
        let tableName = (opts.tableName ?? "").trim();
        let isPrivate = Boolean(opts.isPrivate);

        if (typeof window !== "undefined") {
          const qs = new URLSearchParams(window.location.search);
          if (!tableName) tableName = (qs.get("name") || "").trim();
          if (!opts.isPrivate) isPrivate = qs.get("private") === "1";
        }

        const join = {
          kind: "poker" as const,
          roomId,
          playerId,
          type: "join-room" as const,

          // ✅ Player display name
          name: (opts.playerName ?? "").trim() || undefined,

          // ✅ Table meta for lobby display
          tableName: tableName || undefined,
          private: isPrivate ? "1" : "0",
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

          // Keep raw stream (your existing behavior)
          setMessages((prev) => {
  const next = [...prev, data];
  if (next.length > 250) next.splice(0, next.length - 250);
  return next;
});


          // ✅ Tournament responses (coordinator-level)
          if (data?.type === "tournament-list-result") {
            setTournaments(Array.isArray(data.tournaments) ? data.tournaments : []);
          }

          if (data?.type === "tournament-created") {
            setLastTournamentCreate(data);
          }

          if (data?.type === "tournament-join-result") {
            setLastTournamentJoin(data);
          }

          if (data?.type === "tournament-start-result") {
            setLastTournamentStart(data);
          }
        } catch (err) {
          console.error("[poker] bad message:", err);
        }
      };


      ws.onerror = (err) => {
        console.error("[poker] WS ERROR:", err);
      };

      ws.onclose = (event) => {
        if (didUnmount) return;

        console.log("[poker] WS closed", "code:", event.code, "reason:", event.reason);
        setReady(false);
        clearHeartbeat();

        // If we intentionally closed (unmount / route change), don't reconnect
        if (manualCloseRef.current) return;

        // Auto-reconnect with backoff
        const attempt = attemptsRef.current + 1;
        attemptsRef.current = attempt;
        const delay = Math.min(1000 * Math.pow(2, attempt), 15_000);

        console.log(`[poker] Scheduling reconnect in ${delay}ms (attempt ${attempt})`);

        clearReconnectTimer();
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (!didUnmount && !manualCloseRef.current) connect();
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
          // NOTE: server.ts ignores leave-room currently; safe to send anyway
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ kind: "poker", roomId, playerId, type: "leave-room" }));
          }
          ws.close();
        } catch (err) {
          console.warn("[poker] error during WS cleanup:", err);
        }
      }
    };
    // include meta in deps so reconnect uses latest values
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

    try {
      ws.send(JSON.stringify(full));
    } catch (err) {
      console.error("[poker] send failed:", err);
    }
  }
    function tournamentList() {
    send({ type: "tournament-list" });
  }

  function tournamentCreate(args: {
    playerId: string;
    tournamentName?: string;
    buyIn: number;
    startingStack: number;
    seatsPerTable?: number;
    isPrivate?: boolean;
    minPlayers?: number;
    maxTables?: number;
  }) {
    send({ type: "tournament-create", ...args });
  }

  function tournamentJoin(args: { playerId: string; tournamentId: string; name?: string }) {
    send({ type: "tournament-join", ...args });
  }

  function tournamentStart(args: { playerId: string; tournamentId: string }) {
    send({ type: "tournament-start", ...args });
  }


    return {
    ready,
    messages,
    send,

    // ✅ tournaments
    tournaments,
    tournamentList,
    tournamentCreate,
    tournamentJoin,
    tournamentStart,

    // optional last results if you want them
    lastTournamentCreate,
    lastTournamentJoin,
    lastTournamentStart,
  };

}
