'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useContractRead } from 'wagmi'
import Casino from '@/abis/BaseGoldCasino.json'

const CASINO = process.env.NEXT_PUBLIC_CASINO_CA as `0x${string}`

function useAnimatedNumber(value: bigint, duration = 500) {
  const [display, setDisplay] = useState<number>(0)
  const prev = useRef<number>(0)
  useEffect(() => {
    const next = Number(value) / 1e18
    const start = prev.current
    const delta = next - start
    const t0 = performance.now()
    let raf = 0
    const loop = (t: number) => {
      const k = Math.min(1, (t - t0) / duration)
      setDisplay(start + delta * k)
      if (k < 1) raf = requestAnimationFrame(loop)
      else prev.current = next
    }
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return display
}

export default function JackpotTicker() {
  const common = { address: CASINO, abi: (Casino as any).abi, watch: true } as const

  const mother = useContractRead({ ...common, functionName: 'jackpotMotherlode' })
  const lucky  = useContractRead({ ...common, functionName: 'jackpotLucky' })
  const quick  = useContractRead({ ...common, functionName: 'jackpotQuick' })

  // Coerce to bigint (safe)
  const m = mother.data ? (mother.data as unknown as bigint) : 0n
  const l = lucky.data  ? (lucky.data  as unknown as bigint) : 0n
  const q = quick.data  ? (quick.data  as unknown as bigint) : 0n

  const mA = useAnimatedNumber(m)
  const lA = useAnimatedNumber(l)
  const qA = useAnimatedNumber(q)

  const items = useMemo(() => ([
    { label: 'MOTHERLODE',  value: mA, raw: m, hot: m > 200_000n * 10n**18n },
    { label: 'LUCKY STRIKE',value: lA, raw: l, hot: l > 120_000n * 10n**18n },
    { label: 'QUICK HIT',   value: qA, raw: q, hot: q > 80_000n  * 10n**18n },
  ]), [mA,lA,qA,m,l,q])

  return (
    <div className="relative">
      {/* Glow frame */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/20 via-cyan-400/15 to-yellow-400/20 blur-[10px] animate-pulse" />
      <div className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-black via-[#0a0a0f] to-black border border-white/10">
        {/* Shimmer line */}
        <div className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[marqueeGlow_2.8s_linear_infinite]" />
        <div className="max-w-6xl mx-auto py-2 flex items-center gap-4">
          <span className="text-[#FFD700] font-extrabold tracking-wide">JACKPOTS</span>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {items.map((it) => (
              <div key={it.label} className="flex items-center justify-between rounded-lg px-3 py-1.5 bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">{it.label}</span>
                  {it.hot && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/90 text-white font-bold">HOT</span>}
                </div>
                <div className="font-black text-white tabular-nums">{Math.floor(it.value).toLocaleString()} BGLD</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Local CSS for the shimmer sweep */}
      <style jsx>{`
        @keyframes marqueeGlow {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
      `}</style>
    </div>
  )
}
