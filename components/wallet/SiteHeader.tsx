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
    'rounded-full px-2 py-0.5 text-[11px] border ' +
    (isBase
      ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10'
      : isSepolia
      ? 'border-cyan-400/40 text-cyan-300 bg-cyan-400/10'
      : 'border-red-400/40 text-red-300 bg-red-400/10')

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/70 backdrop-blur-lg">
      <div
        className="
          mx-auto max-w-7xl
          flex items-center justify-between 
          px-4 py-3 gap-4
        "
      >
        {/* LEFT — LOGO */}
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-3 group"
        >
          <div className="relative h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
            <Image
              src="/images/base-logo-light.png"
              alt="Base Gold Rush"
              fill
              sizes="40px"
              className="rounded object-contain group-hover:scale-105 transition-transform"
              priority
            />
          </div>
          <span
            className="
              text-sm sm:text-base 
              font-extrabold tracking-[0.24em]
              text-[#FFD700]
              group-hover:text-white transition-colors
              uppercase
            "
          >
            BASE GOLD RUSH
          </span>
        </Link>

        {/* CENTER — NAV (desktop only) */}
        <div className="hidden md:flex flex-1 justify-center">
          <NavBar />
        </div>

        {/* RIGHT — WALLET + BADGE */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className={`${netClass} hidden md:inline`}>{netLabel}</span>

          <div className={mounted ? '' : 'opacity-40 pointer-events-none'}>
            <FaucetButton />
          </div>

          <ConnectButton
            accountStatus="address"
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </div>

      {/* Mobile Nav Row */}
      <div className="md:hidden px-4 pb-3">
        <NavBar />
      </div>
    </header>
  )
}
