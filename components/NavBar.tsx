'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/', label: 'Home' },
  { href: '/play/pan', label: 'Pan' },
  { href: '/play/mine', label: 'Mine' },
  { href: '/play/slots', label: 'Slots' },
  { href: '/video-poker', label: 'Video Poker' },
  { href: '/poker', label: 'Poker Room' },
]


export default function NavBar() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-3">
      {items.map(it => {
        const active = pathname === it.href
        return (
          <Link
            key={it.href}
            href={it.href}
            className={[
              'px-3 py-1.5 rounded-lg text-sm border',
              active
                ? 'border-[#FFD700]/40 text-[#FFD700] bg-[#FFD700]/10'
                : 'border-white/10 text-white/70 hover:bg-white/5'
            ].join(' ')}
          >
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}
