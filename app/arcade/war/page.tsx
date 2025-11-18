// app/arcade/war/page.tsx
'use client'

import WarDemo from '@/components/casino/arcade/WarDemo'

export default function WarArcadePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <WarDemo />
      </div>
    </main>
  )
}
