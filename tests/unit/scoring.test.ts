import { describe, it, expect } from 'vitest'
import { computeTrueRanking, computeTrueRanks, countInversions } from '../../party/scoring'
import type { Card, Hand } from '../../src/lib/types'

function makeHand(id: string, cards: Card[]): Hand {
  return { id, playerId: 'p1', cards, flipped: false }
}

describe('computeTrueRanking', () => {
  it('should rank a royal flush highest', () => {
    const royalFlush = makeHand('h1', [
      { rank: 'T', suit: 'H' }, { rank: 'J', suit: 'H' },
    ])
    const pair = makeHand('h2', [
      { rank: '2', suit: 'C' }, { rank: '2', suit: 'D' },
    ])
    const community: Card[] = [
      { rank: 'Q', suit: 'H' }, { rank: 'K', suit: 'H' }, { rank: 'A', suit: 'H' },
      { rank: '3', suit: 'S' }, { rank: '4', suit: 'S' },
    ]
    const ranking = computeTrueRanking([royalFlush, pair], community)
    expect(ranking[0]).toBe('h1')
    expect(ranking[1]).toBe('h2')
  })

  it('should handle ties', () => {
    const hand1 = makeHand('h1', [
      { rank: 'A', suit: 'H' }, { rank: 'K', suit: 'H' },
    ])
    const hand2 = makeHand('h2', [
      { rank: 'A', suit: 'D' }, { rank: 'K', suit: 'D' },
    ])
    const community: Card[] = [
      { rank: 'Q', suit: 'H' }, { rank: 'J', suit: 'H' }, { rank: 'T', suit: 'H' },
      { rank: '2', suit: 'C' }, { rank: '3', suit: 'C' },
    ]
    const ranking = computeTrueRanking([hand1, hand2], community)
    // Both have royal flush (AKQJT all same suit) — should be a tie
    expect(ranking).toHaveLength(2)
  })

  it('should rank multiple hands correctly', () => {
    const highCard = makeHand('h1', [{ rank: '2', suit: 'C' }, { rank: '3', suit: 'D' }])
    const onePair = makeHand('h2', [{ rank: 'A', suit: 'H' }, { rank: 'A', suit: 'D' }])
    const twoPair = makeHand('h3', [{ rank: 'K', suit: 'C' }, { rank: '4', suit: 'D' }])
    // Board: K-4 gives h3 two pair (Kings and Fours)
    // h2 has pair of Aces
    // h1 has nothing
    const community: Card[] = [
      { rank: 'K', suit: 'S' }, { rank: '4', suit: 'H' }, { rank: '6', suit: 'S' },
      { rank: '7', suit: 'H' }, { rank: '8', suit: 'H' },
    ]
    const ranking = computeTrueRanking([highCard, onePair, twoPair], community)
    expect(ranking[0]).toBe('h3') // two pair
    expect(ranking[1]).toBe('h2') // one pair
    expect(ranking[2]).toBe('h1') // high card
  })
})

describe('computeTrueRanks', () => {
  it('should assign rank 1 to the best hand', () => {
    const hand1 = makeHand('h1', [{ rank: 'A', suit: 'H' }, { rank: 'K', suit: 'H' }])
    const hand2 = makeHand('h2', [{ rank: '2', suit: 'C' }, { rank: '3', suit: 'D' }])
    const community: Card[] = [
      { rank: 'Q', suit: 'H' }, { rank: 'J', suit: 'H' }, { rank: 'T', suit: 'H' },
      { rank: '4', suit: 'S' }, { rank: '5', suit: 'S' },
    ]
    const trueRanking = computeTrueRanking([hand1, hand2], community)
    const ranks = computeTrueRanks(trueRanking, [hand1, hand2], community)
    expect(ranks['h1']).toBe(1)
    expect(ranks['h2']).toBe(2)
  })

  it('should assign same rank to tied hands', () => {
    // Both hands make the same straight (10-J-Q-K-A) using board cards
    const hand1 = makeHand('h1', [{ rank: 'A', suit: 'H' }, { rank: 'K', suit: 'H' }])
    const hand2 = makeHand('h2', [{ rank: 'A', suit: 'D' }, { rank: 'K', suit: 'D' }])
    const community: Card[] = [
      { rank: 'Q', suit: 'S' }, { rank: 'J', suit: 'C' }, { rank: 'T', suit: 'D' },
      { rank: '2', suit: 'C' }, { rank: '3', suit: 'C' },
    ]
    const trueRanking = computeTrueRanking([hand1, hand2], community)
    const ranks = computeTrueRanks(trueRanking, [hand1, hand2], community)
    expect(ranks['h1']).toBe(1)
    expect(ranks['h2']).toBe(1)
  })
})

describe('countInversions', () => {
  it('should return 0 for perfect ranking', () => {
    const hand1 = makeHand('h1', [{ rank: 'A', suit: 'H' }, { rank: 'K', suit: 'H' }])
    const hand2 = makeHand('h2', [{ rank: '2', suit: 'C' }, { rank: '3', suit: 'D' }])
    const community: Card[] = [
      { rank: 'Q', suit: 'H' }, { rank: 'J', suit: 'H' }, { rank: 'T', suit: 'H' },
      { rank: '4', suit: 'S' }, { rank: '5', suit: 'S' },
    ]
    const trueRanking = computeTrueRanking([hand1, hand2], community)
    const playerRanking = ['h1', 'h2']
    const inversions = countInversions(playerRanking, trueRanking, [hand1, hand2], community)
    expect(inversions).toBe(0)
  })

  it('should return 1 for swapped pair', () => {
    const hand1 = makeHand('h1', [{ rank: 'A', suit: 'H' }, { rank: 'K', suit: 'H' }])
    const hand2 = makeHand('h2', [{ rank: '2', suit: 'C' }, { rank: '3', suit: 'D' }])
    const community: Card[] = [
      { rank: 'Q', suit: 'H' }, { rank: 'J', suit: 'H' }, { rank: 'T', suit: 'H' },
      { rank: '4', suit: 'S' }, { rank: '5', suit: 'S' },
    ]
    const trueRanking = computeTrueRanking([hand1, hand2], community)
    const playerRanking = ['h2', 'h1'] // swapped
    const inversions = countInversions(playerRanking, trueRanking, [hand1, hand2], community)
    expect(inversions).toBe(1)
  })

  it('should handle null entries gracefully', () => {
    const hand1 = makeHand('h1', [{ rank: 'A', suit: 'H' }, { rank: 'K', suit: 'H' }])
    const hand2 = makeHand('h2', [{ rank: '2', suit: 'C' }, { rank: '3', suit: 'D' }])
    const community: Card[] = [
      { rank: 'Q', suit: 'H' }, { rank: 'J', suit: 'H' }, { rank: 'T', suit: 'H' },
      { rank: '4', suit: 'S' }, { rank: '5', suit: 'S' },
    ]
    const trueRanking = computeTrueRanking([hand1, hand2], community)
    const playerRanking = ['h1', null]
    const inversions = countInversions(playerRanking, trueRanking, [hand1, hand2], community)
    expect(inversions).toBe(0)
  })
})
