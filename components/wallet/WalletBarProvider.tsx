'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useAccount, useContractRead } from 'wagmi';
import { formatUnits, zeroAddress } from 'viem';

const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Sitewide wallet context:
 * - BGLD = main token
 * - GLD  = casino chips
 * - PGLD = poker chips
 */
type WalletBarContextValue = {
  address?: `0x${string}`;

  bgldBalance: number | null;
  bgldFormatted: string;

  gldBalance: number | null;
  gldFormatted: string;

  pgldBalance: number | null;
  pgldFormatted: string;

  isLoading: boolean;
};

const WalletBarContext = createContext<WalletBarContextValue | undefined>(
  undefined
);

// Helper: bigint → number with assumed 18 decimals
function toNumberFromRaw(raw: unknown, decimals = 18): number | null {
  if (typeof raw !== 'bigint') return null;
  try {
    return Number(formatUnits(raw, decimals));
  } catch {
    return null;
  }
}

// Helper: pretty short format (1.2K, 3.4M, 12.34, etc.)
function formatShort(value: number | null): string {
  if (value == null) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(2);
}

export function WalletBarProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();

  const BGLD = process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}` | undefined;
  const GLD  = process.env.NEXT_PUBLIC_GLD_CA  as `0x${string}` | undefined;
  const PGLD = process.env.NEXT_PUBLIC_PGLD_CA as `0x${string}` | undefined;

  // --- BGLD ---
  const {
    data: bgldRaw,
    isLoading: loadingBgld,
  } = useContractRead({
    address: BGLD ?? zeroAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address ?? zeroAddress],
    enabled: Boolean(address && BGLD),
    watch: true,
  });

  // --- GLD (casino chips) ---
  const {
    data: gldRaw,
    isLoading: loadingGld,
  } = useContractRead({
    address: GLD ?? zeroAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address ?? zeroAddress],
    enabled: Boolean(address && GLD),
    watch: true,
  });

  // --- PGLD (poker chips) ---
  const {
    data: pgldRaw,
    isLoading: loadingPgld,
  } = useContractRead({
    address: PGLD ?? zeroAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address ?? zeroAddress],
    enabled: Boolean(address && PGLD),
    watch: true,
  });

  // Convert + format (assuming 18 decimals for all three)
  const bgldBalance = useMemo(
    () => toNumberFromRaw(bgldRaw, 18),
    [bgldRaw]
  );
  const gldBalance = useMemo(
    () => toNumberFromRaw(gldRaw, 18),
    [gldRaw]
  );
  const pgldBalance = useMemo(
    () => toNumberFromRaw(pgldRaw, 18),
    [pgldRaw]
  );

  const bgldFormatted = formatShort(bgldBalance);
  const gldFormatted  = formatShort(gldBalance);
  const pgldFormatted = formatShort(pgldBalance);

  const value: WalletBarContextValue = {
    address,
    bgldBalance,
    bgldFormatted,
    gldBalance,
    gldFormatted,
    pgldBalance,
    pgldFormatted,
    isLoading: loadingBgld || loadingGld || loadingPgld,
  };

  return (
    <WalletBarContext.Provider value={value}>
      {children}
    </WalletBarContext.Provider>
  );
}

export function useWalletBar() {
  const ctx = useContext(WalletBarContext);
  if (!ctx) {
    throw new Error('useWalletBar must be used within WalletBarProvider');
  }
  return ctx;
}
