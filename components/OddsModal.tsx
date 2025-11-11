'use client'
import { useState } from 'react'

export default function OddsModal() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-white"
      >
        View Odds & Payouts
      </button>
      {open && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur">
          <div className="w-[560px] max-w-[92vw] rounded-2xl border border-white/10 bg-[#0a0a0f] p-5">
            <div className="flex items-center justify-between">
              <div className="text-[#FFD700] font-extrabold tracking-wide">Mine — Odds & Payouts</div>
              <button onClick={()=>setOpen(false)} className="text-white/60 hover:text-white">✕</button>
            </div>
            <div className="mt-3 text-sm text-white/80">
              <p className="mb-3">Transparent, on-chain RNG. Typical feel targets (tune on-chain as needed):</p>
              <ul className="space-y-1 list-disc pl-5">
                <li><b>Quick Hit</b>: frequent small wins · ~1–3× stake bursts</li>
                <li><b>Lucky Strike</b>: mid wins · ~5–20× on rarer rolls</li>
                <li><b>Motherlode</b>: rare event · progressive pot</li>
              </ul>
              <p className="mt-3 text-white/60">Final odds/payouts are governed by the deployed contract parameters.</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
