'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'

const BlackjackRoomArcade = dynamic<{ roomId: string }>(
  () => import('@/components/casino/blackjacklive'),
  { ssr: false }
)

export default function BlackjackRoomPageClient({ roomId }: { roomId: string }) {
  const sp = useSearchParams()
  const name = sp.get('name') ?? 'Big Nugget 21'
  const seats = sp.get('seats') ?? '7'
  const speed = sp.get('speed') ?? 'normal'
  const min = sp.get('min') ?? '50'
  const max = sp.get('max') ?? '500'

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/60 px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.65)]">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-white/90 truncate">{name}</div>
            <div className="text-[11px] text-white/55 font-mono truncate">{roomId}</div>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-white/70">
              {seats}-seat
            </span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-emerald-200/90">
              {speed === 'fast' ? 'Fast' : 'Normal'}
            </span>
            <span className="rounded-full border border-[#FFD700]/20 bg-black/60 px-3 py-1 text-[#FFD700]/85">
              {min}–{max}
            </span>
          </div>
        </div>
      </div>

      <BlackjackRoomArcade roomId={roomId} />
    </main>
  )
}
