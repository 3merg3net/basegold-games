'use client'

import Image from 'next/image'

type Props = {
  open: boolean
  onClose: () => void
}

export default function CasinoCashierPreviewModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative z-[90] w-full max-w-xl rounded-3xl border border-[#FFD700]/40 bg-black/95 shadow-[0_30px_80px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Image header */}
        <div className="relative h-52 w-full">
          <Image
            src="/images/cashier-preview-hero.png"
            alt="Base Gold Rush Cashier"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#FFD700]/80">
                Cashier Preview
              </div>
              <div className="mt-1 text-lg font-extrabold text-white">
                $BGLD ⇄ GLD / PGLD Chips
              </div>
              <div className="mt-1 text-xs text-white/60">
                GLD: casino + blackjack • PGLD: poker tables
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 text-sm text-white/75 space-y-3">
          <p>
            This is a <span className="font-semibold text-[#FFD700]">preview</span> of the
            cashier flow where you&apos;ll swap{' '}
            <span className="font-semibold">$BGLD</span> into in-house gameplay chips:
            {' '}<span className="font-semibold">GLD</span> (casino floor) or{' '}
            <span className="font-semibold">PGLD</span> (poker tables).
          </p>

          <p className="text-xs text-white/60">
            Chips are tracked to your Global Casino ID in our database (not ERC-20 tokens).
            When the cage is fully live, deposits and cash-outs will route through smart
            contracts and pricing logic to keep chip value aligned to USD at time of swap,
            subject to availability, limits, and regional restrictions.
          </p>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-semibold text-white/85">How it will work</div>
              <ul className="list-disc list-inside text-white/65 space-y-0.5">
                <li>Select GLD (casino) or PGLD (poker)</li>
                <li>Deposit $BGLD → receive chips at equal USD value</li>
                <li>Play using chips, then cash out unused balance</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#FFD700]/40 bg-black/70 px-3 py-2 text-right">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#FFD700]/80">
                Status
              </div>
              <div className="text-sm font-bold text-white">
                Cashier UI • Settlement In Progress
              </div>
              <div className="mt-1 text-[11px] text-white/60">
                You&apos;re early to the floor.
              </div>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs">
          <div className="text-white/50">
            Early access may use demo credits until settlement is fully enabled.
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/30 bg-black/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white hover:border-[#FFD700]/70 hover:text-[#FFD700]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
