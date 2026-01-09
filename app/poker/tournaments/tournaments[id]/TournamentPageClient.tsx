"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { usePokerRoom } from "@/lib/pokerClient/usePokerRoom";

type ClientProps = {
  params: { id: string };
};

function safeName(v: string) {
  const s = (v || "").trim();
  if (!s) return "";
  return s.replace(/\s+/g, " ").slice(0, 48);
}

function getLocal(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export default function TournamentPageClient({ params }: ClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tournamentId = params.id;
  const incomingName = safeName(searchParams?.get("name") || "");
  const displayName = useMemo(() => incomingName || "Tournament", [incomingName]);

  const [playerId, setPlayerId] = useState("player-pending");
  const [playerName, setPlayerName] = useState("Player");

  useEffect(() => {
    // ✅ match your other pages
    const id = getLocal("pgld-poker-player-id", "player-demo");
    const name = getLocal("pgld-poker-player-name", "Player");
    setPlayerId(id);
    setPlayerName(name);
  }, []);

  // ✅ IMPORTANT: keep the WS on the coordinator lobby channel
  // (tournament messages are coordinator-level + routed by tournamentId)
  const poker = usePokerRoom({
    roomId: "__lobby__",
    playerId,
    playerName,
    tableName: "Tournament Lobby",
    isPrivate: false,
  });

  const { ready, messages } = poker;

  useEffect(() => {
    document.title = incomingName ? `${incomingName} • Tournament` : "Tournament";
  }, [incomingName]);

  // ---- derive join/start state from messages ----
  const joinRes = useMemo(() => {
    const arr = Array.isArray(messages) ? messages : [];
    for (let i = arr.length - 1; i >= 0; i--) {
      const m: any = arr[i];
      if (m?.type === "tournament-join-result" && String(m?.tournamentId) === String(tournamentId)) {
        return m;
      }
    }
    return null;
  }, [messages, tournamentId]);

  const startRes = useMemo(() => {
    const arr = Array.isArray(messages) ? messages : [];
    for (let i = arr.length - 1; i >= 0; i--) {
      const m: any = arr[i];
      if (m?.type === "tournament-start-result" && m?.ok && String(m?.tournamentId) === String(tournamentId)) {
        return m;
      }
    }
    return null;
  }, [messages, tournamentId]);

  // Prefer config snapshot if server provided it
  const cfg = (joinRes?.config || startRes?.config || null) as any;

  const status: "waiting" | "ready" | "running" | "finished" | "cancelled" = useMemo(() => {
    const s = String(cfg?.status || "waiting");
    if (s === "ready") return "ready";
    if (s === "running") return "running";
    if (s === "finished") return "finished";
    if (s === "cancelled") return "cancelled";
    return "waiting";
  }, [cfg?.status]);

  const registeredCount = Number(cfg?.registeredCount ?? joinRes?.registeredCount ?? 0);
  const minPlayers = Number(cfg?.minPlayers ?? 2);

  const isRegistered = Boolean(joinRes?.ok);
  const isHost = Boolean(cfg?.hostPlayerId && String(cfg.hostPlayerId) === String(playerId));

  // ✅ route when tournament starts (from the coordinator broadcast)
  useEffect(() => {
    const msg: any = startRes;
    if (!msg?.ok || !Array.isArray(msg.assignments)) return;

    const my = msg.assignments.find(
      (a: any) => Array.isArray(a.players) && a.players.includes(playerId)
    );
    if (!my?.tableRoomId) return;

    const name = encodeURIComponent(displayName);
    router.push(
      `/poker/${my.tableRoomId}?mode=tournament&tournamentId=${tournamentId}&name=${name}`
    );
  }, [startRes, tournamentId, playerId, router, displayName]);

  const register = useCallback(() => {
    if (!ready) return;
    (poker as any).tournamentJoin({
      playerId,
      tournamentId,
      name: playerName,
    });
  }, [ready, poker, playerId, tournamentId, playerName]);

  const start = useCallback(() => {
    if (!ready) return;
    (poker as any).tournamentStart({
      playerId,
      tournamentId,
    });
  }, [ready, poker, playerId, tournamentId]);

  const needs = Math.max(0, minPlayers - registeredCount);

  const statusPill =
    status === "running"
      ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-200"
      : status === "ready"
      ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-200"
      : status === "cancelled"
      ? "border-white/15 bg-white/5 text-white/70"
      : status === "finished"
      ? "border-white/15 bg-white/5 text-white/70"
      : "border-amber-300/25 bg-amber-500/10 text-amber-200";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="fixed left-3 top-[72px] z-[60]">
        <Link
          href="/poker/tournaments"
          className="rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white/75 hover:bg-white/10"
        >
          ← Tournaments
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-24 pb-28">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">
                Base Gold Poker • Tournament Lobby
              </div>
              <div className="mt-2 text-2xl font-extrabold text-white/90 truncate">
                {displayName}
              </div>
              <div className="mt-2 text-[11px] font-mono text-white/45">
                ID: {tournamentId}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-[11px] text-white/55">Status</div>
              <div className={["mt-1 rounded-full border px-3 py-1 text-[11px] font-extrabold", statusPill].join(" ")}>
                {status.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
                  Registration Desk
                </div>
                <div className="mt-1 text-sm text-white/70">
                  Register → wait → host starts → you’ll be routed to your table automatically.
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-white/55">Players</div>
                <div className="text-lg font-extrabold text-white tabular-nums">
                  {registeredCount} <span className="text-white/35">/</span> {minPlayers}
                </div>
              </div>
            </div>

            <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className={[
                  "h-full rounded-full transition",
                  status === "running" || status === "ready"
                    ? "bg-emerald-400/70"
                    : "bg-amber-400/70",
                ].join(" ")}
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((registeredCount / Math.max(1, minPlayers)) * 100)
                  )}%`,
                }}
              />
            </div>

            <div className="mt-2 text-[12px] text-white/70">
              {status === "running" ? (
                <span className="text-emerald-200 font-extrabold">Running — routing players…</span>
              ) : status === "ready" ? (
                <span className="text-emerald-200 font-extrabold">Ready — host can start.</span>
              ) : needs > 0 ? (
                <>
                  Waiting — needs{" "}
                  <span className="font-extrabold text-white">{needs}</span> more.
                </>
              ) : (
                <span className="text-emerald-200 font-extrabold">Ready — host can start.</span>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={!ready || status === "running" || status === "finished" || status === "cancelled" || isRegistered}
              onClick={register}
              className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/90 hover:bg-white/10 disabled:opacity-40"
            >
              {isRegistered ? "Registered" : "Register"}
            </button>

            {isHost && (
              <button
                type="button"
                disabled={!ready || (status !== "waiting" && status !== "ready") || needs > 0}
                onClick={start}
                className="flex-1 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-extrabold text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-40"
              >
                Start Tournament
              </button>
            )}
          </div>

          <div className="mt-3 text-xs text-white/45">
            Tip: keep this page open. When the host starts, you’ll be routed automatically.
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
              {ready ? "Connected" : "Connecting…"}
            </div>
            <div className="text-[12px] text-white/80 truncate">
              {isRegistered ? "Registered — waiting for host start" : "Not registered"}
            </div>
          </div>
          <div className="shrink-0 text-[12px] font-extrabold text-white/85 tabular-nums">
            {registeredCount}/{minPlayers}
          </div>
        </div>
      </div>
    </main>
  );
}
