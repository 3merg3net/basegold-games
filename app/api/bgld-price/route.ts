import { NextResponse } from 'next/server'

export const revalidate = 30 // ISR: 30s

export async function GET() {
  try {
    const ca = process.env.NEXT_PUBLIC_BGLD_CA
    if (!ca) return NextResponse.json({ priceUsd: null }, { status: 200 })

    const url = `https://api.dexscreener.com/latest/dex/tokens/${ca}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ priceUsd: null }, { status: 200 })

    const data = await res.json()
    const pair = data?.pairs?.[0]
    const priceUsd = pair ? Number(pair.priceUsd) : null
    const fdv = pair?.fdv ?? null
    const liquidity = pair?.liquidity?.usd ?? null

    return NextResponse.json({ priceUsd, fdv, liquidity }, { status: 200 })
  } catch {
    return NextResponse.json({ priceUsd: null }, { status: 200 })
  }
}
