'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'

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
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // close on outside click / Esc
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  const desktopLink = (active: boolean) =>
    [
      'px-3 py-2 rounded-lg text-sm border',
      active
        ? 'border-[#FFD700]/40 text-[#FFD700] bg-[#0f0f0f]'
        : 'border-white/15 text-white/80 hover:text-white hover:border-white/40 hover:bg-white/5',
    ].join(' ')

  return (
    <nav className="relative flex w-full items-center justify-between">
      {/* Desktop stays the same */}
      <div className="hidden md:flex items-center gap-3">
        {items.map(it => {
          const active = pathname === it.href
          return (
            <Link key={it.href} href={it.href} className={desktopLink(active)}>
              {it.label}
            </Link>
          )
        })}
      </div>

      {/* Mobile: right-corner hamburger + dropdown */}
      <div ref={boxRef} className="md:hidden ml-auto relative">
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Menu"
          className="p-2 text-white"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[#FFD700]/30 bg-black z-[80] shadow-2xl overflow-hidden"
            role="menu"
            aria-label="Mobile navigation"
          >
            <div className="py-1">
              {items.map(it => {
                const active = pathname === it.href
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    className={[
                      'block w-full px-4 py-3 text-sm font-semibold',
                      // GOLD TEXT, solid black background (no bleed)
                      'text-[#FFD700] bg-black',
                      active
                        ? 'bg-[#161616]'
                        : 'hover:bg-[#0f0f0f]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/50'
                    ].join(' ')}
                  >
                    {it.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
