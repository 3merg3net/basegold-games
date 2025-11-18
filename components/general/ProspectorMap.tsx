'use client'
import Image from 'next/image'
import { useMemo } from 'react'

/**
 * Clickable parchment map overlay. Tiles are invisible hotspots to keep the vibe.
 * You can adjust COLS/ROWS to change density.
 */
export default function ProspectorMap({
  selected,
  onSelect,
}: {
  selected: number | null
  onSelect: (n: number) => void
}) {
  const COLS = 6
  const ROWS = 4
  const tiles = useMemo(() => Array.from({ length: COLS * ROWS }, (_, i) => i), [])

  return (
    <div className="mt-4">
      <div className="relative rounded-2xl overflow-hidden border border-yellow-400/20 bg-[#1a1510]">
        {/* Background parchment map */}
        <Image
          src="/images/prospector-map.png"
          alt="Prospectors' Ridge Survey"
          width={1600}
          height={1000}
          className="w-full h-auto opacity-95"
          priority={false}
        />

        {/* Hotspots grid */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          }}
        >
          {tiles.map((i) => (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={[
                'relative transition-all',
                'hover:bg-yellow-200/5 focus-visible:outline-none',
              ].join(' ')}
              aria-label={`Site ${i+1}`}
              title={`Site ${i+1}`}
            >
              {/* pin aura when selected */}
              {selected === i && (
                <span className="pointer-events-none absolute inset-3 rounded-xl border-2 border-yellow-400/50 shadow-[0_0_30px_rgba(255,215,0,0.45)_inset]" />
              )}
              {/* subtle pin dot */}
              <span className="pointer-events-none absolute right-3 bottom-3 h-2 w-2 rounded-full bg-yellow-400/80" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 text-xs text-white/50">
        Choose a spot on the survey map. (Sites are for flavor; the contract doesn’t read the tile yet.)
      </div>
    </div>
  )
}
