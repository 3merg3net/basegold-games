// lib/player/PlayerProfileProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type PlayerProfile = {
  id: string;
  name: string;
  avatarColor: string;
  avatarInitials: string;
  avatarUrl?: string;
  bio: string;

  twitter?: string;
  telegram?: string;
  discord?: string;

  degenRank?: "rookie" | "grinder" | "shark" | "whale" | "degen-god";
  favGame?: string;
  reputation?: number;
  level?: number;
  xp?: number;
  wins?: number;
  losses?: number;
  style: "tight" | "loose" | "aggro" | "balanced";
  joinedAt: number;

  // optional wallet link fields you’re using in /profile (they’ll live in memory for now)
  walletAddress?: string;
  xHandle?: string;
  telegramHandle?: string;
};

const defaultProfile: PlayerProfile = {
  id: "",
  name: "",
  avatarColor: "#facc15",
  avatarInitials: "??",
  avatarUrl: "",
  bio: "",
  twitter: "",
  telegram: "",
  discord: "",
  degenRank: "rookie",
  favGame: "Poker",
  reputation: 50,
  level: 1,
  xp: 0,
  wins: 0,
  losses: 0,
  style: "balanced",
  joinedAt: Date.now(),
};

type Ctx = {
  profile: PlayerProfile | null;
  updateProfile: (patch: Partial<PlayerProfile>) => void;
  chips: number;
  setChips: (fn: (c: number) => number) => void;
  loading: boolean;
  error: unknown;
};

const PlayerProfileContext = createContext<Ctx | undefined>(undefined);

export function PlayerProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);

  const [chips, setChipsInner] = useState<number>(() => {
    if (typeof window === "undefined") return 5000;
    const raw = window.localStorage.getItem("bgld_demo_chips");
    return raw ? Number(raw) || 5000 : 5000;
  });

  const setChips = (fn: (c: number) => number) => {
    setChipsInner(prev => {
      const next = fn(prev);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("bgld_demo_chips", String(next));
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
        let id = window.localStorage.getItem("bgld_player_id");
        if (!id) {
          id = "player-" + Math.random().toString(36).slice(2, 10);
          window.localStorage.setItem("bgld_player_id", id);
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
            name: "",
            avatar_color: newProfile.avatarColor,
            avatar_initials: newProfile.avatarInitials,
            avatar_url: newProfile.avatarUrl,
            bio: "",
            twitter: "",
            telegram: "",
            discord: "",
            degen_rank: newProfile.degenRank,
            fav_game: newProfile.favGame,
            reputation: newProfile.reputation,
            level: newProfile.level,
            xp: newProfile.xp,
            wins: newProfile.wins,
            losses: newProfile.losses,
            style: newProfile.style,
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
          name: data.name ?? "",
          avatarColor: data.avatar_color ?? "#facc15",
          avatarInitials: data.avatar_initials ?? "??",
          avatarUrl: data.avatar_url ?? "",
          bio: data.bio ?? "",
          twitter: data.twitter ?? "",
          telegram: data.telegram ?? "",
          discord: data.discord ?? "",
          degenRank: (data.degen_rank as PlayerProfile["degenRank"]) ?? "rookie",
          favGame: data.fav_game ?? "Poker",
          reputation: data.reputation ?? 50,
          level: data.level ?? 1,
          xp: data.xp ?? 0,
          wins: data.wins ?? 0,
          losses: data.losses ?? 0,
          style: (data.style as PlayerProfile["style"]) ?? "balanced",
          joinedAt: Date.now(),
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

  const updateProfile = (patch: Partial<PlayerProfile>) => {
    setProfile(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };

      const {
        id,
        name,
        avatarColor,
        avatarInitials,
        avatarUrl,
        bio,
        twitter,
        telegram,
        discord,
        degenRank,
        favGame,
        reputation,
        level,
        xp,
        wins,
        losses,
        style,
      } = next;

      supabase
        .from("players")
        .update({
          name,
          avatar_color: avatarColor,
          avatar_initials: avatarInitials,
          avatar_url: avatarUrl,
          bio,
          twitter,
          telegram,
          discord,
          degen_rank: degenRank,
          fav_game: favGame,
          reputation,
          level,
          xp,
          wins,
          losses,
          style,
        })
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            console.error("[profile] update error", error);
            setError(error);
          }
        });

      return next;
    });
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
