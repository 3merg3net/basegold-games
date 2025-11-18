// lib/types.ts
// Shared poker-ish types so lib/net.ts can type-check cleanly.
// You can expand these later when you wire up the real coordinator.

export type Suit = '♠' | '♥' | '♦' | '♣';

export type Card = {
  rank:
    | '2'
    | '3'
    | '4'
    | '5'
    | '6'
    | '7'
    | '8'
    | '9'
    | '10'
    | 'J'
    | 'Q'
    | 'K'
    | 'A';
  suit: Suit;
};

export type Player = {
  id: string;
  name: string;
  seat: number;
  stack: number;
  hasFolded: boolean;
};

export type Street = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
