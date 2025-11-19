// app/onchain/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import CasinoStatusStrip from '@/components/casino/layout/CasinoStatusStrip'
import CasinoModeSwitcher from '@/components/casino/layout/CasinoModeSwitcher'
import CasinoLiveStats from '@/components/casino/layout/CasinoLiveStats'

const TOKEN_SYMBOL = process.env.NEXT_PUBLIC_TOKEN_SYMBOL ?? 'BGRC'

type OnchainGame = {
  href: string
  label: string
  tag: string
  desc: string
  icon: string
}

const onchainGames: OnchainGame[] = [
  {
    href: '/play/slots-v2',
    label: 'Gold Rush Slots',
    tag: 'Video Slots',
    desc: 'Multi-line Base slots with on-chain results.',
    icon: '/icons/game-slots.png',
  },
  {
    href: '/play/blackjack',
    label: 'Blackjack',
    tag: '21 Table',
    desc: 'Clean, readable cards with dealer logic on-chain.',
    icon: '/icons/game-blackjack.png',
  },
  {
    href: '/play/roulette',
    label: 'Roulette',
    tag: 'Wheel',
    desc: 'European wheel, provable results via contracts.',
    icon: '/icons/game-roulette.png',
  },
  {
    href: '/play/coinflip',
    label: 'Coin Flip',
    tag: 'High Voltage',
    desc: 'Double-or-nothing coin flips with transparent odds.',
    icon: '/icons/game-coinflip.png',
  },
  {
    href: '/play/hilo',
    label: 'Hi-Lo',
    tag: 'Card Ladder',
    desc: 'Climb the streak ladder by calling the next card.',
    icon: '/icons/game-hilo.png',
  },
  {
    href: '/play/war',
    label: 'War',
    tag: 'Card Battle',
    desc: 'High card wins, neatly settled on-chain.',
    icon: '/icons/game-war.png',
  },
  {
    href: '/play/pan',
    label: 'Pan',
    tag: 'Gold Wheel',
    desc: 'Base Gold original wheel — pans, multipliers, and big hits.',
    icon: '/icons/game-pan.png',
  },
  {
    href: '/play/mine',
    label: 'Mine the Ridge',
    tag: 'Jackpot Hunt',
    desc: 'Cross the ridge, dodge the blasts, hunt jackpots.',
    icon: '/icons/game-mine.png',
  },
  {
    href: '/video-poker',
    label: 'Video Poker',
    tag: 'Jacks or Better',
    desc: 'Classic draw poker logic, resolved on-chain.',
    icon: '/icons/game-video-poker.png',
  },
  {
    href: '/play/jackpot-spin',
    label: 'Jackpot Spin',
    tag: 'Bonus Wheel',
    desc: 'Bonus wheel with outsized multipliers and jackpot tiers.',
    icon: '/icons/game-jackpot.png',
  },
  {
    href: '/play/dice',
    label: 'Dice',
    tag: '2d6',
    desc: 'Simple dice action with instant settlements.',
    icon: '/icons/game-dice.png',
  },
]

export default function OnchainPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      {/* HERO */}
      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/onchain-hero-main.png"
            alt="On-chain casino tables"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.88),rgba(0,0,0,0.97))]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12">
          <CasinoStatusStrip mode="onchain" />
          <CasinoModeSwitcher active="onchain" />

          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <div className="flex-1 space-y-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                On-Chain Testnet Casino
              </h1>
              <p className="text-sm md:text-base text-white/78 max-w-xl">
                This is where the Base Gold Rush gets real. Every spin, flip, and deal here
                is executed and settled by smart contracts on Base Sepolia using{' '}
                <span className="font-semibold text-[#FFD700]">
                  {TOKEN_SYMBOL} chips
                </span>
                .
              </p>
              <p className="text-[11px] md:text-xs text-white/60 max-w-xl">
                Think of this as the dress rehearsal for the full Base mainnet launch. Odds,
                flows, and edge are all visible on-chain so we can stress-test everything
                before turning up real-value chips.
              </p>

              <div className="max-w-md">
                <CasinoLiveStats variant="onchain" />
              </div>

              <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-white/60">
                <span className="rounded-full border border-sky-400/60 bg-sky-900/40 px-2 py-0.5">
                  Base Sepolia • Testnet only
                </span>
                <span className="rounded-full border border-[#FFD700]/60 bg-[#1f2937] px-2 py-0.5">
                  Smart contracts first, mainnet later
                </span>
              </div>
            </div>

            <div className="flex-1 flex justify-center md:justify-end">
              <div className="relative w-full max-w-[380px] rounded-3xl border border-sky-300/70 bg-black/85 shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden">
                <div className="relative h-40 sm:h-48">
                  <Image
                    src="/images/onchain-card-bg.png"
                    alt="Roulette and card tables on-chain"
                    fill
                    sizes="380px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-sky-200/90">
                      On-Chain Casino
                    </div>
                    <div className="text-lg font-bold text-white">
                      Base Sepolia Floor
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 text-[11px] text-sky-100/85">
                  <p>
                    Use this floor to test wallets, flows, and risk management. When the
                    contracts feel perfect here, they’ll graduate to the full Base mainnet
                    casino with real-value chips.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ON-CHAIN GAMES GRID */}
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg md:text-xl font-bold">
              Pick an on-chain game
            </h2>
            <p className="text-xs md:text-sm text-white/60 max-w-xl">
              All of these games run on Base Sepolia with contracts enforcing odds and
              payouts. Perfect for tuning your strategies ahead of mainnet.
            </p>
          </div>
          <div className="text-[11px] text-white/50">
            Real-value play will be gated, regulated, and launched after this phase.
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  {onchainGames.map(game => (
    <Link
      key={game.href}
      href={game.href}
      className="group relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.3),transparent_60%),radial-gradient(circle_at_0%_100%,rgba(15,23,42,0.9),#020617)] p-5 sm:p-6 min-h-[132px] hover:border-emerald-300/90 hover:shadow-[0_0_32px_rgba(16,185,129,0.7)] transition"

    >
      <div className="flex items-center gap-3">
        {/* 🔵 ICON TILE WITH BACKGROUND */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex-shrink-0 rounded-2xl border border-sky-300/75 bg-black/85 shadow-[0_0_22px_rgba(56,189,248,0.8)] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.85),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(129,140,248,0.55),transparent_55%)] opacity-90" />
          <Image
            src={game.icon}
            alt={game.label}
            fill
            sizes="96px"
            className="relative object-contain p-1.5 group-hover:scale-110 transition-transform duration-300"
          />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm md:text-base font-semibold text-white">
              {game.label}
            </h3>
            <span className="rounded-full border border-sky-300/70 bg-sky-900/60 px-2 py-0.5 text-[10px] font-semibold text-sky-100">
              {game.tag}
            </span>
          </div>
          <p className="text-[11px] text-white/72 line-clamp-2">
            {game.desc}
          </p>
          <div className="text-[11px] text-sky-200 flex items-center gap-1">
            <span className="group-hover:translate-x-0.5 transition-transform">
              Play on-chain →
            </span>
          </div>
        </div>
      </div>
    </Link>
  ))}
</div>

      </section>
    </main>
  )
}
