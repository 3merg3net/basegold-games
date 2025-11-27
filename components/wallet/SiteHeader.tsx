'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useNetwork } from 'wagmi'
import NavBar from '@/components/general/NavBar'
import FaucetButton from '@/components/wallet/FaucetButton'

export default function SiteHeader() {
  const { chain } = useNetwork()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const chainId = chain?.id
  const isBase = chainId === 8453
  const isSepolia = chainId === 84532

  const netLabel = mounted
    ? isBase
      ? 'Base Mainnet'
      : isSepolia
      ? 'Demo Mode'
      : 'Wrong Chain'
    : '–'

  const netClass =
    'rounded-full px-2.5 py-0.5 text-[10px] border ' +
    (isBase
      ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10'
      : isSepolia
      ? 'border-cyan-400/40 text-cyan-300 bg-cyan-400/10'
      : 'border-red-400/40 text-red-300 bg-red-400/10')

  return (
    <header className="md:sticky md:top-0 z-50 w-full border-b border-white/10 bg-black/75 backdrop-blur-lg">

      {/* MAIN HEADER ROW */}
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-2.5 gap-3">
        {/* LEFT — LOGO / BRAND */}
        <Link href="/" className="flex items-center gap-2 group min-w-0">
          <div className="relative h-8 w-8 flex-shrink-0">
            <Image
              src="/images/base-logo-light.png"
              alt="Base Gold Rush"
              fill
              sizes="32px"
              className="rounded object-contain group-hover:scale-105 transition-transform"
              priority
            />
          </div>
          <div className="flex flex-col leading-tight overflow-hidden">
            <span className="text-[11px] font-extrabold tracking-[0.28em] text-[#FFD700] group-hover:text-white transition-colors uppercase">
              BASE GOLD RUSH
            </span>
            <span className="text-[10px] text-white/45 truncate">
              Casino • Arcade • Live Poker
            </span>
          </div>
        </Link>

        {/* CENTER — NAV (desktop) */}
        <div className="hidden md:flex flex-1 justify-center px-2">
          <NavBar />
        </div>

        {/* RIGHT — NETWORK / FAUCET / WALLET */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className={`${netClass} hidden sm:inline`}>{netLabel}</span>

          <div className={mounted ? '' : 'opacity-40 pointer-events-none'}>
            {/* Only meaningful in demo / Sepolia flows; harmless elsewhere */}
            <FaucetButton />
          </div>

          <div className="flex-shrink-0">
            <ConnectButton
              accountStatus="address"
              chainStatus="icon"
              showBalance={false}
            />
          </div>
        </div>
      </div>

      {/* MOBILE NAV ROW */}
      <div className="md:hidden px-4 pb-2">
        <NavBar />
      </div>
    </header>
  )
}
