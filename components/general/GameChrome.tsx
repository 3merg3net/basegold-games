import type React from 'react'
import { Sparkles } from 'lucide-react'

type Props = {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export default function GameChrome({ title, subtitle, children }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-3 md:px-4 lg:px-6 py-4 md:py-6">
      {/* Top header bar */}
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/40 bg-gradient-to-r from-[#140b00] via-[#231300] to-[#140b00] px-3 py-1 shadow-[0_0_16px_rgba(255,215,0,0.35)]">
            <Sparkles className="h-4 w-4 text-[#FFD700]" />
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#FFE9A0]">
              Base Gold Rush Casino
            </span>
          </div>
          <h1 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_0_18px_rgba(0,0,0,0.6)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm md:text-base text-white/70 max-w-xl">
              {subtitle}
            </p>
          )}
        </div>

        {/* Small right info pill */}
        <div className="inline-flex items-center justify-end">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-black/60 to-black/80 px-3 py-2 text-right shadow-lg">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/60">
              Network
            </div>
            <div className="text-sm font-semibold text-[#9BE4FF]">
              Base Sepolia Testnet
            </div>
            <div className="mt-0.5 text-[11px] text-white/50">
              Demo only • No real BGLD yet
            </div>
          </div>
        </div>
      </div>

      {/* Main neon frame */}
      <div className="relative rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_10%_0%,#332000_0,transparent_45%),radial-gradient(circle_at_90%_0%,#332000_0,transparent_45%),linear-gradient(to_bottom,#050509,#06070c)] shadow-[0_24px_60px_rgba(0,0,0,0.7)] overflow-hidden">
        {/* Glow edges */}
        <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-white/10" />
        <div className="pointer-events-none absolute -inset-[1px] rounded-[24px] bg-[conic-gradient(from_180deg_at_50%_0%,rgba(255,215,0,0.4),transparent_12%,rgba(0,200,255,0.4),transparent_30%,rgba(255,215,0,0.35),transparent_48%,rgba(0,200,255,0.4),transparent_64%,rgba(255,215,0,0.45),transparent_82%,rgba(0,200,255,0.4),transparent_100%)] opacity-25" />
        <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFD700]/60 to-transparent opacity-70" />

        {/* Inner content padding */}
        <div className="relative z-10 p-3 md:p-5 lg:p-6">
          {children}
        </div>
      </div>

      {/* Bottom legal / vibe line */}
      <p className="mt-3 text-[11px] text-center text-white/45">
        On mainnet, all games will settle in real <span className="font-semibold text-[#FFD700]">BGRC</span>.
        Play responsibly. Have fun. ✨
      </p>
    </div>
  )
}
