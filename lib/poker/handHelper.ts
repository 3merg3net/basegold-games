// lib/poker/handHelper.ts

export type HandHelper = {
  label: string;   // e.g. "Flush (Ace-high)"
  category: number; // 0..8 (same scale as backend)
};

type Card = string; // "As", "Td"

const RANKS = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"] as const;

function rankValue(rank: string): number {
  const idx = RANKS.indexOf(rank as any);
  return idx >= 0 ? idx + 2 : 0; // 2..14
}

function buildRankScore(category: number, ranksDesc: number[]): number {
  const [r1, r2, r3, r4, r5] = [
    ranksDesc[0] ?? 0,
    ranksDesc[1] ?? 0,
    ranksDesc[2] ?? 0,
    ranksDesc[3] ?? 0,
    ranksDesc[4] ?? 0,
  ];
  return (
    category * 1e8 +
    r1 * 1e6 +
    r2 * 1e4 +
    r3 * 1e2 +
    r4 * 10 +
    r5
  );
}

/**
 * Evaluate EXACTLY 5 cards.
 * Returns:
 *  - category: 0..8   (0=High card, 1=Pair, 2=Two pair, 3=Trips,
 *                      4=Straight, 5=Flush, 6=Full house,
 *                      7=Four of a kind, 8=Straight flush)
 *  - ranksDesc: high->low ranks used for tie-breaking
 *  - rankName: human text ("Full house, Kings over Tens")
 */
type FiveEval = {
  category: number;
  ranksDesc: number[];
  rankName: string;
};

function evaluateFiveCards(cards: Card[]): FiveEval {
  if (cards.length !== 5) {
    throw new Error(`evaluateFiveCards expects 5 cards, got ${cards.length}`);
  }

  const ranks: number[] = cards.map((c) => rankValue(c[0]));
  const suits: string[] = cards.map((c) => c[1]);
  const uniqueRanksDesc = Array.from(new Set(ranks)).sort((a, b) => b - a);

  const rankCounts: Record<number, number> = {};
  const suitCounts: Record<string, number> = {};
  for (let i = 0; i < cards.length; i++) {
    const r = ranks[i];
    const s = suits[i];
    rankCounts[r] = (rankCounts[r] || 0) + 1;
    suitCounts[s] = (suitCounts[s] || 0) + 1;
  }

  const groups = Object.keys(rankCounts)
    .map((key) => {
      const r = Number(key);
      return { rank: r, count: rankCounts[r] };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.rank - a.rank;
    });

  const counts = groups.map((g) => g.count);
  const topRank = groups[0]?.rank ?? 0;
  const secondRank = groups[1]?.rank ?? 0;

  const labelRankPlural = (r: number) =>
    r === 14
      ? "Aces"
      : r === 13
      ? "Kings"
      : r === 12
      ? "Queens"
      : r === 11
      ? "Jacks"
      : `${r}s`;

  const labelRankHigh = (r: number) =>
    r === 14
      ? "Ace-high"
      : r === 13
      ? "King-high"
      : r === 12
      ? "Queen-high"
      : r === 11
      ? "Jack-high"
      : `${r}-high`;

  // ----- Straight detection (handle wheel A-5) -----
  let isStraight = false;
  let straightHigh = 0;

  const uniqAsc = Array.from(new Set(uniqueRanksDesc)).sort((a, b) => a - b);
  let arr = uniqAsc.slice();

  if (arr.includes(14)) {
    arr.push(1);
  }
  arr = Array.from(new Set(arr)).sort((a, b) => a - b);

  let bestSeqHigh = 0;
  let run: number[] = [arr[0]];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1] + 1) {
      run.push(arr[i]);
    } else if (arr[i] !== arr[i - 1]) {
      if (run.length >= 5) {
        const cand = run.slice(-5);
        const hi = cand[cand.length - 1];
        if (hi > bestSeqHigh) {
          bestSeqHigh = hi;
        }
      }
      run = [arr[i]];
    }
  }
  if (run.length >= 5) {
    const cand = run.slice(-5);
    const hi = cand[cand.length - 1];
    if (hi > bestSeqHigh) {
      bestSeqHigh = hi;
    }
  }

  if (bestSeqHigh > 0) {
    isStraight = true;
    straightHigh = bestSeqHigh === 1 ? 5 : bestSeqHigh;
  }

  // ----- Flush detection -----
  let flushSuit: string | null = null;
  for (const s of Object.keys(suitCounts)) {
    if (suitCounts[s] === 5) {
      flushSuit = s;
      break;
    }
  }
  const isFlush = !!flushSuit;

  // ----- Straight flush / Royal -----
  if (isFlush && isStraight) {
    const sfHigh = straightHigh;
    if (sfHigh === 14) {
      return {
        category: 8,
        ranksDesc: [14, 13, 12, 11, 10],
        rankName: "Royal flush",
      };
    }
    return {
      category: 8,
      ranksDesc: [sfHigh],
      rankName: `Straight flush (${labelRankHigh(sfHigh)})`,
    };
  }

  // ----- Four of a kind -----
  if (counts[0] === 4) {
    const quadRank = topRank;
    const kickerRank =
      uniqueRanksDesc.find((r) => r !== quadRank) ?? quadRank;
    return {
      category: 7,
      ranksDesc: [quadRank, kickerRank],
      rankName: `Four of ${labelRankPlural(quadRank)}`,
    };
  }

  // ----- Full house -----
  if (counts[0] === 3 && (counts[1] === 3 || counts[1] === 2)) {
    const tripRank = topRank;
    const pairRank = secondRank;
    return {
      category: 6,
      ranksDesc: [tripRank, pairRank],
      rankName: `Full house, ${labelRankPlural(
        tripRank
      )} over ${labelRankPlural(pairRank)}`,
    };
  }

  // ----- Flush -----
  if (isFlush) {
    const sortedFlush = ranks.slice().sort((a, b) => b - a);
    const top5 = sortedFlush.slice(0, 5);
    const high = top5[0];
    return {
      category: 5,
      ranksDesc: top5,
      rankName: `Flush (${labelRankHigh(high)})`,
    };
  }

  // ----- Straight -----
  if (isStraight) {
    return {
      category: 4,
      ranksDesc: [straightHigh],
      rankName: `Straight (${labelRankHigh(straightHigh)})`,
    };
  }

  // ----- Three of a kind -----
  if (counts[0] === 3) {
    const tripRank = topRank;
    const kickers = uniqueRanksDesc
      .filter((r) => r !== tripRank)
      .slice(0, 2);
    return {
      category: 3,
      ranksDesc: [tripRank, ...kickers],
      rankName: `Three of a kind (${labelRankPlural(tripRank)})`,
    };
  }

  // ----- Two pair -----
  if (counts[0] === 2 && counts[1] === 2) {
    const pair1 = topRank;
    const pair2 = secondRank;
    const hiPair = Math.max(pair1, pair2);
    const loPair = Math.min(pair1, pair2);
    const kicker =
      uniqueRanksDesc.find((r) => r !== hiPair && r !== loPair) ?? hiPair;
    return {
      category: 2,
      ranksDesc: [hiPair, loPair, kicker],
      rankName: `Two pair (${labelRankPlural(
        hiPair
      )} and ${labelRankPlural(loPair)})`,
    };
  }

  // ----- One pair -----
  if (counts[0] === 2) {
    const pairRank = topRank;
    const kickers = uniqueRanksDesc
      .filter((r) => r !== pairRank)
      .slice(0, 3);
    return {
      category: 1,
      ranksDesc: [pairRank, ...kickers],
      rankName: `Pair of ${labelRankPlural(pairRank)}`,
    };
  }

  // ----- High card -----
  const top5 = uniqueRanksDesc.slice(0, 5);
  const high = top5[0];
  const highLabel =
    high === 14
      ? "Ace"
      : high === 13
      ? "King"
      : high === 12
      ? "Queen"
      : high === 11
      ? "Jack"
      : `${high}`;
  return {
    category: 0,
    ranksDesc: top5,
    rankName: `High card ${highLabel}`,
  };
}

/**
 * Evaluate best 5-card hand out of N cards (N >= 5).
 * Works for flop (5 cards total), turn (6), river (7).
 */
function evaluateBestOfFive(cards: Card[]): FiveEval | null {
  const n = cards.length;
  if (n < 5) return null;

  let bestScore = -1;
  let best: FiveEval | null = null;

  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            const combo: Card[] = [
              cards[a],
              cards[b],
              cards[c],
              cards[d],
              cards[e],
            ];
            const ev = evaluateFiveCards(combo);
            const score = buildRankScore(ev.category, ev.ranksDesc);
            if (score > bestScore) {
              bestScore = score;
              best = ev;
            }
          }
        }
      }
    }
  }

  return best;
}

/**
 * Public helper for the hero HUD.
 * Returns null pre-flop; from flop onward returns best hand label + category.
 */
export function getHandHelper(
  hole: string[] | null,
  board: string[]
): HandHelper | null {
  if (!hole || hole.length < 2) return null;
  if (!board || board.length < 3) return null; // need at least flop

  const allCards: string[] = [...hole, ...board];
  const ev = evaluateBestOfFive(allCards);
  if (!ev) return null;

  return {
    label: ev.rankName,
    category: ev.category,
  };
}
