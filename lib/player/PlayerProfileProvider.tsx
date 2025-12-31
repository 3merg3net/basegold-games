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

  // legacy demo chips (keep for now)
  chips: number;
  setChips: (fn: (c: number) => number) => void;

  loading: boolean;
  error: unknown;
};

const DEFAULT_AVATARS = [
  "/avatars/av-1.png",
  "/avatars/av-2.png",
  "/avatars/av-3.png",
  "/avatars/av-4.png",
  "/avatars/av-5.png",
  "/avatars/av-6.png",
];

function pickDefaultAvatar(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DEFAULT_AVATARS[h % DEFAULT_AVATARS.length];
}

const PlayerProfileContext = createContext<Ctx | undefined>(undefined);

/**
 * ✅ Canonical ID key used across the app (poker + account + chips)
 */
const PLAYER_ID_KEY = "playerId";

/**
 * ✅ Legacy key kept for migration only (your old provider used this).
 * We’ll read it once and then write canonical key back so everything converges.
 */
const LEGACY_PLAYER_ID_KEY = "bgld_player_id";

/**
 * Legacy demo chips key (UI-only)
 */
const DEMO_CHIPS_KEY = "bgld_demo_chips";

function makeStablePlayerId() {
  const uid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);

  return `p_${uid.replace(/-/g, "")}`;
}

export function PlayerProfileProvider({ children }: { children: React.ReactNode }) {
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

      // 1) Resolve canonical id (migrate legacy key → canonical key)
      let id =
        window.localStorage.getItem(PLAYER_ID_KEY) ||
        window.localStorage.getItem(LEGACY_PLAYER_ID_KEY);

      if (!id) id = makeStablePlayerId();

      // write canonical + backfill legacy so any old code stops drifting
      window.localStorage.setItem(PLAYER_ID_KEY, id);
      window.localStorage.setItem(LEGACY_PLAYER_ID_KEY, id);

      // optional: make debugging easy
      (window as any).__profileId = id;

      try {
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

        // 2) Create player row if missing
        if (!data) {
          const newProfile: PlayerProfile = {
            ...defaultProfile,
            id,
            avatarUrl: pickDefaultAvatar(id),
          };

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

        // 3) Map DB → client shape
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

        // Ensure avatarUrl exists (one-time backfill)
        if (!mapped.avatarUrl) {
          const fallback = pickDefaultAvatar(id);
          mapped.avatarUrl = fallback;
          void supabase
            .from("players")
            .update({ avatar_url: fallback, updated_at: new Date().toISOString() })
            .eq("id", id);
        }

        setProfile(mapped);
      } catch (err) {
        console.error("[profile] unexpected error", err);
        setError(err);
        setProfile({ ...defaultProfile, id });
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

  const updateProfile = async (patch: Partial<PlayerProfile>) => {
    if (!profile?.id) return;

    // optimistic local update
    const prev = profile;
    const next: PlayerProfile = { ...profile, ...patch };
    setProfile(next);

    // Map camelCase → DB columns
    const payload: Record<string, any> = {};

    if (patch.handle !== undefined) payload.handle = patch.handle;
    if (patch.nickname !== undefined) payload.name = patch.nickname;
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

    payload.updated_at = new Date().toISOString();

    const { error: upErr } = await supabase.from("players").update(payload).eq("id", profile.id);

    if (upErr) {
      console.error("[profile] update error", upErr);
      setError(upErr);
      setProfile(prev); // revert optimistic update
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

  return <PlayerProfileContext.Provider value={value}>{children}</PlayerProfileContext.Provider>;
}

export function usePlayerProfileContext() {
  const ctx = useContext(PlayerProfileContext);
  if (!ctx) throw new Error("usePlayerProfileContext must be used inside provider");
  return ctx;
}
