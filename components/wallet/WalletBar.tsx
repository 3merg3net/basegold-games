'use client';

import { useWalletBar } from './WalletBarProvider';
import { useNetwork } from 'wagmi';

function shortAddress(addr?: string) {
  if (!addr) return 'Not connected';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletBar() {
  const { address, bgrcFormatted, isLoading } = useWalletBar();
  const { chain } = useNetwork();

  return (
    <div className="w-full border-b border-white/10 bg-black/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-xs md:text-sm">
        {/* Left: Brand / Network */}
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-[#FFD700]/40 bg-black/60 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-[#FFD700]">
            BASE GOLD RUSH
          </div>
          <div className="hidden items-center gap-1 text-white/60 md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
            <span className="font-medium">
              {chain?.name ?? 'No network'}
            </span>
          </div>
        </div>

        {/* Right: Wallet / Chips */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-white/70">
            <span className="mr-1 text-[11px] uppercase tracking-wide text-white/40">
              Wallet
            </span>
            <span className="font-mono text-[11px] md:text-xs">
              {shortAddress(address)}
            </span>
          </div>

          <div className="rounded-full border border-[#FFD700]/40 bg-gradient-to-r from-[#1a1a1a] via-[#3b3008] to-[#8b6a07] px-3 py-1 text-[11px] md:text-xs font-semibold text-[#FFE9A3] shadow-[0_0_14px_rgba(0,0,0,0.7)]">
            <span className="mr-1 opacity-80">BGRC</span>
            <span className="font-mono">
              {isLoading ? '…' : bgrcFormatted}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
