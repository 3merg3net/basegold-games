'use client'
type Props = { motherlode: number; lucky: number; quick: number }

export default function JackpotBar({ motherlode, lucky, quick }: Props) {
  const fmt = (n:number) => n.toLocaleString()
  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="card p-5">
        <div className="text-white/70 text-sm">Motherlode Jackpot</div>
        <div className="text-3xl font-extrabold text-[#FFD700]">{fmt(motherlode)} BGRC</div>
        <div className="text-xs text-white/50">≈ $150 MCL</div>
      </div>
      <div className="card p-5">
        <div className="text-white/70 text-sm">Lucky Strike</div>
        <div className="text-3xl font-extrabold">{fmt(lucky)} BGRC</div>
      </div>
      <div className="card p-5">
        <div className="text-white/70 text-sm">Quick Pan Bonus</div>
        <div className="text-3xl font-extrabold">{fmt(quick)} BGRC</div>
      </div>
    </div>
  )
}
