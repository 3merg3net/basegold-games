// components/GameShell.tsx
'use client'

import React from 'react'

type GameShellProps = {
  title: string
  subtitle?: string
  /** Left side: main game visual / board */
  left: React.ReactNode
  /** Right side: controls, balance, outcome */
  right: React.ReactNode
}

export default function GameShell({ title, subtitle, left, right }: GameShellProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-white/70 max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      {/* Main responsive grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(320px,1.6fr)_minmax(280px,1fr)] items-start">
        <div className="space-y-3">{left}</div>
        <div className="space-y-3">{right}</div>
      </div>
    </div>
  )
}
