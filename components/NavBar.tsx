'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

const items = [
  { href: '/', label: 'Home' },
  { href: '/play/pan', label: 'Pan' },           // ← ensure this path matches your page
  { href: '/play/mine', label: 'Mine' },
  { href: '/play/slots', label: 'Slots' },
  { href: '/video-poker', label: 'Video Poker' },
  { href: '/poker', label: 'Poker Room' },
]

export default function NavBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // lock scroll when menu is open
  useEffect(() => {
    if (open) document.body.classList.add('overflow-hidden')
    else document.body.classList.remove('overflow-hidden')
    return () => document.body.classList.remove('overflow-hidden')
  }, [open])

  const linkClass = (active: boolean) =>
    [
      'px-3 py-2 rounded-lg text-sm border transition-colors',
      active
        ? 'border-[#FFD700]/60 text-[#FFD700] bg-[#1a1a1a]'
        : 'border-white/15 text-white hover:text-white hover:border-white/40',
    ].join(' ')

  return (
    <nav className="relative flex items-center justify-between w-full">
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-3">
        {items.map((it) => {
          const active = pathname === it.href
          return (
            <Link key={it.href} href={it.href} className={linkClass(active)}>
              {it.label}
            </Link>
          )
        })}
      </div>

      {/* Mobile toggle */}
      <div className="md:hidden flex items-center">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 text-white"
        >
          <Menu size={26} />
        </button>

        {open && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[80] bg-black text-white"
          >
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="font-semibold tracking-wider text-[#FFD700]">MENU</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="p-2"
              >
                <X size={26} />
              </button>
            </div>

            <div className="flex flex-col items-stretch gap-3 px-4 pt-20">
              {items.map((it) => {
                const active = pathname === it.href
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={[
                      'w-full text-base font-semibold rounded-lg px-4 py-3 border',
                      active
                        ? 'border-[#FFD700]/60 text-[#FFD700] bg-[#111]'
                        : 'border-white/20 text-white hover:border-white/50',
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
