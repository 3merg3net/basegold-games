// app/arcade/baccarat/page.tsx
'use client'

import BaccaratDemo from '@/components/casino/arcade/BaccaratDemo'

export default function BaccaratArcadePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Baccarat (Arcade Demo)
        </h1>
        <p className="text-sm text-white/70 max-w-xl">
          Free-play baccarat in the Base Gold Rush arcade. Use the same demo wallet that
          tracks your blackjack, roulette, and future arcade games.
        </p>
        <BaccaratDemo />
      </div>
    </main>
  )
}
