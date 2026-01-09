"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePokerRoom } from "@/lib/pokerClient/usePokerRoom";

import TournamentCreateModal from "@/components/poker/tournaments/TournamentCreateModal";
import TournamentCard from "@/components/poker/tournaments/TournamentCard";
import TournamentDetailModal from "@/components/poker/tournaments/TournamentDetailModal";

function fmtChips(n: number) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  return v.toLocaleString();
}
function getOrCreateLocal(key: string, make: () => string) {
  if (typeof window === "undefined") return make();
  const existing = window.localStorage.getItem(key);
  if (existing && existing.trim()) return existing.trim();
  const v = make();
  window.localStorage.setItem(key, v);
  return v;
}

function makeId(prefix = "bgp") {
  try {
    // best
    // @ts-ignore
    const u = (crypto?.randomUUID?.() || "").slice(0, 10);
    if (u) return `${prefix}-${u}`;
  } catch {}
  // fallback
  return `${prefix}-${Math.random().toString(36).slice(2, 12)}`;
}


export default function TournamentsClient() {
  const router = useRouter();

  // keep same storage keys you used earlier
 function getStablePokerId() {
  if (typeof window === "undefined") return "player-pending";
  try {
    let id = window.localStorage.getItem("pgld-poker-player-id");
    if (!id) {
      const rand =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? ((crypto as any).randomUUID?.() || "").slice(0, 8)
          : Math.random().toString(36).slice(2, 10);
      id = `player-${rand}`;
      window.localStorage.setItem("pgld-poker-player-id", id);
    }
    return id;
  } catch {
    return `player-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function getStablePokerName() {
  if (typeof window === "undefined") return "Player";
  try {
    const n = (window.localStorage.getItem("pgld-poker-player-name") || "").trim();
    return n || "Player";
  } catch {
    return "Player";
  }
}

const playerId = getStablePokerId();
const playerName = getStablePokerName();





  // Keep a lobby WS open so server can push tournament-start-result to everyone
  const poker = usePokerRoom({
    roomId: "__lobby__",
    playerId,
    playerName,
  });

  const [openCreate, setOpenCreate] = useState(false);
  const [active, setActive] = useState<any | null>(null); // currently selected tournament

  // poll list every 2s (simple + reliable)
  useEffect(() => {
    poker.tournamentList();
    const t = setInterval(() => poker.tournamentList(), 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startMsg = useMemo(() => {
  const arr = Array.isArray((poker as any).messages) ? (poker as any).messages : [];
  // support multiple server naming styles
  const startTypes = new Set([
    "tournament-start-result",
    "tournament-started",
    "tournament-start",
  ]);
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    if (m && startTypes.has(String(m.type)) && m.ok && m.tournamentId && Array.isArray(m.assignments)) {
      return m;
    }
  }
  return (poker as any).lastTournamentStart || null;
}, [(poker as any).messages, (poker as any).lastTournamentStart]);

  // if we get a start event, route player to their assigned table
 useEffect(() => {
  const msg: any = startMsg;
  if (!msg?.ok || !msg?.tournamentId || !Array.isArray(msg.assignments)) return;

  const my = msg.assignments.find(
    (a: any) => Array.isArray(a.players) && a.players.includes(playerId)
  );
  if (!my?.tableRoomId) return;

  const name = encodeURIComponent(msg?.config?.tournamentName || "Tournament");
  router.push(
    `/poker/${my.tableRoomId}?mode=tournament&tournamentId=${msg.tournamentId}&name=${name}`
  );
}, [startMsg, playerId, router]);


  // Make list stable + inject cap if server doesn't send it
  const list = useMemo(() => {
    const arr = Array.isArray((poker as any).tournaments) ? (poker as any).tournaments : [];
    const normalized = arr
      .map((t: any) => {
        const seatsPerTable = Number(t.seatsPerTable ?? 9);
        const maxTables = Number(t.maxTables ?? 5);
        const cap =
          Number.isFinite(Number(t.cap)) && Number(t.cap) > 0
            ? Number(t.cap)
            : Math.max(1, maxTables) * Math.max(2, seatsPerTable);

        return {
          ...t,
          buyIn: Number(t.buyIn ?? 0),
          startingStack: Number(t.startingStack ?? 0),
          seatsPerTable,
          minPlayers: Number(t.minPlayers ?? 2),
          registeredCount: Number(t.registeredCount ?? 0),
          maxTables,
          cap,
          status: (t.status || "waiting") as "waiting" | "running" | "finished",
        };
      })
      .filter((t: any) => t.status !== "finished");

    // sort newest first
    normalized.sort((a: any, b: any) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));
    return normalized;
  }, [(poker as any).tournaments]);

  const activeLive = useMemo(() => {
    if (!active?.tournamentId) return null;
    return list.find((x: any) => x.tournamentId === active.tournamentId) || active;
  }, [active, list]);

  const isHost = Boolean(activeLive && String(activeLive.hostPlayerId) === String(playerId));

  async function handleCreate(args: {
    tournamentName?: string;
    buyIn: number;
    startingStack: number;
    seatsPerTable?: number;
    isPrivate?: boolean;
    minPlayers?: number;
    maxTables?: number;
  }) {
    // usePokerRoom already has tournamentCreate
    await (poker as any).tournamentCreate({
      playerId,
      tournamentName: (args.tournamentName || "BGLD Nightly").slice(0, 48),
      buyIn: Number(args.buyIn || 0),
      startingStack: Number(args.startingStack || 0),
      seatsPerTable: Number(args.seatsPerTable ?? 9),
      isPrivate: Boolean(args.isPrivate),
      minPlayers: Number(args.minPlayers ?? 6),
      maxTables: Number(args.maxTables ?? 5),
    });

    setOpenCreate(false);
    // quick refresh so it appears immediately
    window.setTimeout(() => (poker as any).tournamentList(), 250);
  }
  


  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[11px] text-white/50 font-mono">You: {playerName} • {playerId}</div>

            <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">
              Poker • Tournament Lobby
            </div>
            <div className="text-lg font-extrabold text-white/90 truncate">
              Tournament Registration Desk
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setOpenCreate(true)}
              className="rounded-full border border-emerald-400/20 bg-emerald-500/15 px-4 py-2 text-[12px] font-extrabold text-emerald-100 hover:bg-emerald-500/25"
            >
              + Create
            </button>

            <button
              type="button"
              onClick={() => (poker as any).tournamentList()}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-extrabold text-white/75 hover:bg-white/10"
            >
              Refresh
            </button>

            <Link
              href="/poker"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-extrabold text-white/75 hover:bg-white/10"
            >
              ← Cash
            </Link>
          </div>
        </div>
      </div>

      {/*  Hero / Desk */}
      <section className="mx-auto max-w-6xl px-4 pt-5">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-400/12 bg-black/55 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),transparent_55%)]" />
          <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">
                How it works
              </div>
              <div className="mt-1 text-sm text-white/75">
                Create an event → players register → when{" "}
                <span className="font-extrabold text-emerald-200">min players</span>{" "}
                reached the host starts →{" "}
                <span className="font-extrabold text-white">auto-seat & auto-route</span>.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
                Active events:{" "}
                <span className="font-mono text-white/90">{list.length}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
                Entry:{" "}
                <span className="font-mono text-white/90">BGLD chips</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-4">
        {list.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-black/50 p-5 text-[12px] text-white/70">
            No tournaments yet. Click{" "}
            <span className="font-extrabold text-emerald-200">+ Create</span>{" "}
            to post the first event.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t: any) => (
              <TournamentCard
                key={t.tournamentId}
                t={t}
                myPlayerId={playerId}
                onOpen={() => setActive(t)}
                onQuickJoin={() => {
                  (poker as any).tournamentJoin({
                    playerId,
                    tournamentId: t.tournamentId,
                    name: playerName,
                  });
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Detail modal */}
      <TournamentDetailModal
        open={!!activeLive}
        onClose={() => setActive(null)}
        t={activeLive}
        myPlayerId={playerId}
        isHost={isHost}
        onJoin={() =>
          activeLive?.tournamentId
            ? (poker as any).tournamentJoin({
                playerId,
                tournamentId: activeLive.tournamentId,
                name: playerName,
              })
            : undefined
        }
        onStart={() =>
          activeLive?.tournamentId
            ? (poker as any).tournamentStart({
                playerId,
                tournamentId: activeLive.tournamentId,
              })
            : undefined
        }
      />

      {/* Create modal */}
      <TournamentCreateModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreate={handleCreate}
      />
    </main>
  );
}
