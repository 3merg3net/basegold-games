// lib/poker/engine.ts
import type { Card, Rank, Suit, Player } from "./types";

export const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
export const RANKS: Rank[] = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

/** Commit→reveal helpers (demo): FNV-1a 32-bit hex for the commit string */
export function seedCommit(seed: string) {
  const c = fnv1aHex(seed);
  return { s: seed, c };
}
export function verifySeed(seed: string, commit: string) {
  return fnv1aHex(seed) === commit;
}
function fnv1aHex(str: string) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Build a 52-card deck and shuffle via Fisher–Yates using a seed-based PRNG */
export function buildShuffledDeck(seed: string): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ suit: s, rank: r });

  // simple PRNG from seed (splitmix32-ish)
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  function rnd() {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Dealing helpers */
export function dealPreflop(table: Player[], deck: Card[]) {
  const t = structuredClone(table);
  const d = [...deck];

  // simple clockwise order (SB first)
  const seats = t.map((_, i) => i);
  for (let r = 0; r < 2; r++) {
    for (const idx of seats) {
      const p = t[idx];
      if (p.inHand && !p.folded) (p.hole as Card[]).push(d.pop()!);
    }
  }
  return { tableAfter: t, deckAfter: d };
}
export function dealFlop(deck: Card[]) {
  const d = [...deck];
  d.pop(); // burn
  const b = [d.pop()!, d.pop()!, d.pop()!];
  return { b, d };
}
export function dealTurn(deck: Card[]) {
  const d = [...deck];
  d.pop(); // burn
  return { card: d.pop()!, deck: d };
}
export function dealRiver(deck: Card[]) {
  const d = [...deck];
  d.pop(); // burn
  return { card: d.pop()!, deck: d };
}

/** Advance seat pointer (skips nothing for demo; checks stack >= 0 to be safe) */
export function nextPosition(cur: number, n: number, table: Player[]) {
  for (let i = 1; i <= n; i++) {
    const idx = (cur + i) % n;
    if (table[idx].stack >= 0) return idx;
  }
  return cur;
}

/** Hand evaluation (compact demo version) */
const RANK_VALUE: Record<Rank, number> = {
  A: 14, K: 13, Q: 12, J: 11, T: 10, 9: 9, 8: 8, 7: 7, 6: 6, 5: 5, 4: 4, 3: 3, 2: 2,
};

export function evaluateBestFive(hole: Card[], board: Card[]) {
  const cards = [...hole, ...board];
  let bestValue = -1;
  let best: Card[] = [];

  const n = cards.length;
  function choose(start: number, pick: Card[]) {
    if (pick.length === 5) {
      const v = handScore(pick);
      if (v > bestValue) {
        bestValue = v;
        best = [...pick];
      }
      return;
    }
    for (let i = start; i < n; i++) choose(i + 1, [...pick, cards[i]]);
  }
  choose(0, []);
  return { value: bestValue, best };
}

/** Encode rank; categories: SF(8), Quads(7), FH(6), Flush(5), Straight(4), Trips(3), TwoPair(2), Pair(1), High(0) */
function handScore(cards: Card[]) {
  const ranks = cards.map((c) => RANK_VALUE[c.rank]).sort((a, b) => b - a);
  const suitBuckets: Record<string, Card[]> = {} as any;
  const count: Record<number, number> = {};
  for (const c of cards) {
    (suitBuckets[c.suit] ||= []).push(c);
    count[RANK_VALUE[c.rank]] = (count[RANK_VALUE[c.rank]] || 0) + 1;
  }

  const isFlush = Object.values(suitBuckets).some((arr) => arr.length === 5);
  const straightHigh = straightHighRank(ranks);

  if (isFlush && straightHigh) return pack(8, [straightHigh]);

  const kinds = Object.entries(count)
    .map(([r, c]) => ({ r: +r, c }))
    .sort((a, b) => b.c - a.c || b.r - a.r);

  if (kinds[0]?.c === 4) return pack(7, [kinds[0].r, kickerOf(ranks, [kinds[0].r])[0]]);
  if (kinds[0]?.c === 3 && kinds[1]?.c === 2) return pack(6, [kinds[0].r, kinds[1].r]);
  if (isFlush) return pack(5, ranks);
  if (straightHigh) return pack(4, [straightHigh]);
  if (kinds[0]?.c === 3) return pack(3, [kinds[0].r, ...kickerOf(ranks, [kinds[0].r]).slice(0, 2)]);
  if (kinds[0]?.c === 2 && kinds[1]?.c === 2)
    return pack(2, [
      Math.max(kinds[0].r, kinds[1].r),
      Math.min(kinds[0].r, kinds[1].r),
      kickerOf(ranks, [kinds[0].r, kinds[1].r])[0],
    ]);
  if (kinds[0]?.c === 2) return pack(1, [kinds[0].r, ...kickerOf(ranks, [kinds[0].r]).slice(0, 3)]);
  return pack(0, ranks);
}

function pack(category: number, tie: number[]) {
  // pack into sortable 32-bit: category high bits + tie breakers
  let v = category << 24;
  for (let i = 0; i < Math.min(4, tie.length); i++) v |= (tie[i] & 0xff) << (18 - i * 6);
  return v >>> 0;
}

function straightHighRank(ranks: number[]) {
  const set = new Set(ranks);
  // wheel A-2-3-4-5
  if ([14, 5, 4, 3, 2].every((x) => set.has(x))) return 5;
  for (let hi = 14; hi >= 5; hi--) {
    const seq = [hi, hi - 1, hi - 2, hi - 3, hi - 4];
    if (seq.every((x) => set.has(x))) return hi;
  }
  return 0;
}
function kickerOf(ranks: number[], exclude: number[]) {
  const ex = new Set(exclude);
  return ranks.filter((r) => !ex.has(r));
}

export function formatHandRank(v: number) {
  const cat = v >>> 24;
  const names = ["High Card", "Pair", "Two Pair", "Trips", "Straight", "Flush", "Full House", "Quads", "Straight Flush"];
  return names[cat] || `Rank ${cat}`;
}
