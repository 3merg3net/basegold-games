'use client'

import { usePathname } from 'next/navigation'
import AgeGateOverlay from '@/components/legal/AgeGateOverlay'
import ProfileGateOverlay from '@/components/legal/ProfileGateOverlay'
import RiskBanner from '@/components/legal/RiskBanner'

export default function GlobalOverlays() {
  const pathname = usePathname() || '/'

  // Only show RiskBanner on home
  const showRiskBanner = pathname === '/'

  // Don’t gate poker routes (this was likely breaking sit/seat flow)
  const isPoker = pathname === '/poker' || pathname.startsWith('/poker/')

  // If you want profile gating only for cashier/arcade, keep it scoped.
  const needsProfileGate =
    !isPoker && (pathname.startsWith('/cashier') || pathname.startsWith('/arcade') || pathname.startsWith('/casino'))

  return (
    <>
      {/* Age gate can be global (but only ONCE) */}
      <AgeGateOverlay />

      {showRiskBanner && <RiskBanner />}

      {/* Profile gate only where you actually need it */}
      {needsProfileGate && <ProfileGateOverlay />}
    </>
  )
}
