'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

export type SlotSymbolKey = 'coin' | 'nugget' | 'vault' | 'goldpan'

type Props = {
  symbol: SlotSymbolKey
  /** Folder in /public where the PNGs live */
  basePath?: string // default: /images/slots/goldpan
  /** If true, glow gently pulses */
  idle?: boolean
  /** One-shot “spark flash” (win/trigger) */
  flashSpark?: boolean
  /** Stronger glow for highlight moments */
  highlight?: boolean
  /** Optional: slightly bigger “pop” */
  pop?: boolean
  className?: string
}

export default function SlotSymbol({
  symbol,
  basePath = '/images/slots/goldpan',
  idle = true,
  flashSpark = false,
  highlight = false,
  pop = false,
  className = '',
}: Props) {
  const [sparkOn, setSparkOn] = useState(false)

  // One-shot spark flash (auto turns off)
  useEffect(() => {
    if (!flashSpark) return
    setSparkOn(true)
    const t = setTimeout(() => setSparkOn(false), 380)
    return () => clearTimeout(t)
  }, [flashSpark])

  const src = useMemo(() => {
    const base = `${basePath}/sym-${symbol}-base.png`
    const glow = `${basePath}/sym-${symbol}-glow.png`
    const spark = `${basePath}/sym-${symbol}-spark.png`
    return { base, glow, spark }
  }, [basePath, symbol])

  return (
    <div
      className={[
        'relative w-full h-full',
        pop ? 'animate-[slotPop_220ms_ease-out]' : '',
        className,
      ].join(' ')}
    >
      {/* Glow layer */}
      <div
        className={[
          'absolute inset-0',
          idle ? 'animate-[slotGlow_2.4s_ease-in-out_infinite]' : '',
        ].join(' ')}
        style={{
          opacity: highlight ? 0.75 : 0.35,
          transform: highlight ? 'scale(1.12)' : 'scale(1.05)',
          transition: 'opacity 180ms ease, transform 180ms ease',
        }}
      >
        <Image
          src={src.glow}
          alt=""
          fill
          className="object-contain select-none pointer-events-none"
          priority={false}
        />
      </div>

      {/* Base layer */}
      <Image
        src={src.base}
        alt={symbol}
        fill
        className="object-contain select-none pointer-events-none"
        priority={false}
      />

      {/* Spark layer (one-shot) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: sparkOn ? 1 : 0,
          transform: sparkOn ? 'scale(1.06)' : 'scale(1.0)',
          transition: 'opacity 120ms ease, transform 120ms ease',
        }}
      >
        <Image
          src={src.spark}
          alt=""
          fill
          className="object-contain select-none pointer-events-none"
          priority={false}
        />
      </div>

      {/* Local keyframes (Tailwind-safe) */}
      <style jsx>{`
        @keyframes slotGlow {
          0% {
            opacity: 0.28;
            transform: scale(1.03);
          }
          50% {
            opacity: 0.45;
            transform: scale(1.07);
          }
          100% {
            opacity: 0.28;
            transform: scale(1.03);
          }
        }
        @keyframes slotPop {
          0% {
            transform: scale(1);
          }
          55% {
            transform: scale(1.06);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
