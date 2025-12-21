'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

export default function CashierAscensionModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 1200)
    return () => clearTimeout(t)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md px-4 pb-4 sm:pb-0">
      {/* Backdrop click to close */}
      <button
        aria-label="Close modal backdrop"
        className="absolute inset-0 cursor-default"
        onClick={() => setOpen(false)}
      />

      {/* Particle field */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 animate-particle-fade bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.12),transparent_70%)]" />
      </div>

      {/* Modal */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[#FFD700]/60 bg-black shadow-[0_0_65px_rgba(0,0,0,0.85)]">
        {/* Close button (always clickable) */}
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/70 p-2 text-white/80 hover:text-white hover:bg-black"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Scroll-safe container */}
        <div className="max-h-[85vh] overflow-y-auto">
          <div className="relative h-52 sm:h-64 w-full overflow-hidden">
            <Image
              src="/images/cashier-cinematic.png"
              alt="Base Gold Rush Cashier"
              fill
              className="object-contain"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent animate-shimmer-rise" />
          </div>

          <div className="p-5 sm:p-6 pb-6 text-center space-y-3">
            <div className="flex justify-center">
              <div className="px-3 py-1 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-[10px] font-bold tracking-widest uppercase animate-holo-flash">
                You Are Early
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-[#FFD700] tracking-wide drop-shadow">
              Cashier Upgrades Rolling Out
            </h2>

            <p className="text-white/70 text-sm leading-relaxed">
              The cashier is being finalized to support smooth chip access for both{' '}
              <span className="text-[#FFD700] font-semibold">GLD</span> (casino floor) and{' '}
              <span className="text-[#FFD700] font-semibold">PGLD</span> (poker tables).
            </p>

            <p className="text-white/45 text-xs">
              Early access may include demo credits while settlement and limits are finalized.
            </p>

            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full sm:w-auto rounded-full px-6 py-2 bg-[#FFD700] text-black font-bold text-sm hover:brightness-110 transition"
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer-rise {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes holo-flash {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.5; }
        }
        .animate-shimmer-rise { animation: shimmer-rise 1.2s ease-out forwards; }
        .animate-holo-flash { animation: holo-flash 3s ease-in-out infinite; }
        .animate-particle-fade { animation: particle-fade 4s ease-in-out infinite alternate; }
        @keyframes particle-fade {
          0% { opacity: 0.16; }
          100% { opacity: 0.28; }
        }
      `}</style>
    </div>
  )
}
