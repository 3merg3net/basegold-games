import Image from 'next/image'
import Link from 'next/link'

export default function CashierPreviewPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white">
      <section className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        <div className="relative rounded-3xl overflow-hidden border border-[#facc15]/40 shadow-[0_0_60px_rgba(0,0,0,0.9)]">
          <div className="relative h-56 md:h-72">
            <Image
              src="/images/cashier-preview-hero.png"
              alt="Base Gold Rush Cashier"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#facc15]/90">
                Coming Soon • Cashier Window
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow">
                Swap $BGLD ↔ BGRC Chips at the Cage
              </h1>
            </div>
          </div>

          <div className="bg-black/90 px-5 py-5 md:px-7 md:py-6 text-sm space-y-4">
            <p className="text-white/80">
              This is a preview of the on-chain cashier where you&apos;ll swap{' '}
              <span className="font-semibold">$BGLD</span> tokens for{' '}
              <span className="font-semibold">BGRC casino chips</span> on Base mainnet.
              Today, everything you see on Base Gold Rush still runs in{' '}
              <span className="font-semibold text-sky-300">testnet / demo</span> mode.
            </p>

            <div className="grid gap-3 md:grid-cols-3 text-[13px]">
              <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                  Step 1
                </div>
                <div className="mt-1 font-semibold">Deposit $BGLD</div>
                <p className="mt-1 text-white/70">
                  Send $BGLD into the cashier contract from your wallet.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                  Step 2
                </div>
                <div className="mt-1 font-semibold">Receive BGRC Chips</div>
                <p className="mt-1 text-white/70">
                  Get 1:1 BGRC chips credited for use across all tables &amp; slots.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                  Step 3
                </div>
                <div className="mt-1 font-semibold">Cash Out</div>
                <p className="mt-1 text-white/70">
                  Return BGRC to the cashier to redeem back into $BGLD.
                </p>
              </div>
            </div>

            <div className="pt-2 text-[12px] text-white/55 space-y-2">
              <p>
                Real-value play will require regional restrictions, age verification, and
                a full stack of responsible-gaming tooling before launch.
              </p>
              <p>
                For now, enjoy the{' '}
                <span className="font-semibold text-emerald-300">Demo Arcade</span> and{' '}
                <span className="font-semibold text-[#facc15]">Base Sepolia testnet</span>{' '}
                versions of the games.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-[13px]">
              <Link
                href="/"
                className="rounded-full bg-gradient-to-r from-[#22c55e] to-[#4ade80] px-4 py-2 text-sm font-bold text-black shadow-[0_0_16px_rgba(34,197,94,0.7)] hover:brightness-110"
              >
                Back to Base Gold Rush
              </Link>
              <Link
                href="/arcade/slots-arcade"
                className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
              >
                Jump into the Demo Arcade →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
