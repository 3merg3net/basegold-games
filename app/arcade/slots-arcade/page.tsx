// app/play/slots-arcade/page.tsx
import SlotsArcade from '@/components/casino/arcade/SlotsArcade'

export default function SlotsArcadePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#020617] to-black text-white px-4 py-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <SlotsArcade />
      </div>
    </main>
  )
}
