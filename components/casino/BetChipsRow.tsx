'use client'

import Image from 'next/image'

type ChipDef = {
  value: number
  label?: string
  img: string
}

const CHIP_SET: ChipDef[] = [
  { value: 1,    img: '/chips/chip-bgld-1.png' },
  { value: 5,    img: '/chips/chip-bgld-5.png' },
  { value: 25,   img: '/chips/chip-bgld-25.png' },
  { value: 100,  img: '/chips/chip-bgld-100.png' },
  { value: 500,  img: '/chips/chip-bgld-500.png' },
  { value: 1000, img: '/chips/chip-bgld-1000.png' },
]

export function BetChipsRow({
  bet,
  setBet,
  disabled,
}: {
  bet: number
  setBet: (v: number) => void
  disabled?: boolean
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-3">
      {CHIP_SET.map(chip => {
        const active = bet === chip.value
        return (
          <button
            key={chip.value}
            type="button"
            disabled={disabled}
            onClick={() => setBet(chip.value)}
            className={[
              'relative flex flex-col items-center gap-1',
              disabled ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-0.5 transition-transform',
            ].join(' ')}
          >
            <div
              className={[
                'rounded-full border-2 shadow-[0_8px_18px_rgba(0,0,0,0.7)] bg-black/40',
                active
                  ? 'border-[#FFD700] ring-2 ring-[#FFD700]/60'
                  : 'border-white/10',
              ].join(' ')}
            >
              <Image
                src={chip.img}
                alt={`${chip.value} BGRC chip`}
                width={64}
                height={64}
                className="rounded-full"
              />
            </div>
            <span
              className={[
                'text-[10px] font-semibold tracking-wide',
                active ? 'text-[#FFD700]' : 'text-white/70',
              ].join(' ')}
            >
              {chip.value.toLocaleString()} BGRC
            </span>
          </button>
        )
      })}
    </div>
  )
}
