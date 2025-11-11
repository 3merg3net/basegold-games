'use client'
import { useEffect, useState } from 'react'

type Props = {
  initialPlayed?: number
  initialFed?: number
  initialBurned?: number
}

export default function LiveTicker({
  initialPlayed = 128_450,
  initialFed = 7_520_000,
  initialBurned = 1_230_000
}: Props) {
  const [played, setPlayed] = useState(initialPlayed)
  const [fed, setFed] = useState(initialFed)
  const [burned, setBurned] = useState(initialBurned)

  // Demo pulse: bumps stats every few seconds
  useEffect(() => {
    const id = setInterval(() => {
      setPlayed(p => p + Math.floor(5 + Math.random() * 25))
      setFed(v => v + Math.floor(50 + Math.random() * 250))
      setBurned(v => v + Math.floor(Math.random() * 30))
    }, 2500)
    return () => clearInterval(id)
  }, [])

  const fmt = (n:number) => n.toLocaleString()

  return (
    <div className="w-full bg-black/50 border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-sm">
        <div className="flex gap-4 flex-wrap">
          <Stat label="Games Played" value={`${fmt(played)}`} />
          <Stat label="Vault Feed (Total)" value={`${fmt(fed)} BGLD`} accent="cyan" />
          <Stat label="BGLD Burned" value={`${fmt(burned)} BGLD`} />
        </div>
        <div className="text-white/60">
          <span className="text-cyan font-semibold">BASE</span> • Where Play Feeds the Vault™
        </div>
      </div>
    </div>
  )
}

function Stat({label, value, accent}:{label:string; value:string; accent?:'cyan'|'gold'}) {
  const color = accent === 'cyan' ? 'text-cyan' : accent === 'gold' ? 'text-gold' : 'text-white'
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/60">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  )
}
