'use client'
export default function Jackpots(){
  const fmt = (n:number)=>n.toLocaleString()
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-extrabold text-[#FFD700]">Jackpots</h2>
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="card p-5"><div className="text-white/70 text-sm">Motherlode Jackpot</div><div className="text-3xl font-extrabold text-[#FFD700]">{fmt(5000000)} BGLD</div><div className="text-xs opacity-70">≈ $150 MCL</div></div>
        <div className="card p-5"><div className="text-white/70 text-sm">Lucky Strike</div><div className="text-3xl font-extrabold">{fmt(2500000)} BGLD</div></div>
        <div className="card p-5"><div className="text-white/70 text-sm">Quick Pan Bonus</div><div className="text-3xl font-extrabold">{fmt(500000)} BGLD</div></div>
      </div>
      <p className="text-sm text-white/60 mt-6">Jackpots grow from a portion of every eligible play. Values shown are sample UI numbers; contract hooks coming next.</p>
    </div>
  )
}
