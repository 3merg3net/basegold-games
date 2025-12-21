'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const CASINO  = process.env.NEXT_PUBLIC_CASINO_CA as string | undefined
const BGLD    = process.env.NEXT_PUBLIC_BGLD_CA as string | undefined
const CASHIER = process.env.NEXT_PUBLIC_CASHIER_CA as string | undefined

function FooterNavLink(props: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { href, className, children } = props

  const isPokerRoomDetail =
    pathname?.startsWith('/poker/') && pathname !== '/poker'

  if (isPokerRoomDetail) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

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
                Poker Room • Casino Floor
              </div>
            </div>
          </div>

          <p className="text-sm text-white/60 max-w-sm">
            Base-native live poker room and casino. GLD chips on the casino floor,
            PGLD chips at the tables, and BGLD at the cashier when the cage is fully live.
          </p>

          {/* Little chip strip */}
          <div className="flex items-center gap-2 mt-2">
            <div className="relative h-7 w-7">
              <Image
                src="/chips/chip-gld-main.png"
                alt="GLD casino chip"
                fill
                className="object-contain drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]"
              />
            </div>
            <span className="text-[11px] text-white/55">
              GLD chips power the casino floor; PGLD chips track live poker stacks — all tied to your wallet profile.
            </span>
          </div>
        </div>

        {/* Explore Section with game icons */}
        <div>
          <div className="text-sm font-bold text-white/80">Explore</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <FooterNavLink
                className="flex items-center gap-2 text-white/70 hover:text-white"
                href="/live-tables"
              >
                <span className="relative h-6 w-6">
                  <Image
                    src="/icons/game-poker-room.png"
                    alt="Poker Room"
                    fill
                    className="object-contain"
                  />
                </span>
                <span>Poker Room & Live Tables</span>
              </FooterNavLink>
            </li>
            <li>
              <FooterNavLink
                className="flex items-center gap-2 text-white/70 hover:text-white"
                href="/arcade"
              >
                <span className="relative h-6 w-6">
                  <Image
                    src="/icons/game-slots.png"
                    alt="Casino Floor"
                    fill
                    className="object-contain"
                  />
                </span>
                <span>Casino Floor • Slots & Tables</span>
              </FooterNavLink>
            </li>
            <li>
              <FooterNavLink
                className="flex items-center gap-2 text-white/70 hover:text-white"
                href="/poker"
              >
                <span className="relative h-6 w-6">
                  <Image
                    src="/icons/game-video-poker1.png"
                    alt="Poker hub"
                    fill
                    className="object-contain"
                  />
                </span>
                <span>Poker Hub & Profile</span>
              </FooterNavLink>
            </li>
          </ul>
        </div>

        {/* On-chain + Legal Section */}
        <div>
          <div className="text-sm font-bold text-white/80">On-Chain</div>
          <ul className="mt-2 space-y-1 text-sm">
            {BGLD && (
              <li>
                <a
                  className="flex items-center gap-2 text-white/70 hover:text-white"
                  href={`https://basescan.org/token/${BGLD}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="relative h-5 w-5">
                    <Image
                      src="/images/cashier-icon.png"
                      alt="GLD token"
                      fill
                      className="object-contain"
                    />
                  </span>
                  <span>BGLD Main Token</span>
                </a>
              </li>
            )}

            {CASHIER && (
              <li>
                <a
                  className="flex items-center gap-2 text-white/70 hover:text-white"
                  href={`https://basescan.org/address/${CASHIER}`}
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
              Contract links are provided for transparency. Always verify contract addresses
              before you send funds or load chips.
            </li>
          </ul>

          {/* Legal Links */}
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-white/50">
            <FooterNavLink href="/legal/terms" className="hover:text-white">
              Terms
            </FooterNavLink>
            <span className="opacity-40">•</span>
            <FooterNavLink href="/legal/privacy" className="hover:text-white">
              Privacy
            </FooterNavLink>
            <span className="opacity-40">•</span>
            <FooterNavLink href="/legal/risk" className="hover:text-white">
              Risk
            </FooterNavLink>
            <span className="opacity-40">•</span>
            <FooterNavLink href="/legal/responsible-gaming" className="hover:text-white">
              Responsible Gaming
            </FooterNavLink>
          </div>

          {/* Legal Text Block */}
          <div className="mt-4 space-y-2 text-[10px] text-white/40 leading-relaxed">
            <p>
              Play responsibly. Only use funds and chips you can afford to lose.
              On-chain games involve risk and transactions cannot be reversed.
            </p>

            <p>
              Base Gold Rush is a non-custodial platform. All transactions occur
              directly through your wallet or chip account. Never share your seed
              phrase or private keys.
            </p>

            <p>
              Not available where prohibited. You are responsible for complying
              with local laws regarding crypto-based gaming.
            </p>

            <div className="mt-2 text-[10px] text-white/40">
              See regional notices:{' '}
              <FooterNavLink href="/legal/regions/us" className="hover:text-white">
                US
              </FooterNavLink>{' '}
              •{' '}
              <FooterNavLink href="/legal/regions/eu" className="hover:text-white">
                EU
              </FooterNavLink>{' '}
              •{' '}
              <FooterNavLink href="/legal/regions/au" className="hover:text-white">
                AU
              </FooterNavLink>
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
