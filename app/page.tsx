// app/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { ArcadeWalletProvider } from '@/lib/useArcadeWallet'
import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'

import CashierComingSoonModal from '@/components/casino/CashierComingSoonModal'


const TOKEN_SYMBOL = process.env.NEXT_PUBLIC_TOKEN_SYMBOL ?? 'BGRC'
const TOKEN_NAME = process.env.NEXT_PUBLIC_TOKEN_NAME ?? 'Base Gold Rush Chip'

type GameMode = 'onchain' | 'arcade'

type GameCard = {
  href: string
  label: string
  tag: string
  desc: string
  icon: string
  mode: GameMode
}

// MASTER GAME LIST
const games: GameCard[] = [
  {
    href: '/play/slots-v2',
    label: 'Gold Rush Slots',
    tag: 'Vegas Slots',
    desc: 'Multi-line BGRC slots with rich payouts and on-chain results.',
    icon: '/icons/game-slots.png',
    mode: 'onchain',
  },
  {
    href: '/play/blackjack',
    label: 'Blackjack',
    tag: '21 or Bust',
    desc: 'Play heads-up blackjack against the house with clean, readable cards.',
    icon: '/icons/game-blackjack.png',
    mode: 'onchain',
  },
  {
    href: '/play/roulette',
    label: 'Roulette',
    tag: 'Red • Black • Gold',
    desc: 'Spin the wheel, chase your numbers, and ride the streaks.',
    icon: '/icons/game-roulette.png',
    mode: 'onchain',
  },
  {
    href: '/play/coinflip',
    label: 'Coin Flip',
    tag: 'Double or Nothing',
    desc: 'High-voltage flips with a huge, shiny BGRC coin front and center.',
    icon: '/icons/game-coinflip.png',
    mode: 'onchain',
  },
  {
    href: '/play/hilo',
    label: 'Hi-Lo',
    tag: 'Higher or Lower',
    desc: 'Call the next card and build your streak up the ladder.',
    icon: '/icons/game-hilo.png',
    mode: 'onchain',
  },
  {
    href: '/play/war',
    label: 'War',
    tag: 'Card Battle',
    desc: 'Simple, brutal card war. Higher card takes the pot.',
    icon: '/icons/game-war.png',
    mode: 'onchain',
  },
  {
    href: '/play/pan',
    label: 'Pan',
    tag: 'Spin to Win',
    desc: 'Original Base Gold wheel — multipliers, dry pans, and big hits.',
    icon: '/icons/game-pan.png',
    mode: 'onchain',
  },
  {
    href: '/play/mine',
    label: 'Mine the Ridge',
    tag: 'Jackpot Hunt',
    desc: 'Hunt the motherlode across the ridge with tools and tiles.',
    icon: '/icons/game-mine.png',
    mode: 'onchain',
  },
  {
    href: '/video-poker',
    label: 'Video Poker',
    tag: 'Jacks or Better',
    desc: 'Classic bar-top video poker vibe, all settled on-chain.',
    icon: '/icons/game-video-poker.png',
    mode: 'onchain', // limited for now, but on-chain testnet
  },
  {
    href: '/poker-demo',
    label: 'Poker Room (Arcade)',
    tag: 'Texas Hold’em',
    desc: '6–9 player Hold’em table, Railway WebSocket ready, using BGRC demo credits.',
    icon: '/icons/game-poker-room.png',
    mode: 'arcade',
  },
  {
    href: '/play/jackpot-spin',
    label: 'Jackpot Spin',
    tag: 'Wheel Bonus',
    desc: 'Crank the jackpot wheel for outsized multipliers and gold hits.',
    icon: '/icons/game-jackpot.png',
    mode: 'onchain',
  },
  {
    href: '/play/dice',
    label: 'Dice',
    tag: '2d6 Action',
    desc: 'Fast-paced dice rolls with simple, clean odds and instant results.',
    icon: '/icons/game-dice.png',
    mode: 'onchain',
  },
  {
    href: '/arcade/roulette',
    label: 'Roulette (Arcade)',
    tag: 'Demo Machine',
    desc: 'Full multipliers, free demo credits, and a bar-top roulette vibe.',
    icon: '/icons/game-roulette1.png',
    mode: 'arcade',
  },
  {
    href: '/arcade/slots-arcade',
    label: 'Gold Rush Slots (Arcade)',
    tag: 'Demo Machine',
    desc: 'Hyper-real video slot cabinet with free-play BGRC demo chips.',
    icon: '/icons/game-slots.png',
    mode: 'arcade',
  },
  {
    href: '/arcade/craps',
    label: 'Craps (Arcade)',
    tag: 'Demo Table',
    desc: 'Full craps table with pass line, field, props, and hardways on BGRC demo credits.',
    icon: '/icons/game-craps1.png',
    mode: 'arcade',
  },
  {
    href: '/arcade/blackjack',
    label: 'Blackjack (Arcade)',
    tag: 'Demo Table',
    desc: 'Multi-seat video blackjack with splits, doubles, and surrender using BGRC demo credits.',
    icon: '/icons/game-blackjack1.png',
    mode: 'arcade',
  },
  {
    href: '/arcade/war',
    label: 'War (Arcade)',
    tag: 'High Card',
    desc: 'High-card vs the house on a packed rail with instant flips.',
    icon: '/icons/game-war.png',
    mode: 'arcade',
  },
  {
    href: '/arcade/baccarat',
    label: 'Baccarat (Arcade)',
    tag: 'Demo Table',
    desc: 'Full baccarat table with Player, Banker, Tie and Pair side bets using free-play chips.',
    icon: '/icons/game-baccarat.png',
    mode: 'arcade',
  },
  {
    href: '/arcade/video-poker',
    label: 'Video Poker (Arcade)',
    tag: 'Demo Machine',
    desc: 'Bar-top Jacks or Better with free-play BGRC credits.',
    icon: '/icons/game-video-poker1.png',
    mode: 'arcade',
  },
  {
    href: '/arcade/three-card-poker',
    label: 'Three Card Poker (Arcade)',
    tag: 'Demo Table',
    desc: 'Ante, Pair Plus, and Play bets vs the dealer on a full three-card layout.',
    icon: '/icons/game-three-card-poker.png',
    mode: 'arcade',
  },
]

const onchainGames = games.filter(g => g.mode === 'onchain')
const arcadeGames = games.filter(g => g.mode === 'arcade')

// Featured: Slots, Blackjack, Roulette (on-chain)
const featuredGameHrefs = ['/play/slots-v2', '/play/blackjack', '/play/roulette']
const featuredGames = onchainGames.filter(g => featuredGameHrefs.includes(g.href))

// GOLD BAR HERO (replaces spinning chip image)
function SpinningChipHero() {
  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* HERO BACKGROUND OVERLAY (same as before) */}
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <Image
          src="/images/goldrush-hero-v2.png"
          alt="Base Gold Rush casino floor"
          fill
          priority
          className="object-cover"
        />
      </div>

      {/* WRAPPER — keeps everything aligned */}
      <div className="relative w-[380px] md:w-[520px]">
        {/* PEDESTAL / BACKPLATE */}
        <div
          className="
            relative flex items-center justify-center
            h-[260px] md:h-[340px]
            rounded-3xl overflow-hidden
            border border-[#FFD700]/30
            shadow-[0_30px_90px_rgba(0,0,0,0.95)]
            bg-black
          "
          style={{
            backgroundImage: "url('/images/chip-pedestal-bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Soft gold glow under bar */}
          <div className="pointer-events-none absolute h-44 w-44 md:h-56 md:w-56 rounded-full bg-[rgba(255,215,0,0.28)] blur-3xl" />

          {/* SINGLE ROTATING GOLD BAR */}
                    {/* GOLD BAR HERO (rocking, not spinning) */}
          <div className="relative h-52 w-52 md:h-72 md:w-72 flex items-center justify-center">
            <Image
              src="/images/base-logo-light.png"
              alt="Base Gold Rush gold bar"
              width={260}
              height={260}
              priority
              className="gold-bar-rock drop-shadow-[0_28px_70px_rgba(0,0,0,0.98)] select-none object-contain"
            />
          </div>

        </div>

        {/* HUD UNDER BAR */}
        <div
          className="
            relative -mt-4
            w-full
            rounded-2xl border border-white/15
            bg-black/85 px-4 py-3
            text-xs text-white/70
            shadow-[0_12px_30px_rgba(0,0,0,0.9)]
          "
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/50">
              {TOKEN_SYMBOL} Chip
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              Testnet Live
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-white font-semibold">Base Gold Rush</span>
            <span className="text-[#FFD700] text-[11px] font-bold">
              Demo Arcade → On-Chain Casino
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}


function GameCardTile({
  game,
  tokenSymbol,
}: {
  game: GameCard
  tokenSymbol: string
}) {
  const isArcade = game.mode === 'arcade'

  return (
    <Link
      href={game.href}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.09),_transparent_55%),linear-gradient(to_bottom,#020617,#020617)] p-4 transition hover:border-[#FFD700]/60 hover:shadow-[0_0_28px_rgba(251,191,36,0.45)]"
    >
      {/* BIG ICON */}
      <div className="w-full flex items-center justify-center mb-3">
        <div className="relative w-[160px] h-[160px] md:w-[200px] md:h-[200px]">
          <Image
            src={game.icon}
            alt={`${game.label} icon`}
            fill
            sizes="200px"
            className="object-contain drop-shadow-[0_0_14px_rgba(255,215,0,0.35)] transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </div>

      {/* TEXT */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white md:text-base">
          {game.label}
        </h3>
        <span className="inline-flex items-center rounded-full border border-[#FFD700]/40 bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FFD700]/90">
          {game.tag}
        </span>
      </div>

      <p className="mt-1 text-xs text-white/65 md:text-[13px]">
        {game.desc}
      </p>

      <div className="mt-3 flex items-center justify-between text-[11px] text-white/60">
        <span>
          {isArcade
            ? 'Mode: Demo Arcade • Free'
            : `Mode: On-Chain • ${tokenSymbol}`}
        </span>
        <span
          className={
            isArcade
              ? 'text-emerald-300 group-hover:translate-x-0.5 transition-transform'
              : 'text-[#FFD700] group-hover:translate-x-0.5 transition-transform'
          }
        >
          {isArcade ? 'Play Free →' : 'Play →'}
        </span>
      </div>
    </Link>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      <CashierComingSoonModal />

      {/* HERO */}
      <section
        className="relative overflow-hidden border-b border-white/10 text-white"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.70)), url('/images/bg-goldrush-hero-v2.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* subtle gold/blue overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.14),_transparent_50%)]" />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row md:items-center md:py-14">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/40 bg-black/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFD700]/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Base Gold Rush • On-Chain Casino & Arcade
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow md:text-5xl">
              Welcome to the <span className="text-[#FFD700]">Base Gold Rush</span>.
            </h1>

            {/* TESTNET HELP BANNER */}
            <section className="mt-4 mb-4">
              <div className="mx-auto max-w-6xl">
                <Link
                  href="/base-sepolia-guide"
                  className="block rounded-2xl border border-sky-400/40 bg-[radial-gradient(circle_at_left,_rgba(56,189,248,0.22),_transparent_60%),#020617] px-6 py-4 shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:brightness-110 transition-all duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="text-sm md:text-base font-semibold text-sky-300">
                      🧭 New to Base Sepolia? Learn how to add the network, get testnet ETH,
                      and claim {TOKEN_SYMBOL} chips.
                    </div>
                    <div className="text-xs md:text-sm font-bold text-white bg-sky-500/20 border border-sky-300/40 px-3 py-1 rounded-full">
                      Read the Guide →
                    </div>
                  </div>
                </Link>
              </div>
            </section>

            <p className="max-w-xl text-sm text-white/70 md:text-base">
              Play Vegas-style games on Base Sepolia testnet using{' '}
              <span className="font-semibold text-[#FFD700]">
                {TOKEN_NAME} ({TOKEN_SYMBOL})
              </span>
              . Start in the{' '}
              <span className="font-semibold text-emerald-300">Demo Arcade</span>{' '}
              with free-play chips, then graduate into{' '}
              <span className="font-semibold">live on-chain games</span> before
              the full Base mainnet casino opens.
            </p>

            {/* 3-STAGE PIPELINE STRIP */}
            <div className="mt-3 grid gap-2 text-[11px] md:text-xs">
              <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 flex items-center justify-between gap-2">
                <div className="font-semibold text-emerald-300">
                  Phase 1 — Live Now
                </div>
                <div className="text-white/70">
                  On-chain testnet casino on Base Sepolia with {TOKEN_SYMBOL} chips.
                </div>
              </div>
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-900/40 px-3 py-2 flex items-center justify-between gap-2">
                <div className="font-semibold text-emerald-200">
                  Phase 2 — Demo Arcade
                </div>
                <div className="text-emerald-50/80">
                  Off-chain demos like Roulette Arcade & Slots Arcade to tune odds,
                  UX, and multipliers before final contracts.
                </div>
              </div>
              <div className="rounded-xl border border-[#FFD700]/50 bg-[#1f2937]/80 px-3 py-2 flex items-center justify-between gap-2">
                <div className="font-semibold text-[#FFD700]">
                  Phase 3 — Base Mainnet
                </div>
                <div className="text-white/80">
                  Regulated launch of real-value chips and casino play on Base. You&apos;re
                  early to the floor.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/arcade/slots-arcade"
                className="rounded-full bg-gradient-to-r from-[#22c55e] to-[#4ade80] px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(34,197,94,0.7)] hover:brightness-110"
              >
                🎡 Start in the Demo Arcade
              </Link>
              <Link
                href="/play/slots-v2"
                className="rounded-full border border-[#FFD700]/70 bg-black/80 px-4 py-2.5 text-sm font-semibold text-[#FFD700] hover:bg-[#111827]"
              >
                🎰 Enter the On-Chain Casino
              </Link>
              <Link
                href="/arcade/roulette"
                className="rounded-full border border-emerald-300/70 bg-emerald-900/70 px-4 py-2.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-800/90"
              >
                🎯 Try Roulette (Arcade Demo)
              </Link>
            </div>

            <div className="mt-3 text-[11px] text-white/50">
              Demo arcade games can be played wallet-free. Connect your wallet from the header
              to mint testnet chips and play Base Sepolia Testnet on-chain tables and slots.
            </div>

            <div className="mt-4 grid max-w-md grid-cols-3 gap-2 text-[11px] text-white/70">
              <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-white/40">
                  On-Chain Games
                </div>
                <div className="text-sm font-bold text-white">
                  {onchainGames.length}+ Live
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-white/40">
                  Demo Machines
                </div>
                <div className="text-sm font-bold text-emerald-300">
                  {arcadeGames.length}+ Arcade
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-white/40">
                  Chain
                </div>
                <div className="text-sm font-bold text-[#60a5fa]">Base</div>
              </div>
            </div>
          </div>

          {/* Hero gold bar pedestal + sprite */}
          <div className="relative z-0 flex-1 flex items-center justify-center">
            <SpinningChipHero />
          </div>
        </div>
      </section>

      {/* GAME GRID */}
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white md:text-2xl">
              Start in the Arcade, graduate on-chain
            </h2>
            <p className="text-xs text-white/60 md:text-sm">
              Demo arcade games use free-play BGRC credits so you can learn the rhythm.
              When you&apos;re ready, step into on-chain tables and slots on Base Sepolia
              using {TOKEN_SYMBOL} chips.
            </p>
          </div>
          <div className="text-[11px] text-white/50">
            You&apos;re early. This is the testnet &amp; arcade phase before full Base mainnet rollout.
          </div>
        </div>

        {/* FEATURED GAMES ROW */}
        <div className="mb-6">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Featured Tonight — On-Chain
          </h3>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
            {featuredGames.map(game => (
              <Link
                key={game.href}
                href={game.href}
                className="snap-start min-w-[220px] md:min-w-[260px] rounded-2xl border border-white/15 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.14),_transparent_55%),#020617] p-3 flex items-center gap-3 hover:border-[#FFD700]/60 hover:shadow-[0_0_24px_rgba(251,191,36,0.4)] transition"
              >
                <div className="relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0 rounded-xl border border-white/15 bg-black/70 overflow-hidden">
                  <Image
                    src={game.icon}
                    alt={`${game.label} icon`}
                    fill
                    sizes="64px"
                    className="object-contain p-1.5"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">
                      {game.label}
                    </span>
                    <span className="text-[10px] text-[#FFD700]/90 uppercase font-semibold">
                      {game.tag}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-white/60 line-clamp-2">
                    {game.desc}
                  </div>
                  <div className="mt-1 text-[11px] text-[#FFD700]">
                    Play on-chain →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Arcade hero banner card */}
        <div
          className="rounded-3xl overflow-hidden border border-white/10 shadow-xl mb-6"
          style={{
            backgroundImage: "url('/images/arcade-hero-v2.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '240px',
          }}
        />

        {/* DEMO ARCADE GRID + HUD */}
        {arcadeGames.length > 0 && (
          <ArcadeWalletProvider>
            <div className="mt-4 md:mt-6">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/60 mb-2">
                Demo Arcade • Free Play
              </h3>
              <p className="text-[11px] text-white/55 mb-3">
                Off-chain demo tables and machines. No wallet required — spin and deal using
                free-play BGRC credits. These are the exact flows that will graduate to
                dedicated on-chain contracts on Base mainnet.
              </p>

              {/* DEMO WALLET HUD */}
              <ArcadeWalletHUD />

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {arcadeGames.map(game => (
                  <GameCardTile
                    key={game.href}
                    game={game}
                    tokenSymbol={TOKEN_SYMBOL}
                  />
                ))}
              </div>
            </div>
          </ArcadeWalletProvider>
        )}

        {/* ON-CHAIN GAME GRID */}
        <div className="mt-8">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/60 mb-2">
            On-Chain Games (Base Sepolia)
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {onchainGames.map(game => (
              <GameCardTile
                key={game.href}
                game={game}
                tokenSymbol={TOKEN_SYMBOL}
              />
            ))}
          </div>
        </div>
      </section>

      {/* SOFT LEGAL / INFO STRIP */}
      <section className="border-t border-white/10 bg-black/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-[11px] text-white/50 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-white/70">
              Heads up: entertainment only while on testnet.
            </div>
            <div>
              Mainnet chips, age gating, and full legal disclaimers will be
              added before real-value play.
            </div>
          </div>
          <div className="text-right md:text-left">
            <div>Always play within your limits.</div>
            <div>Know your odds, and never chase losses.</div>
          </div>
        </div>
      </section>
    </main>
  )
}
