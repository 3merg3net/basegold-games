'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'

// ───────────── TYPES & NAV CONFIG ─────────────

type NavItem = { href: string; label: string }

const staticItems: NavItem[] = [{ href: '/', label: 'Home' }]

const sectionItems: NavItem[] = [
  { href: '/arcade', label: 'Casino' },
  { href: '/onchain', label: 'On-Chain Casino' },
  { href: '/live-tables', label: 'Tables' },
]

// ───────────── COMPONENT ─────────────

export default function NavBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [cashierOpen, setCashierOpen] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)

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

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  // ───────────── INVITE HANDLER ─────────────

  const handleInvite = async () => {
    try {
      const base =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://basereserve.gold'

      const url = `${base}/poker-demo`
      const text =
        'Join me at the Base Gold Rush Hold’em Poker Room – free play table, live coordinator, and Vegas vibes on Base. 🃏'

      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({
          title: 'Base Gold Rush Poker',
          text,
          url,
        })
      } else if (
        typeof navigator !== 'undefined' &&
        (navigator as any).clipboard &&
        window.isSecureContext
      ) {
        await (navigator as any).clipboard.writeText(url)
        setInviteCopied(true)
        setTimeout(() => setInviteCopied(false), 2000)
      } else {
        setInviteCopied(true)
        setTimeout(() => setInviteCopied(false), 2000)
        // eslint-disable-next-line no-alert
        alert(`Share this link with your friends:\n\n${url}`)
      }
    } catch (err) {
      console.error('Invite share failed', err)
    }
  }

  // ───────────── RENDER ─────────────

  return (
    <nav className="relative flex w-full items-center justify-between">
      {/* Desktop nav */}
      <div className="hidden md:flex w-full items-center justify-between gap-4">
        {/* Left: Home + Floors */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Home link (lightweight) */}
          <div className="flex items-center gap-2">
            {staticItems.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={[
                  'text-xs font-semibold tracking-wide uppercase',
                  'text-white/60 hover:text-white',
                  isActive(it.href) ? 'text-[#FFD700]' : '',
                ].join(' ')}
              >
                {it.label}
              </Link>
            ))}

            <span className="h-4 w-px bg-white/15" />
          </div>

          {/* Casino floors segmented control */}
          <div className="inline-flex items-center rounded-full bg-black/60 border border-white/15 px-1 py-0.5 shadow-[0_0_18px_rgba(0,0,0,0.7)]">
            {sectionItems.map((it) => {
              const active = isActive(it.href)
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={[
                    'px-3 py-1 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap',
                    active
                      ? 'bg-[#FFD700]/90 text-black shadow-[0_0_14px_rgba(250,204,21,0.9)]'
                      : 'text-white/75 hover:bg-white/10 hover:text-white',
                  ].join(' ')}
                >
                  {it.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right: slim actions */}
        <div className="flex items-center gap-2">
          {/* Invite */}
          <button
            onClick={handleInvite}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-emerald-400/40 text-emerald-200 bg-black/40 hover:bg-emerald-500/10 hover:border-emerald-300 transition-colors"
          >
            {inviteCopied ? 'Link Copied' : 'Invite'}
          </button>

          {/* Profile */}
          <Link
            href="/profile"
            className={[
              'px-3 py-1.5 rounded-full text-[11px] font-semibold border',
              'border-white/25 text-white/80 bg-black/50 hover:bg-white/10 hover:text-white',
            ].join(' ')}
          >
            Profile
          </Link>

          {/* Cashier preview */}
          <button
            onClick={() => setCashierOpen(true)}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-[#facc15]/50 text-[#facc15] bg-black/50 hover:bg-[#1f2937]"
          >
            Cashier
          </button>
        </div>
      </div>

      {/* Mobile hamburger */}
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
            role="menu"
            aria-label="Mobile navigation"
          >
            <div className="py-1 max-h-[80vh] overflow-y-auto text-sm">
              {/* Home */}
              <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
                Main
              </div>
              {staticItems.map((it) => {
                const active = isActive(it.href)
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    className={[
                      'block w-full px-4 py-2.5 text-sm font-semibold',
                      active
                        ? 'bg-[#161616] text-[#FFD700]'
                        : 'bg-black text-white/80 hover:bg-[#0f0f0f]',
                    ].join(' ')}
                  >
                    {it.label}
                  </Link>
                )
              })}

              {/* Casino floors */}
              <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
                Casino Floors
              </div>
              {sectionItems.map((it) => {
                const active = isActive(it.href)
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    className={[
                      'block w-full px-4 py-2.5 text-sm font-semibold',
                      active
                        ? 'bg-[#161616] text-[#FFD700]'
                        : 'bg-black text-white/80 hover:bg-[#0f0f0f]',
                    ].join(' ')}
                  >
                    {it.label}
                  </Link>
                )
              })}

              {/* Profile */}
              <div className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
                Player
              </div>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="block w-full px-4 py-2.5 text-sm font-semibold text-[#FFD700] bg-black hover:bg-[#0f0f0f] border-t border-white/10"
              >
                Profile &amp; Avatar
              </Link>

              {/* Invite */}
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
                {inviteCopied
                  ? 'Invite link copied'
                  : 'Invite friends to poker room'}
              </button>

              {/* Cashier preview */}
              <div className="px-4 pt-1 pb-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
                Cashier
              </div>
              <button
                onClick={() => {
                  setOpen(false)
                  setCashierOpen(true)
                }}
                className="mx-3 mb-3 w-[calc(100%-1.5rem)] rounded-lg border border-[#facc15]/40 px-3 py-2 text-sm font-semibold text-[#facc15] bg-black hover:bg-[#1f2937]"
              >
                Cashier Preview
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CASHIER MODAL (unchanged behavior) */}
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
                <span className="font-semibold">BGRC chips</span> on Base
                mainnet. For now, everything on this site runs in{' '}
                <span className="font-semibold text-sky-300">
                  free play / testnet
                </span>{' '}
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
                <span>
                  Real-value play will require region checks / legal review.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
