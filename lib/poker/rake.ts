// lib/poker/rake.ts
// Simple rake calculation with “No Flop No Drop” and a cap
export function calcRake(
  pot: number,
  pct: number, // e.g. 0.05 = 5 %
  cap: number, // e.g. 1.0
  sawFlop: boolean
) {
  if (!sawFlop) return { rake: 0, capApplied: false };
  const raw = pot * pct;
  const rake = Math.min(raw, cap);
  return { rake, capApplied: rake === cap };
}
