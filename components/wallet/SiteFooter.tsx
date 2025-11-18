'use client'

import Link from 'next/link'
import Image from 'next/image'

const CASINO  = process.env.NEXT_PUBLIC_CASINO_CA as string | undefined
const BGRC    = process.env.NEXT_PUBLIC_BGRC_CA as string | undefined
const CASHIER = process.env.NEXT_PUBLIC_CASHIER_CA as string | undefined

export default function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-white/10 bg-black/80">
      <div className="mx-auto max-w-6xl px-4 py-8 grid gap-6 md:grid-cols-3">

        {/* Brand Section with logo + chips */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative h-9 w-9 md:h-10 md:w-10">
              <Image
                src="/images/goldrush-icon-v2.png"
                alt="Base Gold Rush"
                fill
                className="rounded-md object-contain drop-shadow-[0_0_14px_rgba(250,204,21,0.7)]"
              />
            </div>
            <div>
              <div className="font-extrabold tracking-[0.28em] text-[#FFD700] uppercase text-[13px]">
                BASE GOLD RUSH
              </div>
              <div className="text-[10px] text-white/60 tracking-[0.18em] uppercase">
                Casino • Arcade • On-Chain
              </div>
            </div>
          </div>

          <p className="text-sm text-white/60 max-w-sm">
            On-chain mini-casino on Base. Transparent odds, live jackpots, and BGRC chip
            gameplay — plus a full free-play arcade to test every table and machine.
          </p>

          {/* Little chip strip */}
          <div className="flex items-center gap-2 mt-2">
            <div className="relative h-7 w-7">
              <Image
                src="/chips/base-gold-rush-chip.png"
                alt="BGRC chip"
                fill
                className="object-contain drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]"
              />
            </div>
            <span className="text-[11px] text-white/55">
              Powered by <span className="font-semibold text-[#FFD700]">BGRC</span> demo chips on
              Base Sepolia.
            </span>
          </div>
        </div>

        {/* Explore Section with game icons */}
        <div>
          <div className="text-sm font-bold text-white/80">Explore Games</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link
                className="flex items-center gap-2 text-white/70 hover:text-white"
                href="/play/slots-v2"
              >
                <span className="relative h-6 w-6">
                  <Image
                    src="/icons/game-slots.png"
                    alt="Slots"
                    fill
                    className="object-contain"
                  />
                </span>
                <span>Gold Rush Slots (On-Chain)</span>
              </Link>
            </li>
            <li>
              <Link
                className="flex items-center gap-2 text-white/70 hover:text-white"
                href="/play/blackjack"
              >
                <span className="relative h-6 w-6">
                  <Image
                    src="/icons/game-blackjack.png"
                    alt="Blackjack"
                    fill
                    className="object-contain"
                  />
                </span>
                <span>Blackjack (On-Chain)</span>
              </Link>
            </li>
            <li>
              <Link
                className="flex items-center gap-2 text-white/70 hover:text-white"
                href="/arcade/slots-arcade"
              >
                <span className="relative h-6 w-6">
                  <Image
                    src="/icons/game-slots.png"
                    alt="Slots Arcade"
                    fill
                    className="object-contain"
                  />
                </span>
                <span>Slots Arcade (Demo)</span>
              </Link>
            </li>
            <li>
              <Link
                className="flex items-center gap-2 text-white/70 hover:text-white"
                href="/arcade/roulette"
              >
                <span className="relative h-6 w-6">
                  <Image
                    src="/icons/game-roulette1.png"
                    alt="Roulette Arcade"
                    fill
                    className="object-contain"
                  />
                </span>
                <span>Roulette Arcade (Demo)</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* On-chain + Legal Section */}
        <div>
          <div className="text-sm font-bold text-white/80">On-Chain</div>
          <ul className="mt-2 space-y-1 text-sm">
            {CASINO && (
              <li>
                <a
                  className="flex items-center gap-2 text-white/70 hover:text-white"
                  href={`https://sepolia.basescan.org/address/${CASINO}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="relative h-5 w-5">
                    <Image
                      src="/images/base-logo-light.png"
                      alt="Base"
                      fill
                      className="object-contain"
                    />
                  </span>
                  <span>Casino Contract</span>
                </a>
              </li>
            )}

            {BGRC && (
              <li>
                <a
                  className="flex items-center gap-2 text-white/70 hover:text-white"
                  href={`https://sepolia.basescan.org/token/${BGRC}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="relative h-5 w-5">
                    <Image
                      src="/chips/base-gold-rush-chip.png"
                      alt="BGRC token"
                      fill
                      className="object-contain"
                    />
                  </span>
                  <span>BGRC Chip Token</span>
                </a>
              </li>
            )}

            {CASHIER && (
              <li>
                <a
                  className="flex items-center gap-2 text-white/70 hover:text-white"
                  href={`https://sepolia.basescan.org/address/${CASHIER}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="relative h-5 w-5">
                    <Image
                      src="/images/cashier-icon1.png"
                      alt="Cashier"
                      fill
                      className="object-contain"
                    />
                  </span>
                  <span>Cashier Contract</span>
                </a>
              </li>
            )}

            <li className="pt-2 text-[12px] text-white/50">
              Testnet demo. No real BGLD used. BGRC chips carry no real-world value.
            </li>
          </ul>

          {/* Legal Links */}
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-white/50">
            <Link href="/legal/terms" className="hover:text-white">
              Terms
            </Link>
            <span className="opacity-40">•</span>
            <Link href="/legal/privacy" className="hover:text-white">
              Privacy
            </Link>
            <span className="opacity-40">•</span>
            <Link href="/legal/risk" className="hover:text-white">
              Risk
            </Link>
            <span className="opacity-40">•</span>
            <Link href="/legal/responsible-gaming" className="hover:text-white">
              Responsible Gaming
            </Link>
          </div>

          {/* Legal Text Block */}
          <div className="mt-4 space-y-2 text-[10px] text-white/40 leading-relaxed">
            <p>
              Play responsibly. Only use tokens you can afford to lose. On-chain games involve
              risk and transactions cannot be reversed.
            </p>

            <p>
              Base Gold Rush is a non-custodial platform. All transactions occur directly
              through your wallet. Never share your seed phrase or private keys.
            </p>

            <p>
              Not available where prohibited. Users are responsible for complying with local
              laws regarding crypto-based gaming.
            </p>

            <div className="mt-2 text-[10px] text-white/40">
              See regional notices:{' '}
              <Link href="/legal/regions/us" className="hover:text-white">
                US
              </Link>{' '}
              •{' '}
              <Link href="/legal/regions/eu" className="hover:text-white">
                EU
              </Link>{' '}
              •{' '}
              <Link href="/legal/regions/au" className="hover:text-white">
                AU
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10 py-3 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Base Gold — All rights reserved.
      </div>
    </footer>
  )
}
