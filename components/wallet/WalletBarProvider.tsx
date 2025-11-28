'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
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
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

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
  undefined,
);

// simple formatter shared by all three
function formatShort(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

export function WalletBarProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();

  const BGLD = process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}` | undefined;
  const GLD  = process.env.NEXT_PUBLIC_GLD_CA  as `0x${string}` | undefined;
  const PGLD = process.env.NEXT_PUBLIC_PGLD_CA as `0x${string}` | undefined;

  // Helper hook for any ERC-20
  function useTokenBalance(contract: `0x${string}` | undefined) {
    const { data, isLoading } = useContractRead({
      address: contract ?? zeroAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address ?? zeroAddress],
      enabled: Boolean(address && contract),
      watch: true,
    });

    const balance = useMemo(() => {
      if (typeof data !== 'bigint') return null;
      try {
        // assuming 18 decimals for everything; adjust per token if needed later
        return Number(formatUnits(data, 18));
      } catch {
        return null;
      }
    }, [data]);

    return { balance, isLoading };
  }

  const { balance: bgldBalance, isLoading: loadingBgld } = useTokenBalance(BGLD);
  const { balance: gldBalance,  isLoading: loadingGld }  = useTokenBalance(GLD);
  const { balance: pgldBalance, isLoading: loadingPgld } = useTokenBalance(PGLD);

  const value: WalletBarContextValue = {
    address,
    bgldBalance,
    bgldFormatted: formatShort(bgldBalance),
    gldBalance,
    gldFormatted: formatShort(gldBalance),
    pgldBalance,
    pgldFormatted: formatShort(pgldBalance),
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
