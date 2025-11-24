// types/playerProfile.ts

export type PlayerStyle = "tight" | "loose" | "aggro" | "balanced" | "creative";

export type PlayerBadgeId =
  | "og-gold-rush"
  | "demo-shark"
  | "multi-table-grinder"
  | "cash-game-regular"
  | "signal-initiate"
  | "vault-staker"
  | "bounty-hunter";

export type PlayerTier = "bronze" | "silver" | "gold" | "diamond" | "flame";

export type PlayerStats = {
  handsPlayed: number;
  handsWon: number;
  biggestPotWon: number;
  totalProfit: number; // in demo chips for now

  vpip: number;              // voluntarily put chips in pot %
  pfr: number;               // preflop raise %
  aggressionFactor: number;  // (bet+raise)/call

  blackjackHands: number;
  baccaratWins: number;
  slotsJackpots: number;

  pokerRating: number;       // 1–3000 ELO-style
};

export type PlayerProfile = {
  id: string;                // "local-player" for now, later wallet / UUID
  nickname: string;
  avatarUrl?: string;
  bannerUrl?: string;
  avatarColor: string;
  avatarInitials: string;
  bio: string;
  hometown: string;
  style: PlayerStyle;

  // social links (optional)
  twitter?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  telegram?: string;
  farcaster?: string;
  discord?: string;
  website?: string;

  badges: PlayerBadgeId[];
  tier: PlayerTier;

  stats: PlayerStats;

  createdAt: number;
};

export const DEFAULT_PLAYER_STATS: PlayerStats = {
  handsPlayed: 0,
  handsWon: 0,
  biggestPotWon: 0,
  totalProfit: 0,
  vpip: 0,
  pfr: 0,
  aggressionFactor: 0,
  blackjackHands: 0,
  baccaratWins: 0,
  slotsJackpots: 0,
  pokerRating: 1200,
};

export function computeInitials(nickname: string): string {
  const trimmed = nickname.trim();
  if (!trimmed) return "??";
  const parts = trimmed.split(/\s+/);
  const initials = parts.map((p) => p[0] ?? "").join("");
  return initials.slice(0, 3).toUpperCase();
}

export function inferTierFromRating(rating: number): PlayerTier {
  if (rating >= 2600) return "flame";
  if (rating >= 2200) return "diamond";
  if (rating >= 1800) return "gold";
  if (rating >= 1400) return "silver";
  return "bronze";
}

export function createDefaultPlayerProfile(id = "local-player"): PlayerProfile {
  const now = Date.now();
  return {
    id,
    nickname: "",
    avatarUrl: undefined,
    bannerUrl: undefined,
    avatarColor: "#facc15",
    avatarInitials: "??",
    bio: "",
    hometown: "",
    style: "balanced",
    twitter: undefined,
    instagram: undefined,
    tiktok: undefined,
    youtube: undefined,
    telegram: undefined,
    farcaster: undefined,
    discord: undefined,
    website: undefined,
    badges: ["og-gold-rush"],
    tier: "bronze",
    stats: { ...DEFAULT_PLAYER_STATS },
    createdAt: now,
  };
}
