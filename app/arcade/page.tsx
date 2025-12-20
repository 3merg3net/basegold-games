import Link from 'next/link'
import Image from 'next/image'
import { ArcadeWalletProvider } from '@/lib/useArcadeWallet'
import ArcadeWalletHUD from '@/components/casino/arcade/ArcadeWalletHUD'

const TOKEN_SYMBOL = process.env.NEXT_PUBLIC_TOKEN_SYMBOL ?? 'BGRC'
const TOKEN_NAME = process.env.NEXT_PUBLIC_TOKEN_NAME ?? 'Base Gold Rush Chip'

type GameCard = {
  href: string
  label: string
  tag: string
  desc: string
  icon: string
}

// ✅ ARCADE GAMES = CASINO GAMES (NO ON-CHAIN)
const games: GameCard[] = [
  {
    href: '/arcade/slots-arcade',
    label: 'Gold Rush Slots',
    tag: 'Slot Machine',
    desc: 'Hyper-real slot cabinet with free-play BGRC demo chips.',
    icon: '/icons/game-slots.png',
  },
  {
    href: '/arcade/blackjack',
    label: 'Blackjack',
    tag: 'Demo Table',
    desc: 'Multi-seat video blackjack with splits, doubles, and surrender.',
    icon: '/icons/game-blackjack1.png',
  },
  {
    href: '/arcade/roulette',
    label: 'Roulette',
    tag: 'Demo Machine',
    desc: 'Full multipliers, free demo credits, and a bar-top roulette vibe.',
    icon: '/icons/game-roulette1.png',
  },
  {
    href: '/arcade/craps',
    label: 'Craps',
    tag: 'Demo Table',
    desc: 'Pass line, field, props, hardways and full table layout.',
    icon: '/icons/game-craps1.png',
  },
  {
    href: '/arcade/baccarat',
    label: 'Baccarat',
    tag: 'Demo Table',
    desc: 'Player, Banker, Tie + pairs with a clean casino layout.',
    icon: '/icons/game-baccarat.png',
  },
  {
    href: '/arcade/video-poker',
    label: 'Video Poker',
    tag: 'Demo Machine',
    desc: 'Bar-top Jacks or Better with free-play credits.',
    icon: '/icons/game-video-poker1.png',
  },
  {
    href: '/arcade/three-card-poker',
    label: 'Three Card Poker',
    tag: 'Demo Table',
    desc: 'Ante, Pair Plus, and Play bets vs the dealer.',
    icon: '/icons/game-three-card-poker.png',
  },
  {
    href: '/arcade/war',
    label: 'War',
    tag: 'High Card',
    desc: 'Fast high-card battle vs the house with instant flips.',
    icon: '/icons/game-war.png',
  },
]

// Featured rail (arcade-only)
const featuredHrefs = ['/arcade/slots-arcade', '/arcade/blackjack', '/arcade/roulette']
const featuredGames = games.filter(g => featuredHrefs.includes(g.href))

function BigIconMarqueeCard({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string
  title: string
  subtitle: string
  icon: string
}) {
  return (
    <Link
      href={href}
      className={[
        'min-w-[230px] sm:min-w-[270px]',
        'rounded-2xl border border-white/15 hover:border-emerald-300/40',
        'bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.16),_transparent_55%),linear-gradient(to_bottom,#020617,#000)]',
        'transition shadow-[0_18px_50px_rgba(0,0,0,0.85)] group overflow-hidden',
      ].join(' ')}
    >
      {/* Icon area = the hero */}
      <div className="relative h-40 sm:h-44 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/85" />
        <div className="relative h-28 w-28 sm:h-32 sm:w-32">
          <Image
            src={icon}
            alt={title}
            fill
            className="object-contain drop-shadow-[0_0_18px_rgba(255,215,0,0.45)] transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="font-semibold text-white/95 text-sm truncate">{title}</div>
        <div className="text-[11px] text-white/55 truncate">{subtitle}</div>

        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-white/45">Tap to play</span>
          <span className="text-emerald-200/90 group-hover:translate-x-0.5 transition-transform">
            →
          </span>
        </div>
      </div>
    </Link>
  )
}

function GameCardTile({ game }: { game: GameCard }) {
  return (
    <Link
      href={game.href}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.09),_transparent_55%),linear-gradient(to_bottom,#020617,#020617)] p-4 transition hover:border-[#FFD700]/60 hover:shadow-[0_0_28px_rgba(251,191,36,0.45)]"
    >
      <div className="w-full flex items-center justify-center mb-3">
        <div className="relative w-[150px] h-[150px] md:w-[190px] md:h-[190px]">
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
        <h3 className="text-sm font-bold text-white md:text-base">{game.label}</h3>
        <span className="inline-flex items-center rounded-full border border-[#FFD700]/40 bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FFD700]/90">
          {game.tag}
        </span>
      </div>

      <p className="mt-1 text-xs text-white/65 md:text-[13px]">{game.desc}</p>

      <div className="mt-3 flex items-center justify-between text-[11px] text-white/60">
        <span>Free-play • {TOKEN_SYMBOL} credits</span>
        <span className="text-emerald-300 group-hover:translate-x-0.5 transition-transform">
          Play →
        </span>
      </div>
    </Link>
  )
}

function CasinoHeroCard() {
  return (
    <Link
      href="/arcade/slots-arcade"
      className="group relative mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#FFD700]/60 bg-black/90 shadow-[0_20px_60px_rgba(0,0,0,0.95)]"
    >
      <div className="relative w-full h-56 sm:h-72 md:h-80">
        <Image
          src="/images/casino-floor-wide.png"
          alt="Base Gold Rush casino floor"
          fill
          sizes="(max-width:768px) 100vw, 640px"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-black/85" />

        
      </div>

      <div className="flex flex-col items-center text-center gap-3 px-5 py-5 bg-black/90">
        <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
          Walk the <span className="text-[#FFD700]">Casino Floor</span>.
        </h2>
        <p className="text-xs sm:text-sm text-white/80 max-w-sm">
          Vegas pacing, clean tables, and demo chips. Real on-chain cashier comes later.
        </p>
        <div className="w-full max-w-xs flex flex-col gap-2">
          <div className="rounded-full bg-[#FFD700] px-6 py-2.5 text-sm sm:text-base font-semibold text-black shadow-[0_20px_55px_rgba(250,204,21,0.9)] group-hover:bg-yellow-400 transition text-center">
            Start Playing →
          </div>
          <span className="text-[11px] text-white/55">
            {TOKEN_NAME} ({TOKEN_SYMBOL}) • demo credits
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function CasinoLobbyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/casino-floor-wide.png"
            alt="Casino floor"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.92),rgba(0,0,0,0.985))]" />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.18),transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.14),transparent_55%)]" />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-7 px-4 py-8 md:py-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/45 bg-black/70 px-3 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#FFD700]/90">
              Base Gold Rush • Casino
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              The <span className="text-[#FFD700]">Casino Lobby</span>.
            </h1>

            <p className="max-w-2xl text-sm text-white/80 md:text-base">
              Your online ase Gold Rush Casino floor is open — spin, deal, and chase golden jackpots in the New Base Gold Rush.
            </p>

            <div className="flex flex-wrap gap-2 pt-1 text-[11px] sm:text-xs">
              <span className="rounded-full border border-emerald-300/60 bg-emerald-900/60 px-3 py-1 font-semibold text-emerald-100">
                Free Play Live
              </span>
              <span className="rounded-full border border-[#FFD700]/60 bg-black/70 px-3 py-1 font-semibold text-[#FFD700]">
                {TOKEN_SYMBOL} demo credits
              </span>
            </div>
          </div>

          {/* Big hero card */}
          <CasinoHeroCard />

          {/* BIG ICON MARQUEE (arcade casino games) */}
          <section className="pt-1">
            <div className="flex items-end justify-between gap-3 mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">
                  Casino Games
                </div>
                <h2 className="text-lg md:text-xl font-bold">Pick a game</h2>
              </div>
              <div className="text-[11px] text-white/45">Hover to pause</div>
            </div>

            <div className="relative bgr-marquee-wrap rounded-2xl">
              <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-black to-transparent z-10" />
              <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-black to-transparent z-10" />

              <div className="bgr-marquee-track gap-3 pr-3 py-1">
                {[...games, ...games].map((g, idx) => (
                  <BigIconMarqueeCard
                    key={`${g.href}-${idx}`}
                    href={g.href}
                    title={g.label}
                    subtitle={g.tag}
                    icon={g.icon}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* DEMO WALLET + GRID */}
      <ArcadeWalletProvider>
        <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <div className="mb-4 md:mb-6">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/60">
              Demo Credits
            </h3>
            <p className="mt-1 text-[11px] text-white/55">
              Use free {TOKEN_SYMBOL} credits in every game. No wallet prompts inside gameplay.
            </p>
          </div>

          <ArcadeWalletHUD />

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {games.map(game => (
              <GameCardTile key={game.href} game={game} />
            ))}
          </div>
        </section>
      </ArcadeWalletProvider>

      {/* SOFT LEGAL / INFO STRIP */}
      <section className="border-t border-white/10 bg-black/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-[11px] text-white/50 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-white/70">Entertainment only.</div>
            <div>Real-value play, age gating, and regional compliance arrive before mainnet chips.</div>
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
