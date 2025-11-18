export type CardDeck = { cards: number[] }

// 0..51 → rank / suit
export function cardRank(card: number): number {
  return (card % 13) + 2 // 2..14 (A = 14)
}
export function cardSuit(card: number): number {
  return Math.floor(card / 13) // 0..3
}

export function formatCard(card: number): { rank: string; suit: string; red: boolean } {
  const r = cardRank(card)
  const s = cardSuit(card)
  const rank =
    r === 14 ? 'A' : r === 13 ? 'K' : r === 12 ? 'Q' : r === 11 ? 'J' : String(r)
  const suits = ['♠', '♥', '♦', '♣'] as const
  const suit = suits[s]
  const red = suit === '♥' || suit === '♦'
  return { rank, suit, red }
}

export function dealCard(deck: CardDeck, hand: number[]): [CardDeck, number[]] {
  if (deck.cards.length === 0) return [deck, hand]
  const [top, ...rest] = deck.cards
  return [{ cards: rest }, [...hand, top]]
}

export function handTotal(cards: number[]): number {
  // Blackjack-style total (aces = 1 or 11)
  let sum = 0
  let aces = 0
  for (const c of cards) {
    const r = cardRank(c)
    if (r >= 11 && r <= 13) sum += 10
    else if (r === 14) {
      sum += 11
      aces++
    } else {
      sum += r
    }
  }
  while (sum > 21 && aces > 0) {
    sum -= 10
    aces--
  }
  return sum
}
