'use client'
type Props = { prizePool: number; vaultFeed: number; treasury: number }

export default function StatsStrip({ prizePool, vaultFeed, treasury }: Props) {
  const fmt = (n:number) => n.toLocaleString()
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
      <div className="card p-5">
        <div className="text-white/60 text-sm">Prize Pool</div>
        <div className="text-2xl font-bold text-[#FFD700]">{fmt(prizePool)} BGRC</div>
      </div>
      <div className="card p-5">
        <div className="text-white/60 text-sm">Vault Feed (24h)</div>
        <div className="text-2xl font-bold text-[#00E5FF]">{fmt(vaultFeed)} BGRC</div>
      </div>
      <div className="card p-5">
        <div className="text-white/60 text-sm">Treasury Reserve</div>
        <div className="text-2xl font-bold">{fmt(treasury)} BGRC</div>
      </div>
    </div>
  )
}
