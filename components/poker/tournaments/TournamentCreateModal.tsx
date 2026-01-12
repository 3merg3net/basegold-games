"use client";

import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (args: {
    tournamentName?: string;
    buyIn: number;
    startingStack: number;
    seatsPerTable?: number;
    isPrivate?: boolean;
    minPlayers?: number;
    maxTables?: number;
  }) => void | Promise<void>;
};

export default function TournamentCreateModal({ open, onClose, onCreate }: Props) {
  const [tournamentName, setTournamentName] = useState("BPC Nightly");
  const [buyIn, setBuyIn] = useState(10_000);
  const [startingStack, setStartingStack] = useState(20_000);
  const [seatsPerTable, setSeatsPerTable] = useState(9);
  const [minPlayers, setMinPlayers] = useState(6);
  const [maxTables, setMaxTables] = useState(5);
  const [isPrivate, setIsPrivate] = useState(false);

  const disabled = useMemo(() => {
    return !Number.isFinite(buyIn) || buyIn <= 0 || !Number.isFinite(startingStack) || startingStack <= 0;
  }, [buyIn, startingStack]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#05060a] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.75)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">Tournament Setup</div>
            <div className="text-xl font-extrabold text-white">Create Tournament</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-white/70 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Field label="Name">
            <input
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
              placeholder="Tournament name"
              maxLength={48}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Buy-in (chips)">
              <input
                type="number"
                value={buyIn}
                onChange={(e) => setBuyIn(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
              />
            </Field>

            <Field label="Starting Stack">
              <input
                type="number"
                value={startingStack}
                onChange={(e) => setStartingStack(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
              />
            </Field>

            <Field label="Seats / Table">
              <input
                type="number"
                value={seatsPerTable}
                onChange={(e) => setSeatsPerTable(Math.max(2, Math.min(9, Number(e.target.value) || 0)))}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
              />
            </Field>

            <Field label="Min Players to Start">
              <input
                type="number"
                value={minPlayers}
                onChange={(e) => setMinPlayers(Math.max(2, Math.min(45, Number(e.target.value) || 0)))}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
              />
            </Field>

            <Field label="Max Tables (cap 5)">
              <input
                type="number"
                value={maxTables}
                onChange={(e) => setMaxTables(Math.max(1, Math.min(5, Number(e.target.value) || 0)))}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
              />
            </Field>

            <Field label="Private">
              <button
                type="button"
                onClick={() => setIsPrivate((v) => !v)}
                className={[
                  "w-full rounded-xl border px-3 py-2 text-sm font-extrabold",
                  isPrivate
                    ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                    : "border-white/10 bg-white/5 text-white/70",
                ].join(" ")}
              >
                {isPrivate ? "ON" : "OFF"}
              </button>
            </Field>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={async () => {
              console.log("[ui] Create tournament clicked");
              try {
                await onCreate({
                  tournamentName,
                  buyIn,
                  startingStack,
                  seatsPerTable,
                  isPrivate,
                  minPlayers,
                  maxTables,
                });
              } catch (e) {
                console.error("[ui] onCreate error", e);
              }
            }}
            className={[
              "flex-1 rounded-2xl px-4 py-3 text-sm font-extrabold transition",
              disabled
                ? "border border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                : "border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20",
            ].join(" ")}
          >
            Create
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-white/70 hover:bg-white/10"
          >
            Cancel
          </button>
        </div>

        <div className="mt-3 text-xs text-white/40">
          Host starts the tournament when the minimum player count is reached.
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">{label}</div>
      {children}
    </div>
  );
}
