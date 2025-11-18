'use client'
import { useEffect, useMemo } from 'react'

type Props = {
  triggerKey: string | number | null  // change this to re-trigger
  durationMs?: number                 // default 1200
}

export default function ConfettiBurst({ triggerKey, durationMs = 1200 }: Props) {
  // create 60 particles with randomized paths
  const particles = useMemo(
    () => Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: (Math.random() * 2 - 1) * 120,        // spread in px
      y: (Math.random() * -1 - 0.2) * 160,     // up and out
      r: Math.random() * 5 + 4,                // radius
      rot: (Math.random() * 2 - 1) * 180,      // rotation
      d: 0.8 + Math.random() * 0.6,            // duration multiplier
    })),
    [triggerKey]
  )

  // force a reflow so animation restarts cleanly
  useEffect(() => {
    // nothing required—CSS keyframes handle per triggerKey re-mount
  }, [triggerKey])

  if (triggerKey == null) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {particles.map(p => (
        <span
          key={`${triggerKey}-${p.id}`}
          className="absolute rounded-sm"
          style={{
            left: '50%',
            top: '50%',
            width: p.r,
            height: p.r * 2,
            background:
              ['#FFD700', '#00E5FF', '#FF69B4', '#FFF3B0', '#B9FBC0'][p.id % 5],
            transform: 'translate(-50%, -50%)',
            animation: `confetti-pop ${durationMs * p.d}ms ease-out forwards`,
            // slight rotation variance
            rotate: `${p.rot}deg`,
            // custom properties for keyframes
            // @ts-ignore
            '--dx': `${p.x}px`,
            '--dy': `${p.y}px`,
          } as React.CSSProperties}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-pop {
          0%   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.9); }
        }
      `}</style>
    </div>
  )
}
