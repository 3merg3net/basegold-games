'use client'

import { usePathname } from 'next/navigation'
import { ArcadeWalletProvider } from '@/lib/useArcadeWallet'
import ChipBalanceBar from '@/components/casino/layout/ChipBalanceBar'



export default function ArcadeRootClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const showChipBar =
    pathname.startsWith('/arcade') ||
    pathname === '/poker-demo'

  return (
    <ArcadeWalletProvider>
      {showChipBar && (
        <div className="mx-auto max-w-6xl px-4 pt-3">
          <ChipBalanceBar />
        </div>
      )}
      {children}
    </ArcadeWalletProvider>
  )
}
