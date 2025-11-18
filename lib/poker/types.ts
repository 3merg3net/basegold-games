// lib/poker/types.ts
export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "A" | "K" | "Q" | "J" | "T" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2";
export type Card = { rank: Rank; suit: Suit };
export type Street = "idle" | "preflop" | "flop" | "turn" | "river";

export type Player = {
  seat: number;
  name: string;
  stack: number;
  inHand: boolean; // seated + has chips when idle; in current hand when live
  folded: boolean;
  hole: Card[];
  acted?: boolean;
  bet?: number;
};

export type Action = "fold" | "call" | "bet" | "raise" | "check";

export type TableState = {
  tableId: string;
  players: Player[];
  button: number;
  street: Street;
  board: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;
  toAct: number | null;
};
