'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'

// ───────────────── TYPES ─────────────────

type NavItem = { href: string; label: string }

type GameCategory = {
  title: string
  items: NavItem[]
}

const staticItems: NavItem[] = [{ href: '/', label: 'Home' }]

// Grouped into On-Chain vs Demo Arcade
const onchainCategories: GameCategory[] = [
  {
    title: 'On-Chain • Quick Plays',
    items: [
      { href: '/play/coinflip', label: 'Coin Flip' },
      { href: '/play/dice', label: 'Dice' },
      { href: '/play/mine', label: 'Mine the Ridge' },
      { href: '/play/pan', label: 'Pan' },
      { href: '/play/jackpot-spin', label: 'Jackpot Spin' },
    ],
  },
  {
    title: 'On-Chain • Tables & Slots',
    items: [
      { href: '/play/slots-v2', label: 'Gold Rush Slots' },
      { href: '/play/blackjack', label: 'Blackjack' },
      { href: '/play/hilo', label: 'Hi-Lo' },
      { href: '/play/roulette', label: 'Roulette' },
      { href: '/video-poker', label: 'Video Poker' },
      { href: '/play/war', label: 'War' },
    ],
  },
]

const arcadeCategories: GameCategory[] = [
  {
    title: 'Demo Arcade • Tables',
    items: [
      { href: '/arcade/blackjack', label: 'Blackjack (Arcade)' },
      { href: '/arcade/baccarat', label: 'Baccarat (Arcade)' },
      { href: '/arcade/craps', label: 'Craps (Arcade)' },
      { href: '/arcade/war', label: 'War (Arcade)' },
      { href: '/arcade/three-card-poker', label: 'Three Card Poker' },
      { href: '/poker-demo', label: 'Poker Room (Arcade)' },
    ],
  },
  {
    title: 'Demo Arcade • Machines',
    items: [
      { href: '/arcade/slots-arcade', label: 'Slots (Arcade)' },
      { href: '/arcade/roulette', label: 'Roulette (Arcade)' },
      { href: '/arcade/video-poker', label: 'Video Poker (Arcade)' },
    ],
  },
]

// ───────────────── COMPONENT ─────────────────

export default function NavBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false) // mobile menu
  const [casinoOpen, setCasinoOpen] = useState(false) // desktop dropdown
  const [cashierOpen, setCashierOpen] = useState(false) // cashier modal

  const mobileBoxRef = useRef<HTMLDivElement>(null)
  const desktopDropRef = useRef<HTMLDivElement>(null)

  // close menus on outside click / Esc
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      const insideMobile = mobileBoxRef.current?.contains(target)
      const insideDesktop = desktopDropRef.current?.contains(target)

      if (!insideMobile && !insideDesktop) {
        setOpen(false)
        setCasinoOpen(false)
      }
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setCasinoOpen(false)
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

  const desktopGamesActive =
    pathname.startsWith('/play') ||
    pathname.startsWith('/arcade') ||
    pathname === '/video-poker' ||
    pathname === '/poker-demo'

  return (
    <nav className="relative flex w-full items-center justify-between">
      {/* Desktop: inline links + dropdown + cashier */}
      <div className="hidden md:flex items-center gap-3 relative">
        {staticItems.map(it => {
          const active = pathname === it.href
          return (
            <Link key={it.href} href={it.href} className={linkClass(active)}>
              {it.label}
            </Link>
          )
        })}

        {/* Games dropdown (desktop) */}
        <div className="relative" ref={desktopDropRef}>
          <button
            onClick={() => setCasinoOpen(v => !v)}
            className={linkClass(desktopGamesActive) + ' flex items-center gap-1'}
            aria-haspopup="menu"
            aria-expanded={casinoOpen}
          >
            Games
            <ChevronDown
              size={16}
              className={`transition-transform ${casinoOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {casinoOpen && (
            <div className="absolute left-0 mt-2 w-[420px] rounded-xl border border-[#FFD700]/30 bg-black shadow-2xl z-50">
              <div className="py-2 max-h-[70vh] overflow-y-auto grid grid-cols-2 gap-x-1">
                {/* Left: On-chain casino (desktop unchanged) */}
                <div className="border-r border-white/10">
                  <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FFD700]/70">
                    On-Chain Casino
                  </div>
                  {onchainCategories.map(cat => (
                    <div key={cat.title} className="px-2 py-1">
                      <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                        {cat.title}
                      </div>
                      {cat.items.map(g => (
                        <Link
                          key={g.href}
                          href={g.href}
                          onClick={() => setCasinoOpen(false)}
                          className={[
                            'block rounded-lg px-3 py-1.5 text-sm font-semibold text-[#FFD700]',
                            pathname === g.href ? 'bg-[#161616]' : 'hover:bg-[#0f0f0f]',
                          ].join(' ')}
                        >
                          {g.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Right: Demo arcade (desktop unchanged) */}
                <div>
                  <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
                    Demo Arcade
                  </div>
                  {arcadeCategories.map(cat => (
                    <div key={cat.title} className="px-2 py-1">
                      <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                        {cat.title}
                      </div>
                      {cat.items.map(g => (
                        <Link
                          key={g.href}
                          href={g.href}
                          onClick={() => setCasinoOpen(false)}
                          className={[
                            'block rounded-lg px-3 py-1.5 text-sm font-semibold text-emerald-200',
                            pathname === g.href ? 'bg-[#052e16]' : 'hover:bg-[#022c22]',
                          ].join(' ')}
                        >
                          {g.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cashier Preview button (desktop) */}
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
              {/* Home link */}
              {staticItems.map(it => {
                const active = pathname === it.href
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

              {/* 🔼 Arcade FIRST on mobile */}
              <div className="border-t border-[#FFD700]/20 mt-1 pt-1">
                <div className="px-4 pt-2 pb-1 text-emerald-300/90 text-[11px] uppercase tracking-wider">
                  Demo Arcade
                </div>
                {arcadeCategories.flatMap(cat => cat.items).map(it => {
                  const active = pathname === it.href
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setOpen(false)}
                      role="menuitem"
                      className={[
                        'block w-full px-4 py-2.5 text-sm font-semibold',
                        'text-emerald-200 bg-black',
                        active ? 'bg-[#052e16]' : 'hover:bg-[#022c22]',
                      ].join(' ')}
                    >
                      {it.label}
                    </Link>
                  )
                })}

                <div className="px-4 pt-3 pb-1 text-[#FFD700]/80 text-[11px] uppercase tracking-wider">
                  On-Chain Casino
                </div>
                {onchainCategories.flatMap(cat => cat.items).map(it => {
                  const active = pathname === it.href
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setOpen(false)}
                      role="menuitem"
                      className={[
                        'block w-full px-4 py-2.5 text-sm font-semibold',
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
          </div>
        )}
      </div>

      {/* CASHIER MODAL */}
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
