// components/casino/layout/CasinoModeSwitcher.tsx
import Link from 'next/link'

type Mode = 'arcade' | 'onchain' | 'live'

export default function CasinoModeSwitcher({
  active,
  className = '',
}: {
  active: Mode
  className?: string
}) {
  const baseClasses =
    'flex-1 rounded-full px-3 py-1.5 text-[11px] sm:text-xs font-semibold border transition flex items-center justify-center gap-1'

  const modes: { key: Mode; label: string; href: string; emoji: string }[] = [
    { key: 'arcade', label: 'Demo Arcade', href: '/arcade', emoji: '🎡' },
    { key: 'onchain', label: 'On-Chain Casino', href: '/onchain', emoji: '🎰' },
    { key: 'live', label: 'Live Tables', href: '/live-tables', emoji: '🃏' },
  ]

  return (
    <div
      className={`mb-4 flex flex-col sm:flex-row gap-2 rounded-2xl border border-white/10 bg-black/70 p-2 ${className}`}
    >
      {modes.map(m => {
        const isActive = m.key === active
        return (
          <Link
            key={m.key}
            href={m.href}
            className={
              baseClasses +
              ' ' +
              (isActive
                ? 'border-[#FFD700]/80 bg-[#FFD700]/15 text-[#FFE58A] shadow-[0_0_18px_rgba(250,204,21,0.7)]'
                : 'border-white/15 bg-black/60 text-white/75 hover:bg-white/5')
            }
          >
            <span>{m.emoji}</span>
            <span>{m.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
