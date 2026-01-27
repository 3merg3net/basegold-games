"use client";

import { useEffect, useRef, useState } from "react";

type IncomingMessage = any;

type SendPayload =
  | { type: "ping"; payload?: string }
  | { type: "chat"; text: string }
  | { type: "sit"; name?: string; handle?: string; seatIndex?: number; buyIn?: number }
  | { type: "stand" }
  | { type: "start-hand" | "start-game" }
  | { type: "refill-stack"; amount: number }
  | { type: "demo-topup"; target: number }
  | { type: "show-cards" }
  | { type: "reset-table" }
  | { type: "close-room" }
  | { type: "host-hold"; seconds?: number }
  | { type: "host-resume" }
  | { type: "host-reset" }
  | { type: "host-force-end-hand" }
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
 * - Deployed: uses NEXT_PUBLIC_POKER_WS (wss://your-railway)
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

  // Player display name (handle/nickname)
  playerName?: string;
  playerHandle?: string;

  tableName?: string;
  isPrivate?: boolean;
};

export function usePokerRoom(opts: UsePokerRoomOpts) {
  const { roomId, playerId } = opts;

  const [ready, setReady] = useState(false);

  // ✅ joined handshake (needed to avoid sending sit before join completes)
  const [joined, setJoined] = useState(false);

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

  // ✅ queue messages until join-room handshake completes
  const queuedRef = useRef<any[]>([]);

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

  function flushQueue() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!joined) return;

    const q = queuedRef.current;
    if (!q.length) return;

    queuedRef.current = [];
    for (const payload of q) {
      console.log("[poker] FLUSH", payload);
      wsSend(payload);
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

  function send(msg: SendPayload) {
    const ws = wsRef.current;

    // build envelope
    const full = {
      kind: "poker" as const,
      roomId,
      playerId,
      ...msg,
    };

    // ALWAYS log outgoing (even if queued)
    console.log("[poker] SEND", full);

    // require socket open
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[poker] Tried to send but WS not open", {
        hasWs: !!ws,
        readyState: ws?.readyState,
        msg,
      });
      return;
    }

    // ✅ Never allow gameplay msgs before join handshake.
    // Tournament / lobby commands can still go through without join if you want,
    // but to keep this deterministic: queue everything except join-room/ping.
    const t = (msg as any)?.type;
    const allowBeforeJoin =
      t === "ping" || t === "tournament-list" || t === "tournament-create" || t === "tournament-join" || t === "tournament-start";

    if (!joined && !allowBeforeJoin) {
      console.warn("[poker] Queuing message until joined:", t);
      queuedRef.current.push(full);
      return;
    }

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

    setReady(false);
    setJoined(false);
    queuedRef.current = [];

    let didUnmount = false;

    function connect() {
      const url = resolveWsUrl();
      console.log("[poker] Attempting WS →", url);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      // ✅ Always show low-level socket events
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

        // ✅ Explicit join-room first (deterministic; fixes Railway timing/races)
        const joinPayload = {
          kind: "poker",
          roomId,
          playerId,
          type: "join-room",
          name: (opts.playerName ?? "").trim() || undefined,
          handle: (opts.playerHandle ?? "").trim() || undefined,
          tableName: tableName || undefined,
          private: isPrivate ? "1" : "0",
        };

        console.log("[poker] JOIN →", joinPayload);
        wsSend(joinPayload);

        startHeartbeat();

        // Lobby/tournaments are fine to request immediately
        wsSend({ kind: "poker", roomId, playerId, type: "tournament-list" });
      };

      ws.onmessage = (ev) => {
        // ✅ raw log for debugging (critical for this bug)
        console.log("[poker] RECV raw:", ev.data);

        try {
          const data = JSON.parse(ev.data);

          // Keep raw stream (cap)
          setMessages((prev) => {
            const next = [...prev, data];
            if (next.length > 250) next.splice(0, next.length - 250);
            return next;
          });

          // ✅ join handshake detection
          if (data?.kind === "poker" && (data?.type === "room-joined" || data?.type === "seats-update")) {
            if (!joined) {
              console.log("[poker] JOINED ✅ via", data?.type);
              setJoined(true);
              // flush queued gameplay messages
              // Note: flushQueue reads `joined`, so call after state tick too:
              setTimeout(() => flushQueue(), 0);
            }
          }

          // ✅ tournament messages
          if (data?.kind === "poker") {
            if (data?.type === "tournament-list-result") {
              setTournaments(Array.isArray(data.tournaments) ? data.tournaments : []);
              return;
            }

            if (data?.type === "tournament-created") {
              setLastTournamentCreate(data);
              wsSend({ kind: "poker", roomId, playerId, type: "tournament-list" });
              return;
            }

            if (data?.type === "tournament-join-result") {
              setLastTournamentJoin(data);
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

      ws.onerror = (ev) => {
        console.log("[poker] WS ERROR:", ev);
      };

      ws.onclose = (event) => {
        if (didUnmount) return;

        console.log("[poker] WS CLOSE:", event.code, event.reason);
        setReady(false);
        setJoined(false);
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
      setJoined(false);

      clearHeartbeat();
      clearReconnectTimer();

      const ws = wsRef.current;
      wsRef.current = null;

      if (ws) {
        try {
          // leave-room is optional; your server currently ignores it anyway
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ kind: "poker", roomId, playerId, type: "leave-room" }));
          }
          ws.close();
        } catch (err) {
          console.warn("[poker] error during WS cleanup:", err);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, playerId]);

  return {
    ready,
    joined,
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
