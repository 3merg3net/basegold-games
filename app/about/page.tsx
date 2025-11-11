'use client'
export default function About(){
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-extrabold text-[#FFD700]">About Base Gold Rush</h2>
      <p className="text-white/70 mt-3">A modern Vegas × Old West mini-casino built for Base. Every play feeds the vault; every vault powers BGLD staking rewards.</p>
      <ul className="list-disc pl-6 mt-4 text-white/70">
        <li>Pan • Mine • Slots • Poker (Alpha)</li>
        <li>Jackpots: Motherlode, Lucky Strike, Quick Pan Bonus</li>
        <li>RTP targets ~60–65% depending on game</li>
      </ul>
      <p className="text-white/60 mt-4 text-sm">This is an alpha prototype; values are demo-only until contracts are wired.</p>
    </div>
  )
}
