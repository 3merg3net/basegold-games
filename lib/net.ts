// lib/poker/net.ts
import { io, type Socket } from "socket.io-client";

/**
 * Lightweight local types so this module doesn't depend on ./types.
 * These are only used for typing snapshots/actions on the client.
 */

export type Card = string;

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";

export type Player = {
  seat: number;
  id?: string;
  name?: string;
  stack: number;
  inHand: boolean;
  committed: number;
  hasFolded?: boolean;
  isHero?: boolean;
};

export type NetSnapshot = {
  tableId: string;
  players: Player[];
  button: number;
  street: Street;
  board: Card[];
  pot: number;
  toAct: number | null;
  minRaise: number;
  currentBet: number;
  commit?: string;
  seed?: string;
};

export type NetAction =
  | { type: "start"; commit: string }
  | { type: "seat"; seat: number; seated: boolean }
  | { type: "fold"; seat: number }
  | { type: "call"; seat: number; amt: number }
  | { type: "raise"; seat: number; to: number; add: number }
  | { type: "showdown" };

export function connectSocket(): Socket | null {
  const url = process.env.NEXT_PUBLIC_POKER_WS;
  if (!url) return null; // allows local demo without a running server

  const s: Socket = io(url, { transports: ["websocket"] });
  return s;
}

export function emitAction(s: Socket, tableId: string, action: NetAction) {
  s.emit("action", { tableId, action });
}
