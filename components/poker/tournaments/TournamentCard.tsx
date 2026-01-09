"use client";

type Props = {
  t: {
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

    // optional
    maxTables?: number;
    cap?: number;
    waitlistedCount?: number;

    // optional hint from listTournaments()
    ready?: boolean;
  };
  myPlayerId: string;
  onOpen: () => void;
  onQuickJoin: () => void;
};

function fmt(n: number) {
  const v = Math.max(0, Math.floor(Number(n || 0)));
  return v.toLocaleString();
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export default function TournamentCard({ t, myPlayerId, onOpen, onQuickJoin }: Props) {
  const isHost = t.hostPlayerId === myPlayerId;

  const min = Math.max(2, Number(t.minPlayers || 2));
  const reg = Math.max(0, Number(t.registeredCount || 0));

  const cap =
    Number.isFinite(Number(t.cap))
      ? Math.max(1, Number(t.cap))
      : Math.max(
          1,
          Math.max(1, Number(t.maxTables || 5)) * Math.max(2, Number(t.seatsPerTable || 9))
        );

  const waitlisted = Math.max(0, Number(t.waitlistedCount || 0));

  // fee breakdown (7%)
  const FEE_BPS = 700;
  const fee = Math.floor((Math.max(0, t.buyIn) * FEE_BPS) / 10_000);
  const prize = Math.max(0, Math.floor(t.buyIn) - fee);

  // progress
  const needs = Math.max(0, min - reg);
  const startPct = clamp01(reg / Math.max(1, min));
  const capPct = clamp01(reg / Math.max(1, cap));

  const isReady = Boolean(t.ready) || reg >= min || t.status === "ready";

  const statusLabel =
    t.status === "running"
      ? "RUNNING"
      : t.status === "finished"
      ? "COMPLETE"
      : t.status === "cancelled"
      ? "CANCELLED"
      : isReady
      ? "READY"
      : "REG OPEN";

  const statusChip =
    t.status === "running"
      ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-200"
      : t.status === "cancelled"
      ? "border-rose-300/25 bg-rose-500/10 text-rose-200"
      : t.status === "finished"
      ? "border-white/15 bg-white/5 text-white/70"
      : isReady
      ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-200"
      : "border-amber-300/25 bg-amber-500/10 text-amber-200";

  const rail =
    t.status === "running" || isReady
      ? "bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),transparent_55%)]"
      : t.status === "cancelled"
      ? "bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.14),transparent_55%)]"
      : "bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),transparent_55%)]";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={[
        "text-left rounded-3xl border border-white/10 bg-black/45 p-4",
        "hover:bg-black/60 hover:border-white/15 transition",
        "shadow-[0_12px_40px_rgba(0,0,0,0.65)] overflow-hidden relative",
      ].join(" ")}
    >
      <div className={["absolute inset-0 pointer-events-none", rail].join(" ")} />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/0 via-white/0 to-black/25" />

      {/* header */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">
            {t.isPrivate ? "Private Event" : "Open Event"}
            {isHost ? " • You host" : ""}
          </div>

          <div className="mt-1 text-base font-extrabold text-white truncate">{t.tournamentName}</div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
            <span className={["rounded-full border px-2 py-0.5 font-mono", statusChip].join(" ")}>
              {statusLabel}
            </span>

            <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 font-mono">
              {t.seatsPerTable}-max
            </span>

            <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 font-mono">
              Field {fmt(reg)}/{fmt(cap)}
            </span>

            {waitlisted > 0 && (
              <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 font-mono text-white/70">
                Waitlist {fmt(waitlisted)}
              </span>
            )}
          </div>

          {/* buy-in + breakdown */}
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <div className="text-lg font-extrabold text-white/95">
              {fmt(t.buyIn)} <span className="text-[11px] text-white/45">BGLD</span>
            </div>
            <div className="text-[11px] text-white/55">
              Prize {fmt(prize)} • Fee {fmt(fee)} <span className="text-white/45">(7%)</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 text-white/35 text-xl mt-1">›</div>
      </div>

      {/* registration strip */}
      <div className="relative mt-4 rounded-2xl border border-white/10 bg-black/35 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] text-white/65">
            <span className="font-extrabold text-white/85">Start gate:</span>{" "}
            <span className="font-mono">{fmt(reg)}</span>
            <span className="text-white/40"> / </span>
            <span className="font-mono">{fmt(min)}</span>
            <span className="text-white/45"> min</span>
          </div>

          <div className="text-[11px] text-white/55">
            {t.status === "waiting" || t.status === "ready" ? (
              needs > 0 ? (
                <span className="text-amber-200/90 font-bold">Needs {needs}</span>
              ) : (
                <span className="text-emerald-200/90 font-bold">Ready</span>
              )
            ) : t.status === "running" ? (
              <span className="text-emerald-200/90 font-bold">Tables assigned</span>
            ) : t.status === "cancelled" ? (
              <span className="text-rose-200/90 font-bold">Cancelled</span>
            ) : (
              <span className="text-white/55 font-bold">Complete</span>
            )}
          </div>
        </div>

        {/* progress to start */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/35">
            <span>To start</span>
            <span>{Math.round(startPct * 100)}%</span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={[
                "h-full rounded-full transition",
                t.status === "running" || isReady ? "bg-emerald-400/70" : "bg-amber-400/70",
              ].join(" ")}
              style={{ width: `${startPct * 100}%` }}
            />
          </div>
        </div>

        {/* field fill */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/35">
            <span>Field</span>
            <span>{Math.round(capPct * 100)}%</span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-white/20 transition" style={{ width: `${capPct * 100}%` }} />
          </div>
        </div>
      </div>

      {/* footer CTAs */}
      <div className="relative mt-3 flex items-center justify-between gap-2">
        <div className="text-[11px] text-white/45 font-mono truncate">{t.tournamentId}</div>

        <div className="flex items-center gap-2">
          {t.status === "waiting" && !isHost && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickJoin();
              }}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-extrabold text-white/85 hover:bg-white/10"
            >
              Register
            </button>
          )}

          <span className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-[12px] font-extrabold text-white/70">
            View
          </span>
        </div>
      </div>
    </button>
  );
}
