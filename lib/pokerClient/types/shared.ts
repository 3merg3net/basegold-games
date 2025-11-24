export type PlayerID = string;

export type PokerAction =
  | "player_join"
  | "player_leave"
  | "deal"
  | "bet"
  | "fold"
  | "check"
  | "winner";

export interface Card {
  rank: string; // 'A' | 'K' | ...
  suit: string; // '♠' | '♥' | '♦' | '♣'
}
