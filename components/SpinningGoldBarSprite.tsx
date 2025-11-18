'use client'

import { useEffect, useState } from 'react'

const FRAME_COLS = 8
const FRAME_ROWS = 3
const TOTAL_FRAMES = FRAME_COLS * FRAME_ROWS

// size of ONE frame in the sprite (px) – tweak if needed
const FRAME_WIDTH = 256
const FRAME_HEIGHT = 256

const FPS = 24

export default function SpinningGoldBarSprite() {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setFrame(f => (f + 1) % TOTAL_FRAMES)
    }, 1000 / FPS)
    return () => clearInterval(id)
  }, [])

  const col = frame % FRAME_COLS
  const row = Math.floor(frame / FRAME_COLS)

  const backgroundPosition = `-${col * FRAME_WIDTH}px -${row * FRAME_HEIGHT}px`

  return (
    <div
      className="relative mx-auto"
      style={{
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        backgroundImage: "url('/chips/goldbar-sprite.png')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${FRAME_COLS * FRAME_WIDTH}px ${
          FRAME_ROWS * FRAME_HEIGHT
        }px`,
        backgroundPosition,
      }}
    />
  )
}
