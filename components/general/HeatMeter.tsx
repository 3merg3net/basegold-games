'use client'
import React from 'react'

/**
 * Visual “activity heat” that fills based on recent play events.
 * We listen for window events: `window.dispatchEvent(new CustomEvent('bgld:play'))`
 * Decays over time so it feels alive without a backend.
 */
export default function HeatMeter({
  label = 'Ridge Activity',
  decayPerSec = 0.08,   // how fast the meter empties
  bumpPerPlay = 0.22,   // how much a play bumps the meter
}: {
  label?: string
  decayPerSec?: number
  bumpPerPlay?: number
}) {
  const [level, setLevel] = React.useState(0) // 0..1

  React.useEffect(() => {
    const onPlay = () => setLevel(l => Math.min(1, l + bumpPerPlay))
    window.addEventListener('bgld:play', onPlay as EventListener)
    return () => window.removeEventListener('bgld:play', onPlay as EventListener)
  }, [bumpPerPlay])

  React.useEffect(() => {
    const id = setInterval(() => {
      setLevel(l => Math.max(0, l - decayPerSec * 0.25)) // tick @ 4Hz
    }, 250)
    return () => clearInterval(id)
  }, [decayPerSec])

  const pct = Math.round(level * 100)

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-white/70">{label}</div>
        <div className="text-sm text-white/60">{pct}%</div>
      </div>
      <div className="h-3 rounded-full bg-white/8 overflow-hidden border border-white/10">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg,#22d3ee 0%, #67e8f9 40%, #ffd700 70%, #f59e0b 100%)',
            boxShadow: '0 0 16px rgba(255,215,0,.45)',
          }}
        />
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-white/40">
        More plays → hotter ridge → juicier vibes
      </div>
    </div>
  )
}
