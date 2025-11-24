// app/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import CashierComingSoonModal from '@/components/casino/CashierComingSoonModal'
import CasinoStatusStrip from '@/components/casino/layout/CasinoStatusStrip'
import CasinoModeSwitcher from '@/components/casino/layout/CasinoModeSwitcher'
import CasinoLiveStats from '@/components/casino/layout/CasinoLiveStats'

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
  // Arcade
  {
    href: '/arcade/roulette',
    label: 'Roulette (Arcade)',
    tag: 'Arcade Wheel',
    desc: 'Full multipliers and a bar-top roulette vibe using BGRC chips for free play.',
    icon: '/icons/game-roulette1.png',
    mode: 'arcade',
  },
  {
    href: '/arcade/slots-arcade',
    label: 'Gold Rush Slots (Arcade)',
    tag: 'Arcade Slots',
    desc: 'Hyper-real video slot cabinet using BGRC chips in casino arcade mode.',
    icon: '/icons/game-slots.png',
    mode: 'arcade',
  },
  {
    href: '/arcade/craps',
    label: 'Craps (Arcade)',
    tag: 'Arcade Table',
    desc: 'Full craps table with pass line, field, props, and hardways running on BGRC chips.',
    icon: '/icons/game-craps1.png',
    mode: 'arcade',
  },
  {
    href: '/arcade/blackjack',
    label: 'Blackjack (Arcade)',
    tag: 'Arcade Table',
    desc: 'Multi-seat video blackjack with splits, doubles, and surrender using BGRC chips.',
    icon: '/icons/game-blackjack1.png',
    mode: 'arcade',
  },
  {
    href: '/arcade/war',
    label: 'War (Arcade)',
    tag: 'High Card',
    desc: 'High-card vs the house on a packed rail with instant flips using BGRC chips.',
    icon: '/icons/game-war.png',
    mode: 'arcade',
  },
  {
    href: '/arcade/baccarat',
    label: 'Baccarat (Arcade)',
    tag: 'Arcade Table',
    desc: 'Player, Banker, Tie and Pair side bets using BGRC chips on the arcade rail.',
    icon: '/icons/game-baccarat.png',
    mode: 'arcade',
  },
  {
    href: '/arcade/video-poker',
    label: 'Video Poker (Arcade)',
    tag: 'Arcade Bar-Top',
    desc: 'Bar-top Jacks or Better running BGRC chips for free play.',
    icon: '/icons/game-video-poker1.png',
    mode: 'arcade',
  },
  {
    href: '/arcade/three-card-poker',
    label: 'Three Card Poker (Arcade)',
    tag: 'Arcade Feature',
    desc: 'Ante, Pair Plus, and Play bets vs the dealer mapped to BGRC chip flow.',
    icon: '/icons/game-three-card-poker.png',
    mode: 'arcade',
  },
]

const onchainGames = games.filter(g => g.mode === 'onchain')
const arcadeGames = games.filter(g => g.mode === 'arcade')

// Featured strip just under hero – puts table games + arcade in your face
const featuredGameHrefs = [
  '/play/blackjack',
  '/play/roulette',
  '/arcade/blackjack',
  '/arcade/craps',
  '/arcade/three-card-poker',
]
const featuredGames = games.filter(g => featuredGameHrefs.includes(g.href))

function FeaturedGameTile({ game }: { game: GameCard }) {
  const isArcade = game.mode === 'arcade'
  return (
    <Link
      href={game.href}
      className="min-w-[210px] flex-1 rounded-2xl border border-white/12 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.14),_transparent_55%),#020617] p-3 flex flex-col gap-2 hover:border-[#FFD700]/60 hover:shadow-[0_0_22px_rgba(251,191,36,0.4)] transition snap-start"
    >
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-xl border border-white/15 bg-black/80 overflow-hidden flex-shrink-0">
          <Image
            src={game.icon}
            alt={game.label}
            fill
            sizes="48px"
            className="object-contain p-1.5"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-white">
              {game.label}
            </span>
            <span className="text-[10px] uppercase font-semibold text-[#FFD700]/90">
              {game.tag}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-white/65 line-clamp-2">
            {game.desc}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-white/55 pt-1">
        <span>
          {isArcade ? 'Casino Arcade • BGRC chips for free play' : `On-Chain • ${TOKEN_SYMBOL} chips`}
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

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      <CashierComingSoonModal />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10 text-white">
        {/* Hero background image */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/bg-goldrush-hero-V2.png"
            alt="Base Gold Rush casino floor"
            fill
            priority
            sizes="100vw"
            className="object-cover md:object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.82),rgba(0,0,0,0.96))]" />
        </div>

        {/* subtle gold/blue overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.16),_transparent_60%)]" />

        <div className="relative z-10 mx-auto flex min-h-[460px] max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row md:items-center md:py-12">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/40 bg-black/70 px-3 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#FFD700]/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Base Gold Rush • On-Chain Casino & Casino Arcade
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow">
              Welcome to the <span className="text-[#FFD700]">Base Gold Rush</span>.
            </h1>

            <p className="max-w-xl text-sm text-white/72 md:text-base">
              This is the early-phase floor of the{' '}
              <span className="font-semibold text-[#FFD700]">
                {TOKEN_NAME} ({TOKEN_SYMBOL})
              </span>{' '}
              ecosystem. Play in the{' '}
              <span className="font-semibold text-emerald-300">Casino Arcade</span> with BGRC
              chips for free play, step into the{' '}
              <span className="font-semibold">on-chain testnet casino</span>, and sit down
              at fully on-chain{' '}
              <span className="font-semibold text-sky-300">live multiplayer tables</span> as
              they come online.
            </p>

            {/* Testnet guide banner */}
            <section className="mt-3 mb-2">
              <Link
                href="/base-sepolia-guide"
                className="block rounded-2xl border border-sky-400/40 bg-[radial-gradient(circle_at_left,_rgba(56,189,248,0.22),_transparent_60%),#020617] px-4 py-3 sm:px-6 sm:py-4 shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:brightness-110 transition-all duration-200 text-xs sm:text-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="font-semibold text-sky-300">
                    🧭 New to Base Sepolia? Learn how to add the network, get testnet ETH for gas, and
                    mint {TOKEN_SYMBOL} chips for On-Chain Games.
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-white bg-sky-500/20 border border-sky-300/40 px-3 py-1 rounded-full text-center">
                    Read the Guide →
                  </div>
                </div>
              </Link>
            </section>

            {/* Quick floor pills */}
            <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
              <Link
                href="/live-tables"
                className="rounded-full border border-amber-300/70 bg-amber-900/40 px-3 py-1 font-semibold text-amber-100 hover:bg-amber-800/70"
              >
                🃏 Poker Room & Live Tables
              </Link>
              <Link
                href="/arcade"
                className="rounded-full border border-emerald-300/70 bg-emerald-900/60 px-3 py-1 font-semibold text-emerald-100 hover:bg-emerald-800/80"
              >
                🎡 Casino Arcade (Free Play)
              </Link>
              <Link
                href="/onchain"
                className="rounded-full border border-[#FFD700]/70 bg-black/70 px-3 py-1 font-semibold text-[#FFD700] hover:bg-[#111827]"
              >
                🎰 On-Chain Casino (Testnet)
              </Link>
            </div>

            {/* pipeline strip */}
            <div className="mt-3 grid gap-2 text-[11px] md:text-xs">
              <div className="rounded-xl border border-white/10 bg-black/70 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="font-semibold text-emerald-300">
                  Phase 1 — On-Chain Testnet
                </div>
                <div className="text-white/70">
                  Slots, tables & RNG live on Base Sepolia with {TOKEN_SYMBOL} chips.
                </div>
              </div>
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-900/50 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="font-semibold text-emerald-200">
                  Phase 2 — Casino Arcade Flow
                </div>
                <div className="text-emerald-50/85">
                  Off-chain arcade floor tuned with BGRC chips before wiring the cashier and
                  contracts.
                </div>
              </div>
              <div className="rounded-xl border border-[#FFD700]/60 bg-[#111827]/85 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="font-semibold text-[#FFD700]">
                  Phase 3 — Base Mainnet Casino
                </div>
                <div className="text-white/80">
                  Regulated mainnet rollout for real-value chips, live tables, and tournaments
                  using BGRC/BGLD through the cashier.
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-3 grid max-w-md grid-cols-3 gap-2 text-[11px] text-white/70">
              <div className="rounded-xl border border-white/10 bg-black/55 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-white/40">
                  On-Chain Games
                </div>
                <div className="text-sm font-bold text-white">
                  {onchainGames.length}+ Live
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/55 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-white/40">
                  Casino Arcade
                </div>
                <div className="text-sm font-bold text-emerald-300">
                  {arcadeGames.length}+ Machines
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/55 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-white/40">
                  Chain
                </div>
                <div className="text-sm font-bold text-[#60a5fa]">Base</div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-white/55 max-w-lg">
              Arcade games are wallet-free for now. Connect a wallet from the header when
              you’re ready to mint testnet chips and play on-chain. Every arcade layout and
              table you see here is being prepared to become a fully on-chain, provably fair
              Base casino game.
            </div>
          </div>

          {/* Right-side hero pedestal */}
          <div className="relative z-0 flex-1 flex items-center justify-center mt-4 md:mt-0">
            <div className="relative w-[260px] sm:w-[320px] md:w-[420px]">
              <div className="relative h-[220px] sm:h-[260px] md:h-[320px] rounded-3xl overflow-hidden border border-[#FFD700]/35 bg-black shadow-[0_30px_90px_rgba(0,0,0,0.95)]">
                <Image
                  src="/images/hero-pedestal.png"
                  alt="Base Gold Rush chip pedestal"
                  fill
                  priority
                  sizes="420px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.35),transparent_65%)]" />
                <div className="absolute inset-x-0 bottom-14 flex justify-center">
                  <div className="relative w-40 h-40 sm:w-48 sm:h-48 md:w-60 md:h-60">
                    <Image
                      src="/chips/chip-bgrc-main.png"
                      alt={`${TOKEN_SYMBOL} chip`}
                      fill
                      className="object-contain chip-hero-anim select-none drop-shadow-[0_18px_40px_rgba(0,0,0,0.9)]"
                    />
                  </div>
                </div>
              </div>

              <div className="relative -mt-4 rounded-2xl border border-white/15 bg-black/85 px-4 py-3 text-xs text-white/70 shadow-[0_12px_30px_rgba(0,0,0,0.9)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/50">
                    {TOKEN_SYMBOL} Chip
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    Testnet Live
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-white font-semibold">Base Gold Rush</span>
                  <span className="text-[#FFD700] text-[11px] font-bold text-right">
                    Arcade Floor → On-Chain Casino → Live Tables
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED TABLE / ARCADE STRIP – right under hero */}
      <section className="mx-auto max-w-6xl px-4 pt-6 md:pt-8">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-sm md:text-base font-semibold text-white">
            Tonight’s Featured Tables & Arcade
          </h2>
          <span className="text-[11px] text-white/50">
            Blackjack, roulette, craps & three-card poker — arcade and on-chain.
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
          {featuredGames.map(game => (
            <FeaturedGameTile key={game.href} game={game} />
          ))}
        </div>
      </section>

      {/* HUB CARDS SECTION (Live Tables, Arcade, On-Chain) */}
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Choose your floor
            </h2>
            <p className="text-xs md:text-sm text-white/65">
              Start in the Casino Arcade with BGRC chips for free play, step into real
              on-chain testnet tables, and then join fully on-chain live pits — all powered
              by Base.
            </p>
          </div>
          <div className="text-[11px] text-white/50">
            The lobby will expand as new tables, jackpots, and live experiences come online.
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Live tables card */}
          <Link
            href="/live-tables"
            className="group relative overflow-hidden rounded-3xl border border-amber-300/60 bg-black/85 shadow-[0_22px_60px_rgba(0,0,0,0.95)]"
          >
            <div className="relative h-40 sm:h-48 md:h-56">
              <Image
                src="/images/live-tables-card-bg.png"
                alt="Live tables pit"
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
              <div className="absolute left-4 bottom-3">
                <div className="text-[11px] uppercase tracking-[0.24em] text-amber-200/90">
                  Live Table Games
                </div>
                <div className="text-lg sm:text-xl font-bold text-white">
                  Poker Room & Pits
                </div>
              </div>
            </div>
            <div className="px-4 py-3 text-[11px] sm:text-xs text-white/75 space-y-2">
              <p>
                Texas Hold’em first, then blackjack, craps, baccarat and more — real players
                sharing a rail, with Base contracts handling the final settlement layer.
              </p>
              <CasinoLiveStats variant="live" />
            </div>
            <div className="px-4 pb-4 text-[11px] text-amber-200 flex items-center justify-between">
              <span>Poker Room is live now — more tables light up from here.</span>
              <span className="font-semibold group-hover:translate-x-0.5 transition-transform">
                Enter Live Floor →
              </span>
            </div>
          </Link>

          {/* Arcade card */}
          <Link
            href="/arcade"
            className="group relative overflow-hidden rounded-3xl border border-emerald-300/50 bg-black/80 shadow-[0_22px_60px_rgba(0,0,0,0.9)]"
          >
            <div className="relative h-40 sm:h-48 md:h-56">
              <Image
                src="/images/arcade-card-bg1.png"
                alt="Arcade floor"
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute left-4 bottom-3">
                <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-200/90">
                  Casino Arcade
                </div>
                <div className="text-lg sm:text-xl font-bold text-white">
                  Free-Play Machines
                </div>
              </div>
            </div>
            <div className="px-4 py-3 text-[11px] sm:text-xs text-white/75 space-y-2">
              <p>
                Spin slots, flip cards, and roll dice with{' '}
                <span className="font-semibold text-emerald-300">
                  BGRC chips for free play
                </span>
                . No wallet required — this is the blueprint for the full Base mainnet pit.
              </p>
              <CasinoLiveStats variant="arcade" />
            </div>
            <div className="px-4 pb-4 text-[11px] text-emerald-200 flex items-center justify-between">
              <span>{arcadeGames.length}+ arcade machines & tables ready to play.</span>
              <span className="font-semibold group-hover:translate-x-0.5 transition-transform">
                Enter Arcade →
              </span>
            </div>
          </Link>

          {/* On-chain card */}
          <Link
            href="/onchain"
            className="group relative overflow-hidden rounded-3xl border border-sky-300/50 bg-black/80 shadow-[0_22px_60px_rgba(0,0,0,0.9)]"
          >
            <div className="relative h-40 sm:h-48 md:h-56">
              <Image
                src="/images/onchain-card-bg.png"
                alt="On-chain tables"
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
              <div className="absolute left-4 bottom-3">
                <div className="text-[11px] uppercase tracking-[0.24em] text-sky-200/90">
                  On-Chain Casino
                </div>
                <div className="text-lg sm:text-xl font-bold text-white">
                  Base Sepolia Tables
                </div>
              </div>
            </div>
            <div className="px-4 py-3 text-[11px] sm:text-xs text-white/75 space-y-2">
              <p>
                Play slots and tables with{' '}
                <span className="font-semibold text-sky-300">
                  {TOKEN_SYMBOL} chips
                </span>{' '}
                on Base Sepolia. These contracts are the dry run of the full Base mainnet
                casino and future BGRC/BGLD cashier.
              </p>
              <CasinoLiveStats variant="onchain" />
            </div>
            <div className="px-4 pb-4 text-[11px] text-sky-200 flex items-center justify-between">
              <span>{onchainGames.length}+ on-chain games live in rotation.</span>
              <span className="font-semibold group-hover:translate-x-0.5 transition-transform">
                Enter On-Chain →
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* CHIP FLOW STRIP */}
      <section className="mx-auto max-w-6xl px-4 pb-6 md:pb-8 text-[11px] md:text-sm text-white/70 space-y-3">
        <div className="rounded-2xl border border-white/12 bg-black/80 p-4 md:p-5 shadow-[0_18px_50px_rgba(0,0,0,0.85)]">
          <div className="text-xs md:text-sm font-semibold text-[#FFD700] mb-2">
            How BGRC chips flow through the Base Gold Rush casino
          </div>
          <p>
            <span className="font-semibold text-emerald-300">1. Casino Arcade:</span>{' '}
            You start with BGRC chips in free-play mode. No wallet, no gas — just feeling
            the true pacing of the slots, tables, and poker room before cash ever touches
            the felt.
          </p>
          <p>
            <span className="font-semibold text-sky-300">2. On-chain testnet:</span>{' '}
            The same games are wired into Base Sepolia with {TOKEN_SYMBOL} chips and smart
            contracts. This is where we dial in odds, edge, randomness and settlement.
          </p>
          <p>
            <span className="font-semibold text-[#FACC15]">3. BGRC/BGLD cashier:</span>{' '}
            Once the protocol is battle-tested, the cashier opens on Base mainnet. BGRC /
            BGLD flow through the same tables and arcade layouts you&apos;re playing with
            right now — same UX, same games, fully on-chain.
          </p>
          <p className="text-white/55 mt-2">
            If you&apos;re here early and playing with the free BGRC stack, you&apos;re
            literally helping shape how the first full Base-native Vegas floor is going to
            feel when real chips hit the table.
          </p>
        </div>
      </section>

      {/* Soft footer strip */}
      <section className="border-t border-white/10 bg-black/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-[11px] text-white/50 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-white/70">
              Heads up: entertainment only while on testnet.
            </div>
            <div>
              Mainnet chips, age gating, and full legal disclaimers will be added before
              real-value play.
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
