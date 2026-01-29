'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useNetwork } from 'wagmi';
import FaucetButton from '@/components/wallet/FaucetButton';

const NavBar = dynamic(() => import('@/components/general/NavBar'), { ssr: false });

export default function SiteHeader() {
  const { chain } = useNetwork();
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const chainId = chain?.id;
  const isBase = chainId === 8453;
  const isSepolia = chainId === 84532;

  const netLabel = !mounted
    ? 'Loading…'
    : isBase
    ? 'Base Mainnet'
    : isSepolia
    ? 'Base Sepolia'
    : chain
    ? chain.name ?? 'Wrong Network'
    : 'No Network';

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        {/* Left: logo + brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/felt/bgrc-logo.png"
              alt="Base Gold Rush"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-contain"
            />
            <span className="text-sm font-extrabold tracking-[0.3em] text-[#FFD700]">
              BGLD RUSH
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:block">
            <NavBar />
          </div>
        </div>

        {/* Right: network + wallet + mobile menu */}
        <div className="flex items-center gap-2 text-xs">
          <span className="hidden sm:inline-flex items-center rounded-full border border-white/20 bg-black/70 px-2 py-1 text-[10px] text-white/70">
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {netLabel}
          </span>

          {/* Faucet only when connected and on Sepolia */}
          {isSepolia && isConnected && <FaucetButton />}

          <ConnectButton chainStatus="icon" showBalance={false} />

          {/* Mobile menu button lives here */}
          <div className="md:hidden">
            <NavBar />
          </div>
        </div>
      </div>
    </header>
  );
}
