// components/wallet/WalletBar.tsx
'use client';

import { useEffect, useState } from 'react';
import { useNetwork } from 'wagmi';
import { useWalletBar } from './WalletBarProvider';

export default function WalletBar() {
  const { chain } = useNetwork();
  const {
    address,
    bgldFormatted,
    gldFormatted,
    pgldFormatted,
    isLoading,
  } = useWalletBar();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ───────────────── Skeleton: server + first client render ─────────────────
  // This MUST match exactly between SSR and the first client pass.
  if (!mounted) {
      // After mount: if not connected, don't show the big bar (avoids "2 connect buttons" feeling)
  if (!address) return null

    return (
      <div className="w-full rounded-full border border-white/15 bg-black/70 px-3 py-1.5 flex items-center gap-3 text-[11px] text-white/80">
        {/* Network pill (stable "Not connected") */}
        <span className="rounded-full px-2 py-0.5 text-[10px] border border-emerald-400/40 text-emerald-300 bg-emerald-400/10">
          Not connected
        </span>
        

        {/* Address placeholder */}
        <div className="flex-1 min-w-0">
          <span className="text-white/40">
            Connect wallet to track chips &amp; BGLD.
          </span>
        </div>

        {/* Balance placeholders */}
        <div className="flex items-center gap-2 text-[10px]">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-white/45 uppercase tracking-[0.18em]">
              BGLD
            </span>
            <span className="font-mono text-[#facc15]">…</span>
          </div>
          <div className="h-6 w-px bg-white/15" />
          <div className="flex flex-col items-end leading-tight">
            <span className="text-white/45 uppercase tracking-[0.18em]">
              GLD
            </span>
            <span className="font-mono text-white/70">…</span>
          </div>
          <div className="flex flex-col items-end leading-tight">
            <span className="text-white/45 uppercase tracking-[0.18em]">
              PGLD
            </span>
            <span className="font-mono text-white/70">…</span>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────── Live content: client after mount ─────────────────

  const isBaseMainnet = chain?.id === 8453;

  const networkLabel = !chain
    ? 'Not connected'
    : isBaseMainnet
    ? 'Base Mainnet'
    : 'Wrong Network';

  const networkClass =
    'rounded-full px-2 py-0.5 text-[10px] border ' +
    (isBaseMainnet
      ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10'
      : 'border-red-400/40 text-red-300 bg-red-400/10');

  const shortAddress =
    address && `${address.slice(0, 6)}…${address.slice(-4)}`;

  return (
    <div className="w-full rounded-full border border-white/15 bg-black/70 px-3 py-1.5 flex items-center gap-3 text-[11px] text-white/80">
      {/* Network pill */}
      <span className={networkClass}>{networkLabel}</span>

      {/* Address */}
      <div className="flex-1 min-w-0">
        {shortAddress ? (
          <span className="font-mono text-white/70 truncate">
            {shortAddress}
          </span>
        ) : (
          <span className="text-white/40">
            Connect wallet to track chips &amp; BGLD.
          </span>
        )}
      </div>

      {/* Balances */}
      <div className="flex items-center gap-2 text-[10px]">
        <div className="flex flex-col items-end leading-tight">
          <span className="text-white/45 uppercase tracking-[0.18em]">
            BGLD
          </span>
          <span className="font-mono text-[#facc15]">
            {isLoading ? '…' : bgldFormatted}
          </span>
        </div>
        <div className="h-6 w-px bg-white/15" />
        <div className="flex flex-col items-end leading-tight">
          <span className="text-white/45 uppercase tracking-[0.18em]">
            GLD
          </span>
          <span className="font-mono text-white/70">
            {isLoading ? '…' : gldFormatted}
          </span>
        </div>
        <div className="flex flex-col items-end leading-tight">
          <span className="text-white/45 uppercase tracking-[0.18em]">
            PGLD
          </span>
          <span className="font-mono text-white/70">
            {isLoading ? '…' : pgldFormatted}
          </span>
        </div>
      </div>
    </div>
  );
}
