'use client'
import Link from 'next/link'
import LiveTicker from '../general/LiveTicker'

export default function FooterStrip() {
  return (
    <footer className="mt-12">
      <LiveTicker />
      <div className="bg-black/60 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-6 grid md:grid-cols-3 gap-4 text-sm">
          <div className="text-white/70">
            <div className="font-bold text-gold">Base Gold Rush</div>
            <div>Vegas × Old West on Base. Transparent, on-chain, community owned.</div>
          </div>
          <div className="flex gap-4 md:justify-center">
            <NavLink href="/jackpots" label="Jackpots" />
            <NavLink href="/leaderboard" label="Leaderboard" />
            <NavLink href="/shop" label="Shop" />
          </div>
          <div className="md:text-right flex md:justify-end gap-4">
            <NavLink href="/about" label="About" />
            <NavLink href="/contact" label="Contact" />
            <NavLink href="/terms" label="Terms" />
          </div>
        </div>
      </div>
    </footer>
  )
}

function NavLink({href, label}:{href:string; label:string}) {
  return (
    <Link href={href} className="text-white/70 hover:text-white">{label}</Link>
  )
}
