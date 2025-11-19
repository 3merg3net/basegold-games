'use client'
// components/legal/TestnetBanner.tsx
import { IS_DEMO } from "@/config/env";

export function TestnetBanner() {
  if (!IS_DEMO) return null;

  return (
    <div className="w-full bg-yellow-900/40 border-b border-yellow-600/40 text-center text-[11px] md:text-xs text-amber-100 py-2 px-3">
      Base Gold Rush Casino BGRC is currently running Arcade mode and{" "}
      <span className="font-semibold">base sepolia demo mode for all on-chain games</span> Base Mainnet will be live Soon. Stay tuned for Announcements.
    </div>
  );
}
