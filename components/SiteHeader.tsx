'use client'
import Link from 'next/link'
import Image from 'next/image'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import FaucetButton from '@/components/FaucetButton'
import NavBar from '@/components/NavBar'
import { useChainId } from 'wagmi'

export default function SiteHeader() {
  const chainId = useChainId()
  const isBase = chainId === 8453
  const isSepolia = chainId === 84532

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col md:flex-row md:items-center md:justify-between px-4 py-2 gap-3">
        {/* Logo + Brand */}
        <div className="flex items-center justify-between md:justify-start gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/goldrush-icon.png"
              alt="BGLD"
              width={28}
              height={28}
              className="rounded"
            />
            <span className="font-extrabold tracking-widest text-[#FFD700]">
              BASE GOLD RUSH
            </span>
          </Link>

          {/* Network badge (mobile visible) */}
          <span
            className={[
              'rounded-full px-2 py-0.5 text-[11px] border md:hidden',
              isBase
                ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10'
                : isSepolia
                ? 'border-cyan-400/40 text-cyan-300 bg-cyan-400/10'
                : 'border-red-400/40 text-red-300 bg-red-400/10',
            ].join(' ')}
          >
            {isBase ? 'Base' : isSepolia ? 'Base Sepolia' : 'Wrong Net'}
          </span>
        </div>

        {/* Central Nav */}
        <div className="flex-1 md:flex md:justify-center">
          <NavBar />
        </div>

        {/* Wallet + Faucet */}
        <div className="flex items-center justify-end gap-3">
          <span
            className={[
              'hidden md:inline rounded-full px-2 py-0.5 text-[11px] border',
              isBase
                ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10'
                : isSepolia
                ? 'border-cyan-400/40 text-cyan-300 bg-cyan-400/10'
                : 'border-red-400/40 text-red-300 bg-red-400/10',
            ].join(' ')}
          >
            {isBase ? 'Base' : isSepolia ? 'Base Sepolia' : 'Wrong Net'}
          </span>
          <FaucetButton />
          <ConnectButton accountStatus="address" chainStatus="icon" showBalance />
        </div>
      </div>
    </header>
  )
}
