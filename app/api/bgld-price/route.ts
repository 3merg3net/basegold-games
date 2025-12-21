// app/api/bgld-price/route.ts
import { NextResponse } from 'next/server'

export const revalidate = 30

export async function GET() {
  const ca = (process.env.NEXT_PUBLIC_BGLD_CA || '').trim()
  if (!ca) {
    return NextResponse.json({ priceUsd: null, fdv: null, liquidity: null }, { status: 200 })
  }

  const url = `https://api.dexscreener.com/latest/dex/tokens/${ca}`
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 4000)

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      // helps a bit with some providers
      headers: { 'accept': 'application/json' },
    })

    clearTimeout(id)
    if (!res.ok) {
      return NextResponse.json({ priceUsd: null, fdv: null, liquidity: null }, { status: 200 })
    }

    const data = await res.json()
    const pairs = Array.isArray(data?.pairs) ? data.pairs : []

    // Prefer Base pairs, pick highest liquidity USD
    const basePairs = pairs.filter((p: any) => (p?.chainId || '').toLowerCase() === 'base')

    const best = (basePairs.length ? basePairs : pairs).reduce((acc: any, p: any) => {
      const liq = Number(p?.liquidity?.usd ?? 0)
      const accLiq = Number(acc?.liquidity?.usd ?? 0)
      return liq > accLiq ? p : acc
    }, null)

    const priceUsd = best ? Number(best.priceUsd) : null
    const fdv = best?.fdv ?? null
    const liquidity = best?.liquidity?.usd ?? null

    const safePrice =
  typeof priceUsd === 'number' && Number.isFinite(priceUsd) && priceUsd > 0
    ? priceUsd
    : null

return NextResponse.json(
  { priceUsd: safePrice, fdv, liquidity },
  { status: 200 }
)

  } catch {
    clearTimeout(id)
    return NextResponse.json({ priceUsd: null, fdv: null, liquidity: null }, { status: 200 })
  }
}
