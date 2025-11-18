'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function CashierAscensionModal() {
  const [open, setOpen] = useState(false)

  // reveal 2.5s after load
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 2500)
    return () => clearTimeout(t)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md">
      
      {/* PARTICLE FIELD */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 animate-particle-fade bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.12),transparent_70%)]" />
      </div>

      {/* MODAL */}
      <div
        className="
          relative w-[92%] max-w-xl overflow-hidden rounded-3xl 
          border border-[#FFD700]/60 shadow-[0_0_65px_rgba(0,0,0,0.85)]
          bg-black 
          animate-gold-outline
        "
      >
        
        {/* CINEMATIC IMAGE */}
        <div className="relative h-64 w-full overflow-hidden">
          <Image
            src="/images/cashier-cinematic.png"
            alt="Base Gold Rush Cashier"
            fill
            className="object-contain"
            priority
          />
          
          {/* Ascending gold shimmer */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent animate-shimmer-rise" />
        </div>

        {/* CONTENT */}
        <div className="p-6 pb-7 text-center space-y-3">
          
          {/* YOU ARE EARLY BADGE */}
          <div className="flex justify-center">
            <div className="
              px-3 py-1 rounded-full 
              bg-[#FFD700]/10 border border-[#FFD700]/30 
              text-[#FFD700] text-[10px] font-bold tracking-widest
              uppercase animate-holo-flash
            ">
              You Are Early
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-[#FFD700] tracking-wide drop-shadow">
            Mainnet Cashier Opening Soon
          </h2>

          <p className="text-white/70 text-sm leading-relaxed">
            Exchange <span className="text-[#FFD700] font-semibold"> $BGLD </span> 
            for <span className="text-emerald-300 font-semibold"> $BGRC casino chips </span>  
            on Base mainnet Coming Soon.
          </p>

          <p className="text-white/40 text-xs">
            Real-value play is almost here.
          </p>

          <button
            onClick={() => setOpen(false)}
            className="
              mt-2 rounded-full px-6 py-2 
              bg-[#FFD700] text-black font-bold text-sm 
              hover:brightness-110 transition
            "
          >
            Continue
          </button>
        </div>
      </div>

      {/* ANIMATION STYLES */}
      <style jsx>{`
        @keyframes shimmer-rise {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes holo-flash {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.5; }
        }

        @keyframes gold-outline {
          0% { box-shadow: 0 0 0px rgba(255,215,0,0.0); }
          100% { box-shadow: 0 0 28px rgba(255,215,0,0.35); }
        }

        .animate-shimmer-rise {
          animation: shimmer-rise 1.8s ease-out forwards;
        }
        .animate-holo-flash {
          animation: holo-flash 3s ease-in-out infinite;
        }
        .animate-gold-outline {
          animation: gold-outline 1.2s ease-out forwards;
        }
        .animate-particle-fade {
          animation: particle-fade 4s ease-in-out infinite alternate;
        }
        @keyframes particle-fade {
          0% { opacity: 0.16; }
          100% { opacity: 0.28; }
        }
      `}</style>
    </div>
  )
}
