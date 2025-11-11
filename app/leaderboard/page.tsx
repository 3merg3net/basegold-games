
'use client'
const rows = [
  { name: 'Miner_Alfa', game: 'Slots', win: 1000000 },
  { name: 'PanMan', game: 'Pan', win: 50000 },
  { name: 'DeepDigger', game: 'Mine', win: 250000 },
  { name: 'BGLD_Whale', game: 'Slots', win: 750000 },
]
export default function Leaderboard(){
  const fmt = (n:number)=>n.toLocaleString()
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-extrabold text-[#FFD700]">Leaderboard</h2>
      <div className="card mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/10">
            <tr><th className="text-left p-3">Player</th><th className="text-left p-3">Game</th><th className="text-right p-3">Top Win (BGLD)</th></tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} className="border-t border-white/10">
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.game}</td>
                <td className="p-3 text-right">{fmt(r.win)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-white/60 mt-3">Live feed will stream recent wins here in phase 2.</div>
    </div>
  )
}
