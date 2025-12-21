'use client'

import Image from 'next/image'

export default function CasinoFullScreenLoader({
  label = 'Loading casino access…',
}: {
  label?: string
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 px-4">
      {/* Background image */}
      <div className="pointer-events-none absolute inset-0 opacity-25">
        <Image
          src="/images/agegate-bg.png"
          alt=""
          fill
          priority
          className="object-cover"
        />
      </div>

      {/* Center card */}
      <div className="relative w-full max-w-sm rounded-2xl border border-yellow-500/30 bg-neutral-950/95 p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <Image
            src="/images/goldrush-icon.png"
            alt="Base Gold Rush"
            width={30}
            height={30}
            className="rounded"
          />

          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.32em] text-white/55">
              Base Gold Rush
            </div>
            <div className="mt-1 text-sm font-semibold text-yellow-100">
              {label}
            </div>
          </div>

          {/* Spinner */}
          <div className="h-7 w-7 rounded-full border-2 border-white/15 border-t-yellow-400 animate-spin" />
        </div>

        <p className="mt-3 text-[11px] text-white/45 leading-relaxed">
          Syncing your Casino ID and access permissions…
        </p>
      </div>
    </div>
  )
}
