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

  if (!raw || raw.trim() === "") {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
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

  // ✅ tournaments state
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [lastTournamentStart, setLastTournamentStart] = useState<any | null>(null);
  const [lastTournamentJoin, setLastTournamentJoin] = useState<any | null>(null);
  const [lastTournamentCreate, setLastTournamentCreate] = useState<any | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const manualCloseRef = useRef(false);
  const attemptsRef = useRef(0);

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

  // Low-level send (no readiness assumptions besides OPEN)
  function wsSend(payload: any) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  function startHeartbeat() {
    clearHeartbeat();

    heartbeatIntervalRef.current = window.setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      wsSend({
        kind: "poker",
        roomId,
        playerId,
        type: "ping",
        payload: "hb",
      });
    }, 25_000) as unknown as number;
  }

  // ✅ public send() wrapper
  function send(msg: SendPayload) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[poker] Tried to send but WS not open", {
        hasWs: !!ws,
        readyState: ws?.readyState,
        msg,
      });
      return;
    }
    

    const full = {
      kind: "poker" as const,
      roomId,
      playerId,
      ...msg,
    };

    console.log("[poker] SEND", full);


    try {
      ws.send(JSON.stringify(full));
    } catch (err) {
      console.error("[poker] send failed:", err);
    }
  }


  // ✅ tournaments API
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

  useEffect(() => {
    manualCloseRef.current = false;
    attemptsRef.current = 0;

    setLastTournamentStart(null);
    setLastTournamentJoin(null);
    setLastTournamentCreate(null);

    let didUnmount = false;

    function connect() {
      const url = resolveWsUrl();
      console.log("[poker] Attempting WS →", url);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (didUnmount) return;

        console.log("[poker] WS OPEN:", url);
        setReady(true);
        attemptsRef.current = 0;

        // Table meta (for lobby)
        let tableName = (opts.tableName ?? "").trim();
        let isPrivate = Boolean(opts.isPrivate);

        if (typeof window !== "undefined") {
          const qs = new URLSearchParams(window.location.search);
          if (!tableName) tableName = (qs.get("name") || "").trim();
          if (!opts.isPrivate) isPrivate = qs.get("private") === "1";
        }
        

        // Join-room (required for actual room gameplay; harmless for __lobby__)
        wsSend({
          kind: "poker",
          roomId,
          playerId,
          type: "join-room",
          name: (opts.playerName ?? "").trim() || undefined,
          tableName: tableName || undefined,
          private: isPrivate ? "1" : "0",
        });

        startHeartbeat();

        // ✅ if this socket is a lobby socket, immediately ask for tournaments
        // (harmless for cash rooms too; coordinator will answer)
        wsSend({ kind: "poker", roomId, playerId, type: "tournament-list" });
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);

          // Keep raw stream (cap)
          setMessages((prev) => {
            const next = [...prev, data];
            if (next.length > 250) next.splice(0, next.length - 250);
            return next;
          });

          // ✅ only treat tournament messages as coordinator-level
          if (data?.kind === "poker") {
            if (data?.type === "tournament-list-result") {
              setTournaments(Array.isArray(data.tournaments) ? data.tournaments : []);
              return;
            }

            if (data?.type === "tournament-created") {
              setLastTournamentCreate(data);
              // ✅ force refresh so card appears immediately
              wsSend({ kind: "poker", roomId, playerId, type: "tournament-list" });
              return;
            }

            if (data?.type === "tournament-join-result") {
              setLastTournamentJoin(data);
              // ✅ refresh counts
              wsSend({ kind: "poker", roomId, playerId, type: "tournament-list" });
              return;
            }

            if (data?.type === "tournament-start-result") {
              setLastTournamentStart(data);
              return;
            }
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

        if (manualCloseRef.current) return;

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
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ kind: "poker", roomId, playerId, type: "leave-room" }));
          }
          ws.close();
        } catch (err) {
          console.warn("[poker] error during WS cleanup:", err);
        }
      }
    };
    // ✅ include roomId/playerId (core). We intentionally do NOT depend on opts.* to avoid reconnect spam.
  }, [roomId, playerId]);

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

    // last results
    lastTournamentCreate,
    lastTournamentJoin,
    lastTournamentStart,
  };
}
