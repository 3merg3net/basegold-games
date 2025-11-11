
'use client'
import Image from 'next/image'
const tools = [
  { name: 'Lucky Pan', desc: '+3% better outcomes for 10 plays', img:'/images/tool-pan.png', price: 2500 },
  { name: 'Pickaxe Boost', desc: '+5% for Mine game, 10 plays', img:'/images/tool-pickaxe.png', price: 5000 },
  { name: 'Prospector Pass', desc: 'Access high-limit tables for 24h', img:'/images/tool-pass.png', price: 15000 },
]
export default function Shop(){
  const fmt=(n:number)=>n.toLocaleString()
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-extrabold text-[#FFD700]">Tool Shop</h2>
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        {tools.map(t=> (
          <div key={t.name} className="card p-5">
            <Image src={t.img} alt="" width={64} height={64} className="rounded-lg"/>
            <div className="text-lg font-bold mt-2">{t.name}</div>
            <div className="text-sm text-white/70">{t.desc}</div>
            <div className="mt-3 font-semibold">{fmt(t.price)} BGLD</div>
            <button className="btn btn-cyan mt-3">BUY (Demo)</button>
          </div>
        ))}
      </div>
      <div className="text-xs text-white/60 mt-4">Purchases will feed the vault; effects apply off-chain for now.</div>
    </div>
  )
}
