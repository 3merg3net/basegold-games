// src/config/pokerRooms.ts

export type StakesTier = "low" | "mid" | "high" | "club";
export type PokerRoomStatus = "live" | "pending" | "disabled";

export type PokerRoomConfig = {
  id: string;
  label: string;
  status: PokerRoomStatus;
  private: boolean;
  stakesTier: StakesTier;
  blinds: string;
  minBuyIn: string;
  maxBuyIn: string;
  maxSeats: number;
  speed: string;
  image: string;
  tagline: string;
  accessCode?: string; // optional: for invite-only / access code model
};

export const POKER_ROOMS: Record<string, PokerRoomConfig> = {
  "BGRC-holdem-room": {
    id: "BGRC-holdem-room",
    label: "BGRC Main Cash • Low Stakes",
    status: "live",
    private: false,
    stakesTier: "low",
    blinds: "25 / 50 PGLD",
    minBuyIn: "1,000 PGLD",
    maxBuyIn: "5,000 PGLD",
    maxSeats: 9,
    speed: "Regular",
    image: "/images/poker-hero-enter.png",
    tagline: "Public golden pit for the community. Perfect for warm-up and rail games.",
  },

  "bgld-mid-100-200": {
    id: "bgld-mid-100-200",
    label: "BGRC Mid Stakes • 100 / 200",
    status: "pending", // not live yet – lobby can still show it
    private: false,
    stakesTier: "mid",
    blinds: "100 / 200 PGLD",
    minBuyIn: "5,000 PGLD",
    maxBuyIn: "25,000 PGLD",
    maxSeats: 9,
    speed: "Regular",
    image: "/images/poker-hero-enter.png",
    tagline: "Deeper stacks and bigger swings for regulars once live.",
  },

  "bgld-high-500-1k": {
    id: "bgld-high-500-1k",
    label: "BGRC High Stakes • 500 / 1,000",
    status: "pending",
    private: false,
    stakesTier: "high",
    blinds: "500 / 1,000 PGLD",
    minBuyIn: "25,000 PGLD",
    maxBuyIn: "100,000 PGLD",
    maxSeats: 9,
    speed: "Regular",
    image: "/images/poker-hero-enter.png",
    tagline: "High-pressure pit for golden degenerates once the rails are ready.",
  },

  "club-arkhe": {
    id: "club-arkhe",
    label: "Club Arkhe • Private Rail",
    status: "pending",
    private: true,
    stakesTier: "club",
    blinds: "50 / 100 PGLD",
    minBuyIn: "2,500 PGLD",
    maxBuyIn: "15,000 PGLD",
    maxSeats: 9,
    speed: "Regular",
    image: "/images/poker-hero-enter.png",
    tagline: "Invite-only table for Arkhe signal crew. Goes live once approved.",
    // accessCode: "ARKHE-XXXX", // if you want a code later
  },
};

export const POKER_ROOM_CARDS: PokerRoomConfig[] = Object.values(POKER_ROOMS);
