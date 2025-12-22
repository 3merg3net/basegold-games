// lib/chips/usePlayerChips.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlayerProfileContext } from "@/lib/player/PlayerProfileProvider";

export type ChipState = {
  balance_gld: number;
  reserved_gld: number;
  balance_pgld: number;
  reserved_pgld: number;
};

export function usePlayerChips() {
  const { profile } = usePlayerProfileContext();

  const [chips, setChips] = useState<ChipState>({
    balance_gld: 0,
    reserved_gld: 0,
    balance_pgld: 0,
    reserved_pgld: 0,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);

  const fetchChips = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
  `/api/chips/balance?playerId=${encodeURIComponent(profile.id)}`,
  { cache: "no-store" }
);



      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load chips: ${res.status}`);
      }

      const data = (await res.json()) as Partial<ChipState>;

      setChips({
        balance_gld: data.balance_gld ?? 0,
        reserved_gld: data.reserved_gld ?? 0,
        balance_pgld: data.balance_pgld ?? 0,
        reserved_pgld: data.reserved_pgld ?? 0,
      });
    } catch (err) {
      console.error("[usePlayerChips] error", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    void fetchChips();
  }, [fetchChips]);

  return {
    chips,
    loading,
    error,
    refresh: fetchChips,
  };
}
