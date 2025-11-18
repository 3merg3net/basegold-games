'use client'
// components/legal/TestnetBanner.tsx
import { IS_DEMO } from "@/config/env";

export function TestnetBanner() {
  if (!IS_DEMO) return null;

  return (
    <div className="w-full bg-yellow-900/40 border-b border-yellow-600/40 text-center text-[11px] md:text-xs text-yellow-100 py-2 px-3">
      Base Gold Rush Casino BGRC is currently running in{" "}
      <span className="font-semibold">base sepolia demo mode</span>. No real $BGLD tokens are used in this environment. All chips and bets are
      for entertainment purposes only.
    </div>
  );
}
