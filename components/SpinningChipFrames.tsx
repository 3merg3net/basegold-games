'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

const FRAMES = Array.from({ length: 24 }).map((_, i) => {
  const n = String(i + 1).padStart(2, '0')
  return `/chips/spin/chip-spin-${n}.png`
})

const FPS = 24

export default function SpinningChipFrames() {
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % FRAMES.length)
    }, 1000 / FPS)
    return () => clearInterval(interval)
  }, [])

  const src = FRAMES[frameIndex]

  return (
    <div className="relative flex items-center justify-center">

      {/* NEW: Hyper-realistic Vegas pedestal background */}
      <div
        className="
          absolute inset-0 
          bg-[url('/images/chip-pedestal-bg.png')]
          bg-cover bg-center bg-no-repeat
          opacity-90
          rounded-3xl
          shadow-[0_25px_60px_rgba(0,0,0,0.85)]
        "
      />

      {/* Glow directly under chip */}
      <div className="absolute h-40 w-40 rounded-full bg-[rgba(255,215,0,0.25)] blur-3xl pointer-events-none" />

      {/* CHIP FRAMES */}
      <Image
        key={src}
        src={src}
        alt="BGRC spinning chip"
        width={260}
        height={260}
        priority
        className="
          relative z-10 
          drop-shadow-[0_22px_65px_rgba(0,0,0,0.9)]
          select-none
        "
      />
    </div>
  )
}
