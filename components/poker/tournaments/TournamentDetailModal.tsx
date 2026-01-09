"use client";

type Tournament = {
  tournamentId: string;
  tournamentName: string;
  buyIn: number;
  startingStack: number;
  seatsPerTable: number;
  isPrivate: boolean;
  status: "waiting" | "ready" | "running" | "finished" | "cancelled";
  minPlayers: number;
  registeredCount: number;
  hostPlayerId: string;
  createdAt: number;

  // optional (nice if your server includes them later)
  cap?: number;
  waitlistedCount?: number;
  cancelReason?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  t: Tournament | null;
  myPlayerId: string;
  onJoin: () => void | Promise<void>;
  onStart: () => void | Promise<void>;
  isHost: boolean;
};

function fmt(n: number) {
  const v = Math.max(0, Math.floor(Number(n || 0)));
  return v.toLocaleString();
}

export default function TournamentDetailModal({
  open,
  onClose,
  t,
  myPlayerId,
  onJoin,
  onStart,
  isHost,
}: Props) {
  if (!open || !t) return null;

  const min = Math.max(2, Number(t.minPlayers || 2));
  const reg = Math.max(0, Number(t.registeredCount || 0));
  const needs = Math.max(0, min - reg);
  const pct = Math.min(100, Math.round((reg / Math.max(1, min)) * 100));

  // ✅ dev mode: allow start at 2. Change to `reg >= min` when done testing.
  const DEV_MIN_START = 2;
  const canStart =
    isHost &&
    (t.status === "waiting" || t.status === "ready") &&
    reg >= DEV_MIN_START;

  const statusLabel =
    t.status === "running"
      ? "RUNNING"
      : t.status === "finished"
      ? "COMPLETE"
      : t.status === "cancelled"
      ? "CANCELLED"
      : t.status === "ready"
      ? "READY"
      : "REG OPEN";

  const statusChip =
    t.status === "running"
      ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-200"
      : t.status === "cancelled"
      ? "border-rose-300/25 bg-rose-500/10 text-rose-200"
      : t.status === "finished"
      ? "border-white/15 bg-white/5 text-white/70"
      : t.status === "ready"
      ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-200"
      : "border-amber-300/25 bg-amber-500/10 text-amber-200";

  const heroGlow =
    t.status === "cancelled"
      ? "bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.14),transparent_55%)]"
      : "bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),transparent_55%)]";

  const progressBar =
    t.status === "running" || t.status === "ready"
      ? "bg-emerald-400/70"
      : t.status === "cancelled"
      ? "bg-rose-400/60"
      : "bg-amber-400/70";

  const joinEnabled =
    !isHost && (t.status === "waiting" || t.status === "ready");

  const showStartButton =
    isHost && (t.status === "waiting" || t.status === "ready");

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#05060a] shadow-[0_24px_80px_rgba(0,0,0,0.75)]">
        {/* header */}
        <div className="relative p-5 border-b border-white/10">
          <div className={["absolute inset-0 pointer-events-none", heroGlow].join(" ")} />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                Base Gold Poker • Tournament Lobby • {t.isPrivate ? "Private" : "Public"}
                {isHost ? " • Host" : ""}
              </div>

              <div className="mt-1 text-2xl font-extrabold text-white truncate">
                {t.tournamentName}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
                <span className={["rounded-full border px-2 py-0.5 font-mono", statusChip].join(" ")}>
                  {statusLabel}
                </span>

                <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 font-mono">
                  Buy-in {fmt(t.buyIn)}
                </span>

                <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 font-mono">
                  Stack {fmt(t.startingStack)}
                </span>

                <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 font-mono">
                  {t.seatsPerTable}-max
                </span>

                {typeof t.cap === "number" && t.cap > 0 ? (
  <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 font-mono">
    Field {fmt(reg)}/{t.cap.toLocaleString()}
  </span>
) : null}


                {Number(t.waitlistedCount) ? (
                  <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 font-mono text-white/70">
                    Waitlist {fmt(t.waitlistedCount || 0)}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 text-[11px] text-white/45 font-mono truncate">
                {t.tournamentId}
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-white/70 hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>

        {/* body */}
        <div className="p-5 space-y-4">
          {/* registration */}
          <div className="rounded-3xl border border-white/10 bg-black/35 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                  Registration
                </div>
                <div className="mt-1 text-sm text-white/70">
                  Players register → wait in lobby → host starts → auto-route to tables.
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] text-white/55">Registered</div>
                <div className="text-lg font-extrabold text-white tabular-nums">
                  {fmt(reg)} <span className="text-white/35">/</span> {fmt(min)}
                </div>
              </div>
            </div>

            <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div className={["h-full rounded-full transition", progressBar].join(" ")} style={{ width: `${pct}%` }} />
            </div>

            <div className="mt-2 text-[12px] text-white/70">
              {t.status === "cancelled" ? (
                <>
                  <span className="font-extrabold text-rose-200">Cancelled</span>
                  {t.cancelReason ? <span className="text-white/55"> — {t.cancelReason}</span> : null}
                </>
              ) : t.status === "finished" ? (
                <>
                  <span className="font-extrabold text-white/80">Complete</span> — event finished.
                </>
              ) : t.status === "running" ? (
                <>
                  <span className="font-extrabold text-emerald-200">Running</span> — tables assigned. You’ll route automatically.
                </>
              ) : needs > 0 ? (
                <>
                  <span className="font-extrabold text-amber-200">Waiting</span> — needs{" "}
                  <span className="font-extrabold text-white">{needs}</span> more to reach minimum.
                </>
              ) : (
                <>
                  <span className="font-extrabold text-emerald-200">Ready</span> — minimum reached. Host can start.
                </>
              )}
            </div>
          </div>

          {/* info grid */}
          <div className="grid grid-cols-2 gap-3">
            <Info label="Status" value={statusLabel} />
            <Info label="Visibility" value={t.isPrivate ? "PRIVATE" : "PUBLIC"} />
            <Info label="Buy-in" value={fmt(t.buyIn)} />
            <Info label="Starting Stack" value={fmt(t.startingStack)} />
            <Info label="Seats / Table" value={String(t.seatsPerTable)} />
            <Info label="Host" value={isHost ? "YOU" : "HOST"} />
          </div>

          {/* actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            {joinEnabled && (
              <button
                onClick={onJoin}
                className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/90 hover:bg-white/10"
              >
                Register
              </button>
            )}

            {showStartButton && (
              <button
                disabled={!canStart}
                onClick={onStart}
                className={[
                  "flex-1 rounded-2xl px-4 py-3 text-sm font-extrabold transition border",
                  canStart
                    ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20"
                    : "border-white/10 bg-white/5 text-white/40 cursor-not-allowed",
                ].join(" ")}
              >
                Start Tournament
              </button>
            )}

            <button
              onClick={onClose}
              className="sm:w-[160px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/70 hover:bg-white/10"
            >
              Done
            </button>
          </div>

          {/* host note */}
          {showStartButton && !canStart && (t.status === "waiting" || t.status === "ready") && (
            <div className="text-xs text-white/45">
              Host controls start. Waiting for{" "}
              <span className="font-extrabold text-white">{Math.max(0, DEV_MIN_START - reg)}</span>{" "}
              more player(s) in dev mode.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">{label}</div>
      <div className="mt-1 font-extrabold text-white">{value}</div>
    </div>
  );
}
