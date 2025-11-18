// components/casino/CashierPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { getDemoBalances, setDemoBalances } from "@/lib/demoChips";
import { IS_DEMO } from "@/config/env";

export function CashierPanel() {
  const [chips, setChips] = useState(0);

  useEffect(() => {
    const { bgrc } = getDemoBalances();
    setChips(bgrc);
  }, []);

  const handleAddChips = (amount: number) => {
    const next = chips + amount;
    setChips(next);
    setDemoBalances({ bgrc: next });
  };

  const handleReset = () => {
    setChips(0);
    setDemoBalances({ bgrc: 0 });
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
                BGRC demo chips
              </span>{" "}
              on testnet. These have no real-world value and are for testing the
              Base Gold Rush experience only.
            </>
          ) : (
            <>
              BGRC chips represent in-casino credits backed by BGLD on Base
              mainnet. Play responsibly and never wager more than you can afford
              to lose.
            </>
          )}
        </p>

        <div className="bg-neutral-950/80 rounded-xl border border-yellow-500/25 px-4 py-3 mb-3 flex items-center justify-between">
          <div className="text-[11px] text-neutral-400">
            Current Chips
            <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              BGRC Balance
            </div>
          </div>
          <div className="font-mono text-xl md:text-2xl text-yellow-300">
            {chips.toLocaleString()}
          </div>
        </div>

        {IS_DEMO ? (
          <>
            <div className="flex gap-2 mb-3 text-[11px]">
              {[100, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleAddChips(amt)}
                  className="flex-1 rounded-lg border border-yellow-500/40 py-1.5 hover:bg-yellow-500/10 transition"
                >
                  +{amt.toLocaleString()}
                </button>
              ))}
            </div>
            <button
              onClick={handleReset}
              className="w-full text-[11px] text-neutral-400 hover:text-neutral-200 underline underline-offset-2"
            >
              Reset demo balance
            </button>
          </>
        ) : (
          <div className="space-y-2 text-[11px]">
            <button className="w-full rounded-lg border border-yellow-500/60 py-1.5 hover:bg-yellow-500/10 transition">
              Deposit BGLD → BGRC
            </button>
            <button className="w-full rounded-lg border border-yellow-500/40 py-1.5 hover:bg-yellow-500/5 transition">
              Cash Out BGRC → BGLD
            </button>
            <p className="text-[10px] text-neutral-500">
              Actual on-chain deposits and withdrawals will be processed via
              smart contracts on Base mainnet.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
