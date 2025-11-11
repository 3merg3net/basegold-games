'use client'
import MineGame from '@/components/MineGame'

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="text-3xl font-extrabold mb-5 text-[#FFD700]">MINE FOR GOLD</div>
      <MineGame />
    </main>
  )
}
