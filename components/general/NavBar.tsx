'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, MouseEvent } from 'react'
import { Menu, X } from 'lucide-react'

type NavItem = { href: string; label: string }

// Top-level sections
const staticItems: NavItem[] = [{ href: '/', label: 'Home' }]

// Floors
const sectionItems: NavItem[] = [
  { href: '/poker', label: 'Poker' },
  { href: '/blackjack-live', label: 'Blackjack' },
]

function NavLink(props: {
  href: string
  className?: string
  children: React.ReactNode
  onClick?: () => void
}) {
  const pathname = usePathname()
  const { href, className, children, onClick } = props

  const isPokerRoomDetail =
    pathname?.startsWith('/poker/') && pathname !== '/poker'

  if (isPokerRoomDetail) {
    return (
      <a href={href} className={className} onClick={onClick}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}

export default function NavBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)

  const mobileBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent | globalThis.MouseEvent) => {
      const target = e.target as Node
      const insideMobile = mobileBoxRef.current?.contains(target)
      if (!insideMobile) setOpen(false)
    }

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onClick as any)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick as any)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  const handleInvite = async () => {
    try {
      const base =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://casino.basereserve.gold'

      const url = `${base}/poker`
      const text =
        'Join me at BGLD Rush Live Tables — peer-to-peer poker on Base with real-time action. 🃏'

      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: 'Base Gold Rush Poker', text, url })
      } else if (
        typeof navigator !== 'undefined' &&
        (navigator as any).clipboard &&
        window.isSecureContext
      ) {
        await (navigator as any).clipboard.writeText(url)
        setInviteCopied(true)
        setTimeout(() => setInviteCopied(false), 2000)
      } else {
        alert(`Share this link with your friends:\n\n${url}`)
      }
    } catch (err) {
      console.error('Invite share failed', err)
    }
  }

  return (
    <nav className="relative flex w-full items-center justify-between">

      {/* Desktop nav */}
      <div className="hidden md:flex w-full items-center justify-between gap-4">

        {/* Left side */}
        <div className="flex items-center gap-4 min-w-0">

          {/* Home */}
          <div className="flex items-center gap-2">
            {staticItems.map((it) => (
              <NavLink
                key={it.href}
                href={it.href}
                className={[
                  'text-xs font-semibold tracking-wide uppercase transition-colors',
                  'text-white/60 hover:text-white',
                  isActive(it.href) ? 'text-[#FFD700]' : '',
                ].join(' ')}
              >
                {it.label}
              </NavLink>
            ))}

            <span className="h-4 w-px bg-white/15" />
          </div>

          {/* Game floors */}
          <div className="inline-flex items-center rounded-full border border-white/15 bg-black/60 px-1 py-0.5 shadow-[0_0_18px_rgba(0,0,0,0.7)]">

            {sectionItems.map((it) => {
              const active = isActive(it.href)

              return (
                <NavLink
                  key={it.href}
                  href={it.href}
                  className={[
  'px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap',
  'border transition-all duration-200 nav-shimmer',
                    active
  ? 'border-[#FFD700]/70 bg-[#FFD700]/90 text-black animate-gold-pulse'
                      : [
                          'border-transparent text-white/75',
                          'hover:text-white',
                          'hover:border-[#FACC15]/35',
                          'hover:bg-white/10',
                          'hover:shadow-[0_0_14px_rgba(250,204,21,0.15)]',
                        ].join(' '),
                  ].join(' ')}
                >
                  {it.label}
                </NavLink>
              )
            })}
          </div>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">

          <button
            onClick={handleInvite}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-emerald-400/40 text-emerald-200 bg-black/40 hover:bg-emerald-500/10 hover:border-emerald-300 transition-colors"
          >
            {inviteCopied ? 'Link Copied' : 'Invite'}
          </button>

          <NavLink
            href="/account"
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-transparent text-white/80 bg-black/50 hover:bg-white/10 hover:text-white hover:border-[#FACC15]/30 hover:shadow-[0_0_12px_rgba(250,204,21,0.15)] transition-all"
          >
            Account
          </NavLink>

          <NavLink
            href="/profile"
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-transparent text-white/60 bg-black/40 hover:bg-white/10 hover:text-white hover:border-[#FACC15]/25 transition-all"
          >
            Setup
          </NavLink>

          <NavLink
            href="/cashier"
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-[#facc15]/50 text-[#facc15] bg-black/50 hover:bg-[#1f2937] hover:border-[#facc15]/80 hover:shadow-[0_0_16px_rgba(250,204,21,0.25)] transition-all"
          >
            Cashier
          </NavLink>

        </div>
      </div>

      {/* Mobile nav */}
      <div ref={mobileBoxRef} className="md:hidden ml-auto relative">

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="p-2 text-white"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[#FFD700]/30 bg-black z-[80] shadow-2xl overflow-hidden"
          >
            <div className="max-h-[80vh] overflow-y-auto py-1 text-sm">

              {/* Main */}
              <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
                Main
              </div>

              {staticItems.map((it) => {
                const active = isActive(it.href)

                return (
                  <NavLink
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={[
                      'block w-full px-4 py-2.5 text-sm font-semibold',
                      active
                        ? 'bg-[#161616] text-[#FFD700]'
                        : 'bg-black text-white/80 hover:bg-[#0f0f0f]',
                    ].join(' ')}
                  >
                    {it.label}
                  </NavLink>
                )
              })}

              {/* Floors */}
              <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
                Floors
              </div>

              {sectionItems.map((it) => {
                const active = isActive(it.href)

                return (
                  <NavLink
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={[
                      'block w-full px-4 py-2.5 text-sm font-semibold',
                      active
                        ? 'bg-[#161616] text-[#FFD700]'
                        : 'bg-black text-white/80 hover:bg-[#0f0f0f]',
                    ].join(' ')}
                  >
                    {it.label}
                  </NavLink>
                )
              })}

              {/* Player */}
              <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
                Player
              </div>

              <NavLink
                href="/account"
                onClick={() => setOpen(false)}
                className="block w-full border-t border-white/10 bg-black px-4 py-2.5 text-sm font-semibold text-[#FFD700] hover:bg-[#0f0f0f]"
              >
                Account
              </NavLink>

              <NavLink
                href="/profile"
                onClick={() => setOpen(false)}
                className="block w-full bg-black px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-[#0f0f0f]"
              >
                Setup (Profile)
              </NavLink>

              {/* Share */}
              <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
                Share
              </div>

              <button
                onClick={async () => {
                  await handleInvite()
                  setOpen(false)
                }}
                className="m-3 mt-1 w-[calc(100%-1.5rem)] rounded-lg border border-emerald-400/60 px-3 py-2 text-sm font-semibold text-emerald-200 bg-black hover:bg-emerald-500/10"
              >
                {inviteCopied ? 'Invite link copied' : 'Invite friends to poker'}
              </button>

              {/* Cashier */}
              <div className="px-4 pt-1 pb-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
                Cashier
              </div>

              <NavLink
                href="/cashier"
                onClick={() => setOpen(false)}
                className="mx-3 mb-3 block w-[calc(100%-1.5rem)] rounded-lg border border-[#facc15]/40 px-3 py-2 text-sm font-semibold text-[#facc15] bg-black hover:bg-[#1f2937]"
              >
                Open Cashier →
              </NavLink>

            </div>
          </div>
        )}
      </div>
    </nav>
  )
}