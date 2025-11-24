import { PlayerID, PokerAction } from "./shared";

export type ClientToServer =
  | {
      type: "join_room";
      roomId: string;
      playerId: PlayerID;
    }
  | {
      type: "leave_room";
      roomId: string;
      playerId: PlayerID;
    }
  | {
      type: PokerAction;
      roomId: string;
      playerId: PlayerID;
      amount?: number;
    };
