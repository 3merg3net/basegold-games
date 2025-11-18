export const CHAIN = {
  BASE: 8453,
  BASE_SEPOLIA: 84532,
} as const;

export const CASINO_V1 = process.env.NEXT_PUBLIC_CASINO_V1_CA as `0x${string}`;
export const CASINO_V2 = process.env.NEXT_PUBLIC_CASINO_V2_CA as `0x${string}`;
export const BGLD      = process.env.NEXT_PUBLIC_BGLD_CA as `0x${string}`;

export const GAMES = {
  mine:       { contract: 'v1', fn: 'playMine' },          // keep V1 for now
  pan:        { contract: 'v2', fn: 'playPan' },
  slots:      { contract: 'v2', fn: 'playSlots' },
  blackjack:  { contract: 'v2', fn: 'playBlackjack' },
  hilo:       { contract: 'v2', fn: 'playHiLo' },
   war:        { contract: 'v2', fn: 'playWar' },          // “war” UI toggle later
  coinflip:   { contract: 'v2', fn: 'playCoinFlip' },
  roulette:   { contract: 'v2', fn: 'playRoulette' },
  videopoker: { contract: 'v2', fn: 'playVideoPoker' },
} as const;

export function casinoAddress(kind: 'v1'|'v2') {
  return kind === 'v1' ? CASINO_V1 : CASINO_V2;
}
