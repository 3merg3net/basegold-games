// lib/player/PlayerProfileProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type ProfileVisibility = "public" | "private";

export type PlayerProfile = {
  id: string;

  // GCID core
  handle?: string;
  nickname?: string; // stored in DB column "name" (kept for backward compat)
  isProfileComplete?: boolean;

  // Avatar / presence
  avatarColor: string;
  avatarInitials: string;
  avatarUrl?: string;
  bio: string;

  // Social (optional)
  twitter?: string;
  telegram?: string;
  discord?: string;

  // Preferences / metadata
  degenRank?: "rookie" | "grinder" | "shark" | "whale" | "degen-god";
  favoriteGame?: string;
  preferredStake?: string;
  style: "tight" | "loose" | "aggro" | "balanced";

  // Progress
  reputation?: number;
  level?: number;
  xp?: number;
  wins?: number;
  losses?: number;

  // Privacy
  profileVisibility?: ProfileVisibility;
  showBalancesPublic?: boolean;

  // Optional soon
  walletAddress?: string;
  recoveryEmail?: string;

  // Timestamps (best-effort)
  createdAt?: string;
  updatedAt?: string;
  joinedAt?: string;
  lastSeenAt?: string | null;
};

const defaultProfile: PlayerProfile = {
  id: "",
  handle: "",
  nickname: "",
  isProfileComplete: false,
  avatarColor: "#facc15",
  avatarInitials: "??",
  avatarUrl: "",
  bio: "",
  twitter: "",
  telegram: "",
  discord: "",
  degenRank: "rookie",
  favoriteGame: "Poker",
  preferredStake: "Low",
  profileVisibility: "public",
  showBalancesPublic: false,
  reputation: 50,
  level: 1,
  xp: 0,
  wins: 0,
  losses: 0,
  style: "balanced",
};

type Ctx = {
  profile: PlayerProfile | null;
  updateProfile: (patch: Partial<PlayerProfile>) => Promise<void>;
  chips: number;
  setChips: (fn: (c: number) => number) => void;
  loading: boolean;
  error: unknown;
};

const PlayerProfileContext = createContext<Ctx | undefined>(undefined);

// Legacy key name kept for now to avoid breaking existing users/devices.
// You can migrate to "bgrc_player_id" later if you want.
const PLAYER_ID_KEY = "bgld_player_id";

// Legacy key name kept for now; it represents BGRC demo chips.
const DEMO_CHIPS_KEY = "bgld_demo_chips";

export function PlayerProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);

  const [chips, setChipsInner] = useState<number>(() => {
    if (typeof window === "undefined") return 5000;
    const raw = window.localStorage.getItem(DEMO_CHIPS_KEY);
    return raw ? Number(raw) || 5000 : 5000;
  });

  const setChips = (fn: (c: number) => number) => {
    setChipsInner((prev) => {
      const next = fn(prev);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DEMO_CHIPS_KEY, String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const init = async () => {
      setLoading(true);
      setError(null);

      try {
        let id = window.localStorage.getItem(PLAYER_ID_KEY);

        if (!id) {
          id = "player-" + Math.random().toString(36).slice(2, 10);
          window.localStorage.setItem(PLAYER_ID_KEY, id);
        }

        const { data, error: loadError } = await supabase
          .from("players")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (loadError) {
          console.error("[profile] load error", loadError);
          setError(loadError);
          setProfile({ ...defaultProfile, id });
          return;
        }

        if (!data) {
          const newProfile: PlayerProfile = { ...defaultProfile, id };

          const { error: insertError } = await supabase.from("players").insert({
            id,
            handle: null,
            name: "", // nickname (legacy)
            is_profile_complete: false,

            avatar_color: newProfile.avatarColor,
            avatar_initials: newProfile.avatarInitials,
            avatar_url: newProfile.avatarUrl,
            bio: "",

            twitter: "",
            telegram: "",
            discord: "",

            degen_rank: newProfile.degenRank,
            favorite_game: newProfile.favoriteGame,
            preferred_stake: newProfile.preferredStake,
            style: newProfile.style,

            reputation: newProfile.reputation,
            level: newProfile.level,
            xp: newProfile.xp,
            wins: newProfile.wins,
            losses: newProfile.losses,

            profile_visibility: newProfile.profileVisibility,
            show_balances_public: newProfile.showBalancesPublic,

            wallet_address: null,
            recovery_email: null,
          });

          if (insertError) {
            console.error("[profile] insert error", insertError);
            setError(insertError);
          }

          setProfile(newProfile);
          return;
        }

        const mapped: PlayerProfile = {
          id: data.id,

          handle: data.handle ?? "",
          nickname: data.name ?? "",
          isProfileComplete: Boolean(data.is_profile_complete),

          avatarColor: data.avatar_color ?? "#facc15",
          avatarInitials: data.avatar_initials ?? "??",
          avatarUrl: data.avatar_url ?? "",
          bio: data.bio ?? "",

          twitter: data.twitter ?? "",
          telegram: data.telegram ?? "",
          discord: data.discord ?? "",

          degenRank: (data.degen_rank as PlayerProfile["degenRank"]) ?? "rookie",
          favoriteGame: data.favorite_game ?? "Poker",
          preferredStake: data.preferred_stake ?? "Low",
          style: (data.style as PlayerProfile["style"]) ?? "balanced",

          reputation: data.reputation ?? 50,
          level: data.level ?? 1,
          xp: data.xp ?? 0,
          wins: data.wins ?? 0,
          losses: data.losses ?? 0,

          profileVisibility: (data.profile_visibility as ProfileVisibility) ?? "public",
          showBalancesPublic: Boolean(data.show_balances_public),

          walletAddress: data.wallet_address ?? "",
          recoveryEmail: data.recovery_email ?? "",

          createdAt: data.created_at ?? undefined,
          updatedAt: data.updated_at ?? undefined,
          joinedAt: data.joined_at ?? undefined,
          lastSeenAt: data.last_seen_at ?? null,
        };

        setProfile(mapped);
      } catch (err) {
        console.error("[profile] unexpected error", err);
        setError(err);
        setProfile({ ...defaultProfile, id: "unknown" });
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

  const updateProfile = async (patch: Partial<PlayerProfile>) => {
    if (!profile?.id) return;

    // optimistic local update
    const next: PlayerProfile = { ...profile, ...patch };
    setProfile(next);

    // Map camelCase → DB columns
    const payload: Record<string, any> = {};

    if (patch.handle !== undefined) payload.handle = patch.handle;
    if (patch.nickname !== undefined) payload.name = patch.nickname; // nickname stored in "name"
    if (patch.isProfileComplete !== undefined)
      payload.is_profile_complete = patch.isProfileComplete;

    if (patch.avatarColor !== undefined) payload.avatar_color = patch.avatarColor;
    if (patch.avatarInitials !== undefined) payload.avatar_initials = patch.avatarInitials;
    if (patch.avatarUrl !== undefined) payload.avatar_url = patch.avatarUrl;
    if (patch.bio !== undefined) payload.bio = patch.bio;

    if (patch.twitter !== undefined) payload.twitter = patch.twitter;
    if (patch.telegram !== undefined) payload.telegram = patch.telegram;
    if (patch.discord !== undefined) payload.discord = patch.discord;

    if (patch.degenRank !== undefined) payload.degen_rank = patch.degenRank;
    if (patch.favoriteGame !== undefined) payload.favorite_game = patch.favoriteGame;
    if (patch.preferredStake !== undefined) payload.preferred_stake = patch.preferredStake;
    if (patch.style !== undefined) payload.style = patch.style;

    if (patch.reputation !== undefined) payload.reputation = patch.reputation;
    if (patch.level !== undefined) payload.level = patch.level;
    if (patch.xp !== undefined) payload.xp = patch.xp;
    if (patch.wins !== undefined) payload.wins = patch.wins;
    if (patch.losses !== undefined) payload.losses = patch.losses;

    if (patch.profileVisibility !== undefined)
      payload.profile_visibility = patch.profileVisibility;
    if (patch.showBalancesPublic !== undefined)
      payload.show_balances_public = patch.showBalancesPublic;

    if (patch.walletAddress !== undefined) payload.wallet_address = patch.walletAddress;
    if (patch.recoveryEmail !== undefined) payload.recovery_email = patch.recoveryEmail;

    // Always bump updated_at (optional if you add a DB trigger later)
    payload.updated_at = new Date().toISOString();

    const { error: upErr } = await supabase
      .from("players")
      .update(payload)
      .eq("id", profile.id);

    if (upErr) {
      console.error("[profile] update error", upErr);
      setError(upErr);
      // revert local optimistic update (best-effort)
      setProfile(profile);
      throw upErr;
    }
  };

  const value: Ctx = {
    profile,
    updateProfile,
    chips,
    setChips,
    loading,
    error,
  };

  return (
    <PlayerProfileContext.Provider value={value}>
      {children}
    </PlayerProfileContext.Provider>
  );
}

export function usePlayerProfileContext() {
  const ctx = useContext(PlayerProfileContext);
  if (!ctx) throw new Error("usePlayerProfileContext must be used inside provider");
  return ctx;
}
