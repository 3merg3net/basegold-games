// app/base-sepolia-guide/page.tsx

import Link from 'next/link'

const TOKEN_SYMBOL = process.env.NEXT_PUBLIC_TOKEN_SYMBOL ?? 'BGRC'
const TOKEN_NAME = process.env.NEXT_PUBLIC_TOKEN_NAME ?? 'Base Gold Rush Chip'

export default function BaseSepoliaGuidePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050509] to-black text-white">
      {/* HERO */}
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.24),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(255,215,0,0.22),_transparent_55%)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:flex-row md:items-center md:py-14">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Network Guide • Base Sepolia
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              How to use{' '}
              <span className="text-sky-300">Base Sepolia Testnet</span>{' '}
              with <span className="text-[#FFD700]">{TOKEN_NAME}</span>.
            </h1>

            <p className="max-w-xl text-sm text-white/70 md:text-base">
              Base Sepolia is the test network for the{' '}
              <span className="font-semibold text-sky-300">Base</span> L2 chain.
              You&apos;ll use it to try all{' '}
              <span className="font-semibold text-[#FFD700]">
                Base Gold Rush
              </span>{' '}
              games safely with testnet ETH and testnet {TOKEN_SYMBOL} chips —
              no real money.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/"
                className="rounded-full bg-gradient-to-r from-[#FFD700] to-[#f97316] px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(251,191,36,0.7)] hover:brightness-110"
              >
                🎰 Back to Casino
              </Link>
            </div>
          </div>

          {/* Quick status card */}
          <div className="flex-1">
            <div className="mx-auto max-w-sm rounded-3xl border border-sky-300/50 bg-black/70 p-4 shadow-[0_0_40px_rgba(56,189,248,0.35)]">
              <div className="text-xs text-white/60 mb-2 flex items-center justify-between">
                <span className="font-semibold text-sky-300">
                  Testnet Checklist
                </span>
              </div>
              <ol className="space-y-2 text-xs text-white/70">
                <li>1. Install a wallet (MetaMask, Rainbow, etc.)</li>
                <li>2. Add the Base Sepolia network</li>
                <li>3. Get testnet ETH from a faucet</li>
                <li>4. Get testnet {TOKEN_SYMBOL}</li>
                <li>5. Connect wallet & start playing</li>
              </ol>
              <div className="mt-4 rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-[11px] text-white/60">
                <div className="font-semibold text-white/80 mb-1">
                  Important:
                </div>
                Testnet funds are{' '}
                <span className="font-semibold text-emerald-400">
                  not real money
                </span>
                . They&apos;re just for development and practice.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1 – What is Base Sepolia? */}
      <section className="mx-auto max-w-5xl px-4 py-8 md:py-10 space-y-6 text-sm md:text-base">
        <div className="space-y-2">
          <h2 className="text-xl font-bold md:text-2xl">
            1. What is Base Sepolia?
          </h2>
          <p className="text-white/70">
            <span className="font-semibold text-sky-300">Base</span> is a Layer 2
            (L2) network built on Ethereum, focused on speed and low fees.{' '}
            <span className="font-semibold">Base Sepolia</span> is its public{' '}
            <span className="font-semibold">testnet</span> — a sandbox where
            developers and players can interact with smart contracts using
            fake, free ETH.
          </p>
          <p className="text-white/70">
            When you play on Base Sepolia inside{' '}
            <span className="font-semibold text-[#FFD700]">
              Base Gold Rush
            </span>
            , everything feels like mainnet: you connect your wallet, sign
            transactions, and see results directly on-chain. The difference:
            all funds are testnet only.
          </p>
        </div>

        {/* SECTION 2 – Add network */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            2. Adding Base Sepolia to your wallet
          </h2>
          <p className="text-white/70">
            Most wallets (MetaMask, Rainbow, Rabby, etc.) let you connect to
            custom networks. To add Base Sepolia manually in MetaMask:
          </p>
          <div className="mt-2 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-xs md:text-sm">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">
                Network Settings
              </div>
              <ul className="space-y-1 text-white/80">
                <li>
                  <span className="font-semibold">Network Name:</span>{' '}
                  Base Sepolia
                </li>
                <li>
                  <span className="font-semibold">New RPC URL:</span>{' '}
                  (use a Base Sepolia RPC from Alchemy, QuickNode, or
                  another provider)
                </li>
                <li>
                  <span className="font-semibold">Chain ID:</span> 84532
                </li>
                <li>
                  <span className="font-semibold">Currency Symbol:</span>{' '}
                  ETH
                </li>
                <li>
                  <span className="font-semibold">Block Explorer URL:</span>{' '}
                  A Base Sepolia explorer (e.g. basescan testnet)
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-sky-400/40 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.20),_transparent_55%),#020617] p-4 text-xs md:text-sm">
              <div className="text-[11px] uppercase tracking-[0.2em] text-sky-200/90 mb-2">
                MetaMask Quick Path
              </div>
              <ol className="list-decimal space-y-1 pl-5 text-sky-50/90">
                <li>Open MetaMask, click the network dropdown.</li>
                <li>Select &quot;Add network&quot; &gt; &quot;Add manually&quot;.</li>
                <li>Fill in the Base Sepolia details above.</li>
                <li>Save, then switch to the new network.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* SECTION 3 – Getting testnet ETH */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            3. Getting testnet ETH (gas)
          </h2>
          <p className="text-white/70">
            To send transactions on Base Sepolia, you still pay gas — but the
            gas is in <span className="font-semibold">testnet ETH</span>, which
            you can request for free from a faucet.
          </p>
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-xs md:text-sm space-y-2">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">
              Typical Faucet Flow
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-white/80">
              <li>Make sure your wallet is set to the Base Sepolia network.</li>
              <li>Visit a Base Sepolia faucet (often provided by your RPC provider).</li>
              <li>Paste your wallet address and request testnet ETH.</li>
              <li>
                After a short delay, you should see a small balance of testnet
                ETH appear in your wallet.
              </li>
            </ol>
            <p className="text-[11px] text-white/60">
              Faucets usually have rate limits (for example: a small amount per
              day) to prevent abuse.
            </p>
          </div>
        </div>

        {/* SECTION 4 – Getting testnet BGRC chips */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            4. Getting testnet {TOKEN_SYMBOL} ({TOKEN_NAME})
          </h2>
          <p className="text-white/70">
            Inside Base Gold Rush, {TOKEN_SYMBOL} acts as your casino chip.
            You&apos;ll receive a testnet balance via whatever faucet or mint
            flow we provide (Telegram bot, claim page, or direct transfer).
          </p>
          <div className="rounded-2xl border border-[#FFD700]/40 bg-black/60 p-4 text-xs md:text-sm space-y-2">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#FFD700]/80">
              Typical Chip Flow
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-white/85">
              <li>Connect your wallet on the Base Sepolia network.</li>
              <li>
                Go to the {TOKEN_SYMBOL} faucet / claim page linked from the
                casino.
              </li>
              <li>Click &quot;Claim&quot; or &quot;Mint test chips&quot;.</li>
              <li>Sign the transaction in your wallet.</li>
              <li>
                After it confirms, you&apos;ll see a {TOKEN_SYMBOL} balance in
                your wallet and in the casino UI.
              </li>
            </ol>
            <p className="text-[11px] text-white/60">
              Limits may apply (e.g. a fixed amount per wallet) so everyone can
              test the games.
            </p>
          </div>
        </div>

        {/* SECTION 5 – Connecting & playing */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            5. Connecting to Base Gold Rush & playing
          </h2>
          <p className="text-white/70">
            Once your wallet is on Base Sepolia and you have testnet ETH +
            {` ${TOKEN_SYMBOL}`}, you&apos;re ready to play.
          </p>
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-xs md:text-sm space-y-2">
            <ol className="list-decimal space-y-1 pl-5 text-white/85">
              <li>Open the Base Gold Rush site.</li>
              <li>Click &quot;Connect Wallet&quot; in the header.</li>
              <li>Choose your wallet (MetaMask, Rainbow, etc.).</li>
              <li>
                If prompted, switch to <span className="font-semibold">Base Sepolia</span>.
              </li>
              <li>
                Visit a game page (Slots, Blackjack, Roulette, etc.), choose
                your stake, and approve {TOKEN_SYMBOL} the first time.
              </li>
              <li>After approval, place your bets and confirm in your wallet.</li>
            </ol>
            <p className="text-[11px] text-white/60">
              All results are stored on-chain, but remember: on testnet, wins
              and losses are just for fun and testing.
            </p>
          </div>
        </div>

        {/* SECTION 6 – Safety & limits */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold md:text-2xl">
            6. Safety, mainnet, and next steps
          </h2>
          <p className="text-white/70">
            Base Sepolia is the dry run for everything we&apos;ll later deploy
            to Base mainnet. It&apos;s where we test:
          </p>
          <ul className="list-disc pl-5 text-white/75 text-sm md:text-base space-y-1">
            <li>Game logic and edge cases</li>
            <li>Payout math and jackpot behavior</li>
            <li>Wallet UX, approvals, and error handling</li>
            <li>House risk, limits, and monitoring</li>
          </ul>
          <p className="text-white/70">
            When we&apos;re confident the system is stable, transparent, and
            fair, we&apos;ll open up mainnet play with real-value chips and
            stricter risk controls.
          </p>
          <div className="rounded-2xl border border-white/10 bg-black/80 p-4 text-[11px] md:text-sm text-white/60">
            <div className="font-semibold text-white/80 mb-1">
              Reminder:
            </div>
            Nothing on testnet is financial advice, and nothing here represents
            a promise of returns. Testnet chips are for experimentation and
            education only.
          </div>
        </div>

        {/* Back link */}
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#FFD700] hover:underline"
          >
            ← Back to Base Gold Rush lobby
          </Link>
        </div>
      </section>
    </main>
  )
}
