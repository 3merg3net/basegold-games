'use client'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Image from 'next/image'

export default function WalletConnectButton() {
  return (
    <div className="flex flex-col items-end gap-1">
      <ConnectButton />
      <div className="flex items-center gap-2">
        <Image src="/images/phantom.png" alt="Phantom" width={14} height={14} />
        <p className="text-[11px] text-white/60">
          Using <span className="text-white">Phantom</span>? Choose <span className="text-[#FFD700] font-semibold">WalletConnect</span>.
        </p>
      </div>
    </div>
  )
}
