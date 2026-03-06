// lib/chips/usePlayerChips.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    const CANON = "player-id";

    // migrate older key if it exists
    const legacy = window.localStorage.getItem("playerId");
    const canonExisting = window.localStorage.getItem(CANON);

    if (canonExisting && canonExisting.trim().length >= 3) {
      return canonExisting.trim();
    }

    if (legacy && legacy.trim().length >= 3) {
      const migrated = legacy.trim();
      window.localStorage.setItem(CANON, migrated);
      return migrated;
    }

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

export function usePlayerChips(forcedPlayerId?: string | null) {
  const { profile } = usePlayerProfileContext();

  const [chips, setChips] = useState<ChipState>({
    balance_gld: 0,
    reserved_gld: 0,
    balance_pgld: 0,
    reserved_pgld: 0,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);

  const activeRequestRef = useRef(0);

  const playerId = useMemo(() => {
    const forced = String(forcedPlayerId ?? "").trim();
    if (forced.length >= 3) return forced;

    const profileId = String(profile?.id ?? "").trim();
    if (profileId.length >= 3) return profileId;

    const local = getOrCreateLocalPlayerId();
    return local && local.length >= 3 ? local : "";
  }, [forcedPlayerId, profile?.id]);

  const fetchChips = useCallback(async () => {
    if (!playerId || playerId.length < 3) return;

    const reqId = ++activeRequestRef.current;

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

      if (reqId !== activeRequestRef.current) return;

      setChips({
        balance_gld: Number(data.balance_gld ?? 0),
        reserved_gld: Number(data.reserved_gld ?? 0),
        balance_pgld: Number(data.balance_pgld ?? 0),
        reserved_pgld: Number(data.reserved_pgld ?? 0),
      });
    } catch (err) {
      if (reqId !== activeRequestRef.current) return;
      console.error("[usePlayerChips] error", err);
      setError(err);
    } finally {
      if (reqId === activeRequestRef.current) {
        setLoading(false);
      }
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
    playerId,
  };
}