'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'

// ───────────────── TYPES ─────────────────

type NavItem = { href: string; label: string }

const staticItems: NavItem[] = [{ href: '/', label: 'Home' }]

// High-level sections instead of every game
const sectionItems: NavItem[] = [
  { href: '/arcade', label: 'Arcade' },
  { href: '/onchain', label: 'On-Chain Casino' },
  { href: '/live-tables', label: 'Live Tables (Soon)' },
]

// ───────────────── COMPONENT ─────────────────

export default function NavBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)          // mobile menu
  const [cashierOpen, setCashierOpen] = useState(false) // cashier modal

  const mobileBoxRef = useRef<HTMLDivElement>(null)

  // Close mobile + cashier on outside click / Esc
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      const insideMobile = mobileBoxRef.current?.contains(target)

      if (!insideMobile) {
        setOpen(false)
      }
    }

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setCashierOpen(false)
      }
    }

    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  const linkClass = (active: boolean) =>
    [
      'px-3 py-2 rounded-lg text-sm border transition-colors',
      active
        ? 'border-[#FFD700]/40 text-[#FFD700] bg-[#0f0f0f]'
        : 'border-white/15 text-white/80 hover:text-white hover:border-white/40 hover:bg-white/5',
    ].join(' ')

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const allDesktopLinks = [...staticItems, ...sectionItems]
  const allMobileLinks = allDesktopLinks

  return (
    <nav className="relative flex w-full items-center justify-between">
      {/* Desktop: simple inline links + cashier */}
      <div className="hidden md:flex items-center gap-3 relative">
        {allDesktopLinks.map(it => {
          const active = isActive(it.href)
          return (
            <Link key={it.href} href={it.href} className={linkClass(active)}>
              {it.label}
            </Link>
          )
        })}

        {/* Cashier button (desktop) */}
        <button
          onClick={() => setCashierOpen(true)}
          className="px-3 py-2 rounded-lg text-sm font-semibold border border-[#facc15]/40 text-[#facc15] bg-black/60 hover:bg-[#1f2937]"
        >
          Cashier (Soon)
        </button>
      </div>

      {/* Mobile hamburger */}
      <div ref={mobileBoxRef} className="md:hidden ml-auto relative">
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Menu"
          className="p-2 text-white"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[#FFD700]/30 bg-black z-[80] shadow-2xl overflow-hidden"
            role="menu"
            aria-label="Mobile navigation"
          >
            <div className="py-1 max-h-[80vh] overflow-y-auto">
              {allMobileLinks.map(it => {
                const active = isActive(it.href)
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    className={[
                      'block w-full px-4 py-3 text-sm font-semibold',
                      'text-[#FFD700] bg-black',
                      active ? 'bg-[#161616]' : 'hover:bg-[#0f0f0f]',
                    ].join(' ')}
                  >
                    {it.label}
                  </Link>
                )
              })}

              <button
                onClick={() => {
                  setOpen(false)
                  setCashierOpen(true)
                }}
                className="m-3 mt-4 w-[calc(100%-1.5rem)] rounded-lg border border-[#facc15]/40 px-3 py-2 text-sm font-semibold text-[#facc15] bg-black hover:bg-[#1f2937]"
              >
                Cashier Preview
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CASHIER MODAL (unchanged) */}
      {cashierOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#facc15]/40 bg-[#020617] shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden">
            <div className="relative h-40 w-full">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <img
                src="/images/cashier-preview-hero.png"
                alt="Base Gold Rush Cashier Preview"
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => setCashierOpen(false)}
                className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-black"
              >
                Close
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-white/80 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#facc15]/80">
                Coming Soon • Cashier Window
              </div>
              <div className="text-base font-semibold">
                Swap $BGLD ↔ Native $BGRC Chips at the Cage
              </div>
              <p className="text-[13px] text-white/70">
                This preview shows where you&apos;ll swap real{' '}
                <span className="font-semibold">$BGLD</span> tokens for playable{' '}
                <span className="font-semibold">BGRC chips</span> on Base mainnet.
                For now, everything on this site runs in{' '}
                <span className="font-semibold text-sky-300">demo / testnet</span>{' '}
                mode only.
              </p>
              <div className="flex items-center justify-between pt-2 text-[11px] text-white/55">
                <Link
                  href="/cashier-preview"
                  className="rounded-full border border-[#facc15]/60 bg-black/70 px-3 py-1.5 text-xs font-semibold text-[#facc15] hover:bg-[#111827]"
                  onClick={() => setCashierOpen(false)}
                >
                  View Full Cashier Preview →
                </Link>
                <span>Real-value play will not require KYC &amp; region checks.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
