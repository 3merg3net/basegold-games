import Link from 'next/link'
import Image from 'next/image'
import { ArcadeWalletProvider } from '@/lib/useArcadeWallet'
import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'

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

// MASTER GAME LIST (casino only – no live poker room link here)
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
    mode: 'onchain',
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
  // Arcade / demo machines & tables
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

function SpinningChipHero() {
  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="w-[360px] md:w-[480px]">
        <div
          className="
            relative flex items-center justify-center
            h-[240px] md:h-[320px]
            rounded-3xl overflow-hidden
            border border-[#FFD700]/30
            shadow-[0_30px_90px_rgba(0,0,0,0.95)]
            bg-[#06402b]
          "
          style={{
            backgroundImage: "url('/images/chip-table-bg.png')",
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        >
          <div className="pointer-events-none absolute h-36 w-36 md:h-44 md:w-44 rounded-full bg-black/45 blur-3xl" />
          <div className="relative h-48 w-48 md:h-64 md:w-64">
            <Image
              src="/chips/base-gold-rush-chip.png"
              alt="Base Gold Rush chip"
              fill
              priority
              className="chip-spin drop-shadow-[0_28px_70px_rgba(0,0,0,0.98)] select-none"
            />
          </div>
        </div>

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
              On-Chain Casino + Demo Arcade
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
      <div className="w-full flex items-center justify-center mb-3">
        <div className="relative w-[140px] h-[140px] md:w-[180px] md:h-[180px]">
          <Image
            src={game.icon}
            alt={`${game.label} icon`}
            fill
            sizes="200px"
            className="object-contain drop-shadow-[0_0_14px_rgba(255,215,0,0.35)] transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </div>

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
          {isArcade ? 'Free-play arcade mode' : `On-chain • ${tokenSymbol} chips`}
        </span>
        <span
          className={
            isArcade
              ? 'text-emerald-300 group-hover:translate-x-0.5 transition-transform'
              : 'text-[#FFD700] group-hover:translate-x-0.5 transition-transform'
          }
        >
          Play →
        </span>
      </div>
    </Link>
  )
}

// BIG SLOTS HERO CARD (matches poker hero treatment)
function SlotsHeroCard() {
  return (
    <Link
      href="/play/slots-v2"
      className="group relative mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#FFD700]/70 bg-black/90 shadow-[0_20px_60px_rgba(0,0,0,0.95)]"
    >
      <div className="relative w-full h-56 sm:h-72 md:h-80">
        <Image
          src="/images/casino-floor-wide.png"
          alt="Gold Rush slots floor"
          fill
          sizes="(max-width:768px) 100vw, 640px"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-black/85" />
      </div>

      <div className="flex flex-col items-center text-center gap-3 px-5 py-5 bg-black/90">
        <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
          Light up the{' '}
          <span className="text-[#FFD700]">Slots Floor</span>.
        </h2>
        <p className="text-xs sm:text-sm text-white/80 max-w-sm">
          Gold Rush reels, jackpots, and multipliers running on Base with{' '}
          <span className="font-semibold text-[#FFD700]">
            {TOKEN_SYMBOL} chips
          </span>.
        </p>
        <div className="w-full max-w-xs flex flex-col gap-2">
          <div className="rounded-full bg-[#FFD700] px-6 py-2.5 text-sm sm:text-base font-semibold text-black shadow-[0_20px_55px_rgba(250,204,21,0.9)] group-hover:bg-yellow-400 transition text-center">
            Enter Gold Rush Slots →
          </div>
          <span className="text-[11px] text-white/55">
            On-chain results • Vegas pacing • Mobile first
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function CasinoLobbyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      {/* HERO – CASINO ONLY, SLOTS FIRST */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.16),_transparent_50%)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:py-12">
          {/* Title + short copy */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/40 bg-black/70 px-3 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#FFD700]/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Base Gold Rush • Casino Floor
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow">
              Spin the{' '}
              <span className="text-[#FFD700]">Gold Rush Casino</span>.
            </h1>

            <p className="max-w-xl text-sm text-white/80 md:text-base">
              Slots, roulette, blackjack, craps and more — all wired into{' '}
              <span className="font-semibold text-[#FFD700]">
                {TOKEN_NAME} ({TOKEN_SYMBOL})
              </span>{' '}
              on Base. Free-play arcade machines let you feel the room before
              mainnet chips open up.
            </p>

            <div className="flex flex-wrap gap-2 pt-1 text-[11px] sm:text-xs">
              <span className="rounded-full border border-emerald-300/60 bg-emerald-900/60 px-3 py-1 font-semibold text-emerald-100">
                Testnet Live • Base Sepolia
              </span>
              <span className="rounded-full border border-[#FFD700]/60 bg-black/70 px-3 py-1 font-semibold text-[#FFD700]">
                Mainnet rollout planned
              </span>
            </div>
          </div>

          {/* Big slots hero card */}
          <SlotsHeroCard />
        </div>
      </section>

      {/* GAME GRID */}
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        {/* FEATURED STRIP */}
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Featured Tonight
            </h2>
            <p className="text-xs md:text-sm text-white/65">
              Hit the main attractions: slots, blackjack, and roulette on-chain.
            </p>
          </div>
          <div className="text-[11px] text-white/50">
            Tap any tile to open the game.
          </div>
        </div>

        <div className="mb-6">
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

        {/* DEMO ARCADE GRID + HUD */}
        {arcadeGames.length > 0 && (
          <ArcadeWalletProvider>
            <div className="mt-4 md:mt-6">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/60 mb-2">
                Demo Arcade • Free Play
              </h3>
              <p className="text-[11px] text-white/55 mb-3">
                Spin and deal with free BGRC demo credits. Same layouts and pacing
                we&apos;ll wire into mainnet contracts.
              </p>

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
          <p className="text-[11px] text-white/55 mb-3">
            Contracts are live — spins, rolls, and hands all settle with{' '}
            {TOKEN_SYMBOL} balances tied to your wallet.
          </p>
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

        {/* Spinning chip section pushed lower */}
        <div className="mt-10 flex justify-center">
          <SpinningChipHero />
        </div>
      </section>

      {/* SOFT LEGAL / INFO STRIP */}
      <section className="border-t border-white/10 bg-black/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-[11px] text-white/50 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-white/70">
              Testnet phase: entertainment only.
            </div>
            <div>
              Mainnet chips, age gating, and full legal layers arrive before
              real-value play.
            </div>
          </div>
          <div className="text-right md:text-left">
            <div>Play within your limits.</div>
            <div>Know your odds, and never chase losses.</div>
          </div>
        </div>
      </section>
    </main>
  )
}
