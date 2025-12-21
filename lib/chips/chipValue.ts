// lib/chips/chipValue.ts
export const USD_PER_CHIP = 0.01 // 100 chips = $1.00

export function chipsToUsd(chips: number) {
  return chips * USD_PER_CHIP
}

export function usdToChips(usd: number) {
  return Math.round((usd / USD_PER_CHIP) * 100) / 100 // keep 2 decimals if needed
}

export function formatUsdFromChips(chips: number) {
  return `$${chipsToUsd(chips).toFixed(2)}`
}
