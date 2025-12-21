// components/casino/CashierPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { getDemoBalances, setDemoBalances } from "@/lib/demoChips";
import { IS_DEMO } from "@/config/env";

export type ChipKind = "gld" | "pgld";

type Props = {
  chip: ChipKind; // controlled by parent
  onChipChange?: (chip: ChipKind) => void; // optional if you want to show toggle inside panel later
};

export function CashierPanel({ chip }: Props) {
  const [gld, setGld] = useState(0);
  const [pgld, setPgld] = useState(0);

  useEffect(() => {
    const { gld, pgld } = getDemoBalances();
    setGld(gld);
    setPgld(pgld);
  }, []);

  const current = chip === "gld" ? gld : pgld;
  const label = chip === "gld" ? "GLD" : "PGLD";

  const write = (nextGld: number, nextPgld: number) => {
    setGld(nextGld);
    setPgld(nextPgld);
    setDemoBalances({ gld: nextGld, pgld: nextPgld });
  };

  const add = (amt: number) => {
    if (chip === "gld") write(gld + amt, pgld);
    else write(gld, pgld + amt);
  };

  const reset = () => {
    if (chip === "gld") write(0, pgld);
    else write(gld, 0);
  };

  return (
    <aside className="w-full md:w-80 lg:w-72 xl:w-80 shrink-0">
      <div className="rounded-2xl border border-yellow-500/40 bg-black/60 p-4 md:p-5 shadow-[0_0_40px_rgba(250,204,21,0.12)]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base md:text-lg font-semibold text-yellow-100">
            Cashier Window
          </h2>
          <span className="text-[10px] px-2 py-1 rounded-full border border-yellow-500/40 text-yellow-200 uppercase tracking-[0.12em]">
            {IS_DEMO ? "Demo" : "Live"}
          </span>
        </div>

        <p className="text-[11px] md:text-xs text-neutral-400 mb-3">
          {IS_DEMO ? (
            <>
              You&apos;re using{" "}
              <span className="font-semibold text-yellow-200">
                demo {label} chips
              </span>{" "}
              for early access testing.
            </>
          ) : (
            <>
              Load <span className="font-semibold text-yellow-200">GLD</span> for
              the casino floor and{" "}
              <span className="font-semibold text-yellow-200">PGLD</span> for live
              poker tables. Play responsibly.
            </>
          )}
        </p>

        <div className="bg-neutral-950/80 rounded-xl border border-yellow-500/25 px-4 py-3 mb-3 flex items-center justify-between">
          <div className="text-[11px] text-neutral-400">
            Current Chips
            <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              {label} Balance
            </div>
          </div>
          <div className="font-mono text-xl md:text-2xl text-yellow-300">
            {current.toLocaleString()}
          </div>
        </div>

        {IS_DEMO ? (
          <>
            <div className="flex gap-2 mb-3 text-[11px]">
              {[100, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => add(amt)}
                  className="flex-1 rounded-lg border border-yellow-500/40 py-1.5 hover:bg-yellow-500/10 transition"
                >
                  +{amt.toLocaleString()}
                </button>
              ))}
            </div>
            <button
              onClick={reset}
              className="w-full text-[11px] text-neutral-400 hover:text-neutral-200 underline underline-offset-2"
            >
              Reset {label} demo balance
            </button>
          </>
        ) : (
          <div className="space-y-2 text-[11px]">
            <button className="w-full rounded-lg border border-yellow-500/60 py-1.5 hover:bg-yellow-500/10 transition">
              Load chips (Cashier)
            </button>
            <button className="w-full rounded-lg border border-yellow-500/40 py-1.5 hover:bg-yellow-500/5 transition">
              Withdraw chips (Cashier)
            </button>
            <p className="text-[10px] text-neutral-500">
              Cashier actions will be clearly shown when live. Demo mode uses
              local balances for testing.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
