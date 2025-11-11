'use client'
import React from 'react'

export default function StreakConfetti({ fire }: { fire: boolean }) {
  // purely visual, resets on `fire` changes
  return (
    <div className="pointer-events-none">
      {fire && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="relative w-[1px] h-[1px]">
            {Array.from({ length: 26 }).map((_, i) => (
              <span
                key={i}
                className="absolute w-1.5 h-3 rounded-sm"
                style={{
                  left: 0,
                  top: 0,
                  background:
                    i % 3 === 0 ? '#22d3ee' : i % 3 === 1 ? '#ffd700' : '#f59e0b',
                  transform: `translate(-50%,-50%) rotate(${(360 / 26) * i}deg)`,
                  animation: `burst 700ms ease-out forwards`,
                  boxShadow: '0 0 10px rgba(255,215,0,.6)',
                }}
              />
            ))}
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes burst {
          0% { transform: translate(-50%,-50%) scale(0.6); opacity: 1; }
          80% { transform: translate(-50%,-200%) scale(1); opacity: .9; }
          100% { transform: translate(-50%,-260%) scale(0.9); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
