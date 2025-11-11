'use client'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import FaucetButton from '@/components/FaucetButton'

export default function WalletBar() {
  return (
    <div className="sticky top-0 z-50 w-full bg-black/60 backdrop-blur border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="font-extrabold tracking-widest text-[#FFD700]">BASE GOLD RUSH</div>
        <div className="flex items-center gap-3">
          <FaucetButton />
          <ConnectButton accountStatus="address" chainStatus="icon" showBalance />
        </div>
      </div>
    </div>
  )
}
