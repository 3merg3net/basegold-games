'use client'
import Image from 'next/image'
import Link from 'next/link'

type Props = {
  title: string
  description: string
  image: string
  entries: number[]
  href: string
}

export default function GameCard({ title, description, image, entries, href }: Props) {
  return (
    <div className="card p-5 flex flex-col">
      <div className="flex items-center gap-3">
        <Image src={image} alt="" width={56} height={56} className="rounded-lg" />
        <div>
          <div className="text-xl md:text-2xl font-bold">{title}</div>
          <div className="text-sm text-white/70">{description}</div>
        </div>
      </div>
      <div className="mt-4 flex gap-2 flex-wrap">
        {entries.map(v => (
          <span key={v} className="px-3 py-1 rounded-lg bg-white/10 text-sm text-white/80">$ {v}</span>
        ))}
      </div>
      <Link href={href} className="btn btn-cyan mt-5 self-start">PLAY</Link>
    </div>
  )
}
