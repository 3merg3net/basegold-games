// config/pokerRooms.ts

export type PokerRoomStatus = "live" | "pending" | "disabled";

export type PokerRoomConfig = {
  id: string;
  label: string;
  status: PokerRoomStatus;
  private: boolean;
};

export const POKER_ROOMS: Record<string, PokerRoomConfig> = {
  "BGRC-holdem-room": {
    id: "BGRC-holdem-room",
    label: "Public Hold'em Room",
    status: "live",
    private: false,
  },
  "club-arkhe": {
    id: "club-arkhe",
    label: "Arkhe Private Room",
    status: "pending",
    private: true,
  },
  "club-phoenix": {
    id: "club-phoenix",
    label: "Phoenix Syndicate",
    status: "disabled",
    private: true,
  },
};
