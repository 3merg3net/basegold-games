// config/pokerRooms.ts

export type PokerRoomConfig = {
  id: string;                     // Room ID used in URL
  label: string;                  // Display name
  status: "live" | "pending" | "offline";
  private: boolean;               // Public or club-only
  stakes?: string;                // e.g. "0.1 / 0.2 PGLD"
  tier?: "low" | "medium" | "high";
  heroImage?: string;             // Lobby thumbnail
  description?: string;           // Shown under the room label
};

export const POKER_ROOMS: Record<string, PokerRoomConfig> = {
  /** ------------------------------------------------------
   *  MAIN PUBLIC ROOM (LOW BLINDS)
   *  ------------------------------------------------------ */
  "BGRC-holdem-room": {
    id: "BGRC-holdem-room",
    label: "Public Hold’em • Low Blinds",
    status: "live",
    private: false,
    stakes: "0.1 / 0.2 PGLD",
    tier: "low",
    heroImage: "/images/poker-room-low.png",
    description: "Great for warming up and playing with friends.",
  },

  /** ------------------------------------------------------
   *  MEDIUM STAKES TABLE
   *  ------------------------------------------------------ */
  "BGRC-holdem-medium": {
    id: "BGRC-holdem-medium",
    label: "Hold’em • Medium Blinds",
    status: "live",
    private: false,
    stakes: "1 / 2 PGLD",
    tier: "medium",
    heroImage: "/images/poker-room-medium.png",
    description: "Balanced action, solid swings, great for everyday play.",
  },

  /** ------------------------------------------------------
   *  HIGH ROLLER TABLE
   *  ------------------------------------------------------ */
  "BGRC-holdem-highroller": {
    id: "BGRC-holdem-highroller",
    label: "High Roller Table",
    status: "live",
    private: false,
    stakes: "5 / 10 PGLD",
    tier: "high",
    heroImage: "/images/poker-room-high.png",
    description: "Fast, aggressive games for deep-stack players.",
  },

  /** ------------------------------------------------------
   *  EXAMPLE PRIVATE ROOM (CLUB)
   *  ------------------------------------------------------ */
  "club-arkhe": {
    id: "club-arkhe",
    label: "Club Arkhe Private Room",
    status: "pending",             // not live until manually approved
    private: true,
    stakes: "Custom",
    tier: "medium",
    heroImage: "/images/poker-room-private.png",
    description:
      "Invite-only table. Team approval required before it goes live.",
  },

  /** ------------------------------------------------------
   *  FUTURE PRIVATE / OFFLINE ROOM TEMPLATE (OPTIONAL)
   *  ------------------------------------------------------ */
  "club-template": {
    id: "club-template",
    label: "Private Room Template",
    status: "offline",             // not visible to public
    private: true,
    heroImage: "/images/poker-room-generic.png",
    description:
      "Used internally for provisioning custom tables with unique stakes.",
  },
};
