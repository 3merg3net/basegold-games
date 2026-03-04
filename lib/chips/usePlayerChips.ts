// lib/chips/usePlayerChips.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlayerProfileContext } from "@/lib/player/PlayerProfileProvider";

export type ChipState = {
  balance_gld: number;
  reserved_gld: number;
  balance_pgld: number;
  reserved_pgld: number;
};

function getOrCreateLocalPlayerId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    // ✅ canonical key everywhere
    const CANON = "player-id";

    // ✅ migrate older key used by lobby
    const legacy = window.localStorage.getItem("playerId");
    const canonExisting = window.localStorage.getItem(CANON);

    if (canonExisting && canonExisting.trim().length >= 3) return canonExisting;

    if (legacy && legacy.trim().length >= 3) {
      window.localStorage.setItem(CANON, legacy.trim());
      return legacy.trim();
    }

    // create new
    const id =
      "p-" +
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? String((crypto as any).randomUUID()).slice(0, 12)
        : Math.random().toString(36).slice(2, 12));

    window.localStorage.setItem(CANON, id);
    return id;
  } catch {
    return null;
  }
}

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

  // ✅ stable player id:
  // - prefer authed profile id
  // - fallback to canonical local id (demo/dev)
  const playerId = useMemo(() => {
    const pid = String(profile?.id ?? "").trim();
    if (pid.length >= 3) return pid;

    const local = getOrCreateLocalPlayerId();
    return local && local.length >= 3 ? local : "";
  }, [profile?.id]);

  const fetchChips = useCallback(async () => {
    if (!playerId || playerId.length < 3) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/chips/balance?playerId=${encodeURIComponent(playerId)}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load chips: ${res.status}`);
      }

      const data = (await res.json()) as Partial<ChipState>;

      setChips({
        balance_gld: Number(data.balance_gld ?? 0),
        reserved_gld: Number(data.reserved_gld ?? 0),
        balance_pgld: Number(data.balance_pgld ?? 0),
        reserved_pgld: Number(data.reserved_pgld ?? 0),
      });
    } catch (err) {
      console.error("[usePlayerChips] error", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    void fetchChips();
  }, [fetchChips]);

  return {
    chips,
    loading,
    error,
    refresh: fetchChips,
    playerId, // ✅ exposes for debugging/UI if you want
  };
}