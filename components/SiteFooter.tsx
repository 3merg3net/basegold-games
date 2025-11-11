'use client'
import Link from 'next/link'

const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as string | undefined
const BGLD   = process.env.NEXT_PUBLIC_BGLD_CA as string | undefined

export default function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-white/10 bg-black/50">
      <div className="mx-auto max-w-6xl px-4 py-8 grid gap-6 md:grid-cols-3">
        <div>
          <div className="font-extrabold tracking-widest text-[#FFD700]">BASE GOLD RUSH</div>
          <p className="mt-1 text-sm text-white/60">
            On-chain mini-casino on Base. Transparent odds, live jackpots, good vibes.
          </p>
        </div>

        <div>
          <div className="text-sm font-bold text-white/80">Explore</div>
          <ul className="mt-2 space-y-1 text-sm">
            <li><Link className="text-white/70 hover:text-white" href="/play/pan">Pan</Link></li>
            <li><Link className="text-white/70 hover:text-white" href="/play/mine">Mine</Link></li>
            <li><Link className="text-white/70 hover:text-white" href="/play/slots">Slots</Link></li>
            <li><Link className="text-white/70 hover:text-white" href="/play/poker">Poker</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-bold text-white/80">On-chain</div>
          <ul className="mt-2 space-y-1 text-sm">
            {CASINO && (
              <li>
                <a
                  className="text-white/70 hover:text-white"
                  href={`https://sepolia.basescan.org/address/${CASINO}`}
                  target="_blank" rel="noreferrer"
                >
                  Casino Contract
                </a>
              </li>
            )}
            {BGLD && (
              <li>
                <a
                  className="text-white/70 hover:text-white"
                  href={`https://sepolia.basescan.org/token/${BGLD}`}
                  target="_blank" rel="noreferrer"
                >
                  Mock BGLD Token
                </a>
              </li>
            )}
            <li className="pt-2 text-[12px] text-white/50">
              Test build for internal evaluation. Not financial advice. Play responsibly.
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-3 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Base Gold — All rights reserved.
      </div>
    </footer>
  )
}
