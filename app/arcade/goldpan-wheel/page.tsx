import GoldPanWheelSlot from '@/components/casino/arcade/GoldPanWheelSlot'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <main className="min-h-[100dvh] w-full bg-black px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-6xl">
        <GoldPanWheelSlot />
      </div>
    </main>
  )
}
