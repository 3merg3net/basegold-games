'use client'

import Image from 'next/image'
import Link from 'next/link'
import StatsStrip from '@/components/StatsStrip'
import JackpotBar from '@/components/JackpotBar'

// optional: lightweight shimmer frame
function GlowFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-yellow-400/40 via-yellow-200/10 to-cyan-400/30">
      <div className="rounded-3xl bg-[#0a0b10]/90">{children}</div>
    </div>
  )
}

export default function Page() {
  return (
    <main className="relative overflow-hidden">
      {/* subtle background grid + spotlight */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_70%_-200px,rgba(255,215,0,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(700px_400px_at_15%_-150px,rgba(42,211,255,0.10),transparent_60%)]" />
      </div>

      {/* HERO */}
      <section className="relative">
        {/* hero art (kept modest) */}
        <div className="absolute inset-0 z-0 opacity-[0.35]">
    <Image
      src="/images/bg-vegas-circuit.png"
      alt="Base Gold Rush background"
      fill
      priority
      className="object-contain object-right-top"
    />
  </div>

        {/* content column + metrics; reserve space with min-height and small bottom padding */}
        <div className="mx-auto max-w-6xl px-6 pt-10 pb-6 md:pb-8 grid md:grid-cols-2 gap-8 items-center relative z-10 min-h-[340px] md:min-h-[380px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFD700] shadow-[0_0_12px_#FFD700]" />
              Live on Base — Progressive Jackpots
            </div>

            <h1 className="mt-3 text-4xl md:text-5xl font-extrabold leading-tight">
              Mine the Chain. <span className="text-[#FFD700]">Strike the Motherlode.</span>
            </h1>
            <p className="mt-3 text-white/75">
              Pan the river, dig the ridge, spin the reels — every play feeds jackpots, the vault, and the Base Gold treasury.
              Transparent odds. On-chain results. Vibes for days.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/play/mine" className="btn-gold">Start Mining</Link>
              <Link href="/play/slots" className="btn-cyan">Spin Gold Rush Slots</Link>
              <Link href="/jackpots" className="btn-dim">View Jackpots</Link>
            </div>

            {/* quick trust strip */}
            <div className="mt-6 flex items-center gap-4 text-xs text-white/50">
              <span>On-chain RNG</span>
              <span className="opacity-30">•</span>
              <span>Progressive pots</span>
              <span className="opacity-30">•</span>
              <span>Built for Base</span>
            </div>
          </div>

          {/* metrics card with glow */}
          <GlowFrame>
            <div className="p-5">
              <div className="flex items-center gap-3 pb-3">
                <Image src="/images/goldrush-icon.png" alt="BGLD" width={28} height={28} />
                <div className="text-sm font-bold text-white/80">Protocol Pulse</div>
              </div>
              <StatsStrip prizePool={2_340_000} vaultFeed={460_000} treasury={120_000} />
              <div className="text-[11px] text-white/50 mt-2 pl-1">* Demo metrics — contract hooks landing next.</div>
            </div>
          </GlowFrame>
        </div>
      </section>

      {/* JACKPOT MARQUEE */}
      <section className="px-6 mt-4 md:mt-6 relative z-10">
        <GlowFrame>
          <div className="p-4">
            <JackpotBar motherlode={5_000_000} lucky={2_750_000} quick={650_000} />
          </div>
        </GlowFrame>
      </section>

      {/* FEATURED MODES */}
      <section className="mx-auto max-w-6xl px-6 mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlowFrame>
          <Link href="/play/pan">
            <div className="p-5 group relative">
              <Image
                src="/images/icon-pan.png"
                alt="Pan for BGLD"
                width={900} height={600}
                className="w-full h-auto rounded-2xl border border-white/10"
              />
              <div className="mt-4">
                <div className="text-xl font-extrabold">Pan for BGLD</div>
                <p className="text-white/70 mt-1">Shake the pan — quick hits, fast dopamine. Great for warmups.</p>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="tag">Entry: $1</span>
                <span className="tag">Quick Hit</span>
              </div>
            </div>
          </Link>
        </GlowFrame>

        {/* on app/page.tsx under FEATURED MODES grid */}
<GlowFrame>
  <Link href="/video-poker">
    <div className="p-5 group relative">
      <img
        src="/images/icon-video-poker.png"
        alt="Video Poker"
        className="w-full h-auto rounded-2xl border border-white/10"
      />
      <div className="mt-4">
        <div className="text-xl font-extrabold">Video Poker</div>
        <p className="text-white/70 mt-1">
          Quick bets, clean payouts. Hold & draw on-chain.
        </p>
      </div>
      <div className="mt-3 flex gap-2">
        <span className="tag">Entry: $1–$5</span>
        <span className="tag">Demo (Sepolia)</span>
      </div>
    </div>
  </Link>
</GlowFrame>


        <GlowFrame>
          <Link href="/play/mine">
            <div className="p-5 group relative">
              <Image
                src="/images/icon-mine.png"
                alt="Mine for Gold"
                width={900} height={600}
                className="w-full h-auto rounded-2xl border border-white/10"
              />
              <div className="mt-4">
                <div className="text-xl font-extrabold">Mine for Gold</div>
                <p className="text-white/70 mt-1">Deeper swings, bigger thrills. Every play can trigger a jackpot.</p>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="tag">Entry: $5</span>
                <span className="tag">Lucky / Motherlode</span>
              </div>
            </div>
          </Link>
        </GlowFrame>

        <GlowFrame>
          <Link href="/play/slots">
            <div className="p-5 group relative">
              <Image
                src="/images/hero-slot-marquee.png"
                alt="Gold Rush Slots"
                width={900} height={600}
                className="w-full h-auto rounded-2xl border border-white/10"
              />
              <div className="mt-4">
                <div className="text-xl font-extrabold">Gold Rush Slots</div>
                <p className="text-white/70 mt-1">Modern Vegas energy with a progressive topper tied to play volume.</p>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="tag">Entry: $1 · $3 · $5 · $25</span>
                <span className="tag">Progressive</span>
              </div>
            </div>
          </Link>
        </GlowFrame>
      </section>

      {/* CTA STRIP */}
      <section className="mx-auto max-w-6xl px-6 mt-10">
        <GlowFrame>
          <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-white/80">Want higher limits, tool boosts, and VIP tables?</div>
            <div className="flex gap-3">
              <Link href="/shop" className="btn-cyan">Open Tool Shop</Link>
              <Link href="/jackpots" className="btn-gold">View Jackpots</Link>
            </div>
          </div>
        </GlowFrame>
      </section>

      {/* SUBTLE BOTTOM ORNAMENT */}
      <div className="pointer-events-none relative mt-12 h-24">
        <div className="absolute inset-x-0 -bottom-28 mx-auto h-40 w-[70%] rounded-full blur-3xl opacity-30 bg-[radial-gradient(closest-side,rgba(255,215,0,0.25),transparent)]" />
      </div>
    </main>
  )
}
