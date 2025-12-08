// lib/blackjackClient/useBlackjackRoom.ts
"use client";

import { useEffect, useRef, useState } from "react";

export type BlackjackPhase =
  | "waiting-bets"
  | "dealing"
  | "player-action"
  | "dealer-turn"
  | "round-complete";

export type BlackjackHandResult =
  | "pending"
  | "win"
  | "lose"
  | "push"
  | "blackjack";

export type BlackjackHandState = {
  handIndex: number;
  cards: string[];
  bet: number;
  isBusted: boolean;
  isStanding: boolean;
  isBlackjack: boolean;
  result: BlackjackHandResult;
  payout: number;
};

export type BlackjackSeatState = {
  seatIndex: number;
  playerId: string | null;
  name?: string;
  bankroll: number;
  hands: BlackjackHandState[];
};

export type BlackjackDealerState = {
  cards: string[];
  hideHoleCard: boolean;
};

export type BlackjackTableState = {
  roundId: number;
  phase: BlackjackPhase;
  minBet: number;
  maxBet: number;
  activeSeatIndex: number | null;
  activeHandIndex: number | null;
  dealer: BlackjackDealerState;
  seats: BlackjackSeatState[];
  betDeadlineMs?: number | null;
};

export type UseBlackjackRoomOptions = {
  roomId: string;
  playerId: string;
  name: string;
  wsUrl: string;
};

type MessageBase = {
  kind: "blackjack";
  roomId: string;
  playerId: string;
};

type ServerToClientMessage = MessageBase & {
  type: string;
  table?: BlackjackTableState;
  message?: string;
  [key: string]: any;
};

export function useBlackjackRoom(opts: UseBlackjackRoomOptions | null) {
  const [connected, setConnected] = useState(false);
  const [table, setTable] = useState<BlackjackTableState | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Connect + auto-reconnect
  useEffect(() => {
    if (!opts) return;

    let stopped = false;

    const { wsUrl, roomId, playerId, name } = opts;

    function setupSocket() {
      if (stopped) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (stopped) return;
        console.log("[BJ hook] ws open");
        setConnected(true);
        reconnectAttemptsRef.current = 0;

        const joinMsg: MessageBase & {
          type: "join-room";
          name?: string;
        } = {
          kind: "blackjack",
          type: "join-room",
          roomId,
          playerId,
          name,
        };

        try {
          ws.send(JSON.stringify(joinMsg));
        } catch {
          // ignore
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        if (stopped) return;
        const raw = event.data as string;
        console.log("[BJ hook] onmessage raw:", raw);

        try {
          const msg = JSON.parse(raw) as ServerToClientMessage;
          console.log("[BJ hook] onmessage parsed:", msg);

          if (msg.kind !== "blackjack") return;

          if (
            (msg.type === "blackjack-state" ||
              msg.type === "table-state") &&
            msg.table
          ) {
            setTable(msg.table);
            return;
          }

          if (msg.type === "error" && msg.message) {
            console.warn(
              "[BJ hook] error from server:",
              msg.message
            );
          }
        } catch (err) {
          console.log("[BJ hook] onmessage JSON parse error:", err);
        }
      };

      ws.onclose = () => {
        if (stopped) return;
        console.log("[BJ hook] ws closed");
        setConnected(false);
        wsRef.current = null;

        // schedule reconnect
        reconnectAttemptsRef.current += 1;
        const attempt = reconnectAttemptsRef.current;
        const delay = Math.min(1000 * attempt, 10_000);

        setTimeout(() => {
          if (!stopped) {
            console.log(
              "[BJ hook] reconnecting, attempt",
              reconnectAttemptsRef.current
            );
            setupSocket();
          }
        }, delay);
      };

      ws.onerror = (ev) => {
        console.log("[BJ hook] ws error", ev);
        // let onclose handle reconnect
      };
    }

    setupSocket();

    return () => {
      stopped = true;
      setConnected(false);
      const ws = wsRef.current;
      wsRef.current = null;
      try {
        ws?.close();
      } catch {
        // ignore
      }
    };
  }, [opts?.wsUrl, opts?.roomId, opts?.playerId, opts?.name]);

  // ---- Helper to send messages ----
  function sendRaw(payload: { type: string; [key: string]: any }) {
    const ws = wsRef.current;

    if (!ws) {
      console.log(
        "[BJ hook] sendRaw: no websocket instance yet",
        payload
      );
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      console.log("[BJ hook] sendRaw: websocket not open", {
        readyState: ws.readyState,
        payload,
      });
      return;
    }

    if (!opts) {
      console.log("[BJ hook] sendRaw: no opts", payload);
      return;
    }

    const base: MessageBase = {
      kind: "blackjack",
      roomId: opts.roomId,
      playerId: opts.playerId,
    };

    const msg = { ...base, ...payload };
    console.log("[BJ hook] sendRaw: sending", msg);

    try {
      ws.send(JSON.stringify(msg));
    } catch (err) {
      console.log("[BJ hook] sendRaw: error sending", err);
    }
  }

  /** Sit / leave seat */
  function sendSeat(action: "sit" | "leave", seatIndex: number) {
    if (!opts) return;
    console.log("[BJ hook] sendSeat called", { action, seatIndex });

    if (action === "sit") {
      sendRaw({
        type: "bj-seat",
        seatIndex,
        action: "sit",
        name: opts.name,
      });
    } else {
      sendRaw({
        type: "bj-seat",
        seatIndex,
        action: "leave",
      });
    }
  }

  /** Place initial bet for the seat */
  function placeBet(seatIndex: number, amount: number) {
    console.log("[BJ hook] placeBet", { seatIndex, amount });
    sendRaw({
      type: "bj-place-bet",
      seatIndex,
      amount,
    });
  }

  /** Player action on current hand */
  function sendAction(
    action:
      | "hit"
      | "stand"
      | "double"
      | "split"
      | "next-round"
      | "reload-demo",
    seatIndex: number,
    handIndex: number
  ) {
    console.log("[BJ hook] sendAction", {
      action,
      seatIndex,
      handIndex,
    });
    sendRaw({
      type: "bj-action",
      seatIndex,
      handIndex,
      action,
    });
  }

  return {
    connected,
    table,
    sendSeat,
    placeBet,
    sendAction,
  };
}
