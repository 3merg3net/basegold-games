// lib/player/usePlayerProfile.ts
"use client";

import { useEffect, useState } from "react";
import {
  PlayerProfile,
  createDefaultPlayerProfile,
  computeInitials,
  inferTierFromRating,
} from "@/types/playerProfile";

const PROFILE_KEY = "bgld_profile_v2";
const CHIPS_KEY = "bgld_profile_chips_v2";

export function usePlayerProfile() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [chips, setChips] = useState<number>(10000); // demo bankroll

  // load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PlayerProfile;
        setProfile(parsed);
      } else {
        setProfile(createDefaultPlayerProfile());
      }
    } catch {
      setProfile(createDefaultPlayerProfile());
    }

    try {
      const rawChips = window.localStorage.getItem(CHIPS_KEY);
      if (rawChips && !Number.isNaN(Number(rawChips))) {
        setChips(Number(rawChips));
      }
    } catch {
      // ignore
    }
  }, []);

  // persist profile
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!profile) return;
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  // persist chips
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CHIPS_KEY, String(chips));
  }, [chips]);

  const updateProfile = (partial: Partial<PlayerProfile>) => {
    setProfile((prev) => {
      const base = prev ?? createDefaultPlayerProfile();
      let next: PlayerProfile = { ...base, ...partial };

      // keep initials in sync with nickname
      if (partial.nickname !== undefined) {
        const initials = computeInitials(partial.nickname);
        next = {
          ...next,
          avatarInitials: initials || base.avatarInitials,
        };
      }

      // derive tier from rating
      const rating = next.stats?.pokerRating ?? base.stats.pokerRating;
      next.tier = inferTierFromRating(rating);

      return next;
    });
  };

  const updateStats = (partial: Partial<PlayerProfile["stats"]>) => {
    setProfile((prev) => {
      const base = prev ?? createDefaultPlayerProfile();
      const stats = { ...base.stats, ...partial };
      return {
        ...base,
        stats,
        tier: inferTierFromRating(stats.pokerRating),
      };
    });
  };

  return {
    profile,
    setProfile,
    updateProfile,
    updateStats,
    chips,
    setChips,
  };
}
