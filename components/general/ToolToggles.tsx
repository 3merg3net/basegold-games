'use client'
import React from 'react'

export type Tool = 'pan' | 'shovel' | 'dynamite'

const TOOLS: { key: Tool; label: string; hint: string }[] = [
  { key: 'pan', label: 'Pan', hint: 'Steady hands, steady gains' },
  { key: 'shovel', label: 'Shovel', hint: 'Move dirt, find nuggets' },
  { key: 'dynamite', label: 'Dynamite', hint: 'Boom and bloom (visual only)' },
]

export default function ToolToggles({
  value,
  onChange,
}: {
  value: Tool
  onChange: (t: Tool) => void
}) {
  return (
    <div className="mt-4">
      <div className="text-sm text-white/70 mb-2">Tools</div>
      <div className="flex gap-2">
        {TOOLS.map(t => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={[
              'px-3 py-2 rounded-xl border text-sm font-semibold',
              value === t.key
                ? 'border-[#FFD700]/60 bg-[#FFD700]/12 text-[#FFD700]'
                : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/90',
            ].join(' ')}
            title={t.hint}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
