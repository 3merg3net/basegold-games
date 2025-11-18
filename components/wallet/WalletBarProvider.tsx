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
  bgrcBalance: number | null;
  bgrcFormatted: string;
  isLoading: boolean;
};

const WalletBarContext = createContext<WalletBarContextValue | undefined>(
  undefined
);

export function WalletBarProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const BGRC = process.env.NEXT_PUBLIC_BGRC_CA as `0x${string}` | undefined;

  const {
    data: balRaw,
    isLoading: loadingBal,
  } = useContractRead({
    address: BGRC ?? zeroAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address ?? zeroAddress],
    enabled: Boolean(address && BGRC),
    watch: true,
  });

  const bgrcBalance = useMemo(() => {
    if (typeof balRaw !== 'bigint') return null;
    try {
      return Number(formatUnits(balRaw, 18)); // assume 18 decimals for BGRC
    } catch {
      return null;
    }
  }, [balRaw]);

  const bgrcFormatted =
    bgrcBalance == null
      ? '—'
      : bgrcBalance >= 1_000_000
      ? `${(bgrcBalance / 1_000_000).toFixed(1)}M`
      : bgrcBalance >= 1_000
      ? `${(bgrcBalance / 1_000).toFixed(1)}K`
      : bgrcBalance.toFixed(2);

  const value: WalletBarContextValue = {
    address,
    bgrcBalance,
    bgrcFormatted,
    isLoading: loadingBal,
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
