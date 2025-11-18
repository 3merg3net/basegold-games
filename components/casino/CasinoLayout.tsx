'use client'

import React from 'react'

type Props = {
  children: React.ReactNode
}

/**
 * Shared chrome for all /play/* casino pages.
 * - Deep Vegas gradient background
 * - Soft glassy card for game content
 * - Leaves header/footer + wallet bar to layout.tsx
 */
export default function CasinoLayout({ children }: Props) {
  return (
    <div className="min-h-[calc(100vh-80px)] w-full bg-[radial-gradient(circle_at_top,_#1f2937_0,_#020617_55%,_#000000_100%)]">
      <div className="mx-auto max-w-6xl px-3 md:px-4 py-5 md:py-8">
        <div className="rounded-3xl border border-white/10 bg-black/60 shadow-[0_0_80px_rgba(0,0,0,0.85)] backdrop-blur-md p-3 md:p-5">
          {children}
        </div>
      </div>
    </div>
  )
}
