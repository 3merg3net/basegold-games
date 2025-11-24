import { PlayerID, Card, PokerAction } from "./shared";

export type ServerToClient =
  | {
      type: "room_state";
      roomId: string;
      players: PlayerID[];
      pot: number;
      gameState: string;
    }
  | {
      type: "player_joined";
      roomId: string;
      playerId: PlayerID;
    }
  | {
      type: "player_left";
      roomId: string;
      playerId: PlayerID;
    }
  | {
      type: "deal_cards";
      roomId: string;
      playerId: PlayerID;
      cards: Card[];
    }
  | {
      type: "action_broadcast";
      roomId: string;
      playerId: PlayerID;
      action: PokerAction;
      amount?: number;
    }
  | {
      type: "winner";
      roomId: string;
      winners: PlayerID[];
      pot: number;
    };
