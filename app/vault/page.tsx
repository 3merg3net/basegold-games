'use client'

export default function Vault() {
  const data = {
    totalVault: 12345678,
    todayInflow: 245000,
    stakers: 341,
    apy: 1275,
  }

  const fmt = (n: number) => n.toLocaleString()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-extrabold text-[#FFD700] mb-2">
        Reserve Vault Overview
      </h2>
      <p className="text-white/60 text-sm mb-6">
        Real-time vault inflows and Base Gold staking metrics. (Sample data for demo)
      </p>
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs opacity-70">Total Vault Balance</div>
          <div className="text-2xl font-bold text-[#FFD700]">{fmt(data.totalVault)} BGLD</div>
        </div>
        <div className="card p-4">
          <div className="text-xs opacity-70">24h Inflow</div>
          <div className="text-2xl font-bold">{fmt(data.todayInflow)} BGLD</div>
        </div>
        <div className="card p-4">
          <div className="text-xs opacity-70">Active Stakers</div>
          <div className="text-2xl font-bold">{fmt(data.stakers)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs opacity-70">Current APY</div>
          <div className="text-2xl font-bold text-cyan-400">{data.apy}%</div>
        </div>
      </div>
      <div className="mt-8 text-sm text-white/60">
        All vault inflows from Gold Rush games automatically reward long-term BGLD holders.
      </div>
    </div>
  )
}
