'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {items.map(it => {
        const active = pathname === it.href
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onClick}
            className={[
              'px-3 py-2 rounded-lg text-sm border w-full text-center md:w-auto',
              active
                ? 'border-[#FFD700]/40 text-[#FFD700] bg-[#FFD700]/10'
                : 'border-white/10 text-white/70 hover:bg-white/5'
            ].join(' ')}
          >
            {it.label}
          </Link>
        )
      })}
    </>
  )

  return (
    <nav className="relative flex items-center justify-between w-full">
      {/* desktop */}
      <div className="hidden md:flex items-center gap-3">
        <NavLinks />
      </div>

      {/* mobile hamburger */}
      <div className="md:hidden flex items-center">
        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle Menu"
          className="p-2 text-white"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>

        {/* full-screen black overlay */}
        {open && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center space-y-6 text-lg">
            <button
              className="absolute top-5 right-5 text-white"
              onClick={() => setOpen(false)}
              aria-label="Close Menu"
            >
              <X size={28} />
            </button>
            <NavLinks onClick={() => setOpen(false)} />
          </div>
        )}
      </div>
    </nav>
  )
}
