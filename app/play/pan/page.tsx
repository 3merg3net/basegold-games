'use client'

import PanGame from '@/components/PanGame'

export default function Page() {
  return (
    <main className="px-4 md:px-6 py-4">
      {/* Slim top banner — keeps space for wheel */}
      <div className="mb-4 rounded-xl border border-yellow-300/20 bg-yellow-200/5 px-4 py-3">
        <div className="text-sm md:text-base font-extrabold text-[#FFD700] tracking-wide">
          PAN FOR GOLD — ROULETTE MODE
        </div>
        <div className="mt-1 text-[12px] md:text-sm text-white/85">
          Pick an entry and <span className="font-semibold">Spin the Pan</span>. The pointer shows the hit.
          Bigger multipliers are rarer. Approve once, then spin freely.
        </div>
      </div>

      <PanGame />
    </main>
  )
}
