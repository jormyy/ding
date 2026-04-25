import { describe, it, expect } from 'vitest'
import { createDeck, shuffleDeck, dealCards } from '../../src/lib/deckUtils'

describe('createDeck', () => {
  it('should create a standard 52-card deck', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
  })

  it('should have 4 suits and 13 ranks', () => {
    const deck = createDeck()
    const suits = new Set(deck.map((c) => c.suit))
    const ranks = new Set(deck.map((c) => c.rank))
    expect(suits.size).toBe(4)
    expect(ranks.size).toBe(13)
  })

  it('should have unique cards', () => {
    const deck = createDeck()
    const keys = deck.map((c) => `${c.rank}-${c.suit}`)
    const unique = new Set(keys)
    expect(unique.size).toBe(52)
  })
})

describe('shuffleDeck', () => {
  it('should return a deck of the same length', () => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck)
    expect(shuffled).toHaveLength(52)
  })

  it('should contain the same cards', () => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck)
    const originalKeys = deck.map((c) => `${c.rank}-${c.suit}`).sort()
    const shuffledKeys = shuffled.map((c) => `${c.rank}-${c.suit}`).sort()
    expect(shuffledKeys).toEqual(originalKeys)
  })

  it('should not mutate the original deck', () => {
    const deck = createDeck()
    const originalFirst = deck[0]
    shuffleDeck(deck)
    expect(deck[0]).toEqual(originalFirst)
  })
})

describe('dealCards', () => {
  it('should deal 2 cards per hand', () => {
    const deck = createDeck()
    const { playerHands } = dealCards(deck, ['p1', 'p2'], 1)
    expect(playerHands['p1'][0]).toHaveLength(2)
    expect(playerHands['p2'][0]).toHaveLength(2)
  })

  it('should deal correct number of hands per player', () => {
    const deck = createDeck()
    const { playerHands } = dealCards(deck, ['p1', 'p2'], 3)
    expect(playerHands['p1']).toHaveLength(3)
    expect(playerHands['p2']).toHaveLength(3)
    expect(playerHands['p1'][2]).toHaveLength(2)
  })

  it('should deal 5 community cards', () => {
    const deck = createDeck()
    const { communityCards } = dealCards(deck, ['p1', 'p2'], 1)
    expect(communityCards).toHaveLength(5)
  })

  it('should not deal duplicate cards', () => {
    const deck = createDeck()
    const { playerHands, communityCards } = dealCards(deck, ['p1', 'p2', 'p3'], 2)
    const allCards = [
      ...communityCards,
      ...Object.values(playerHands).flatMap((hands) => hands.flat()),
    ]
    const keys = allCards.map((c) => `${c.rank}-${c.suit}`)
    const unique = new Set(keys)
    expect(unique.size).toBe(keys.length)
  })

  it('should return remaining deck', () => {
    const deck = createDeck()
    const { remainingDeck, communityCards } = dealCards(deck, ['p1', 'p2'], 1)
    // 2 players × 1 hand × 2 cards = 4 hole cards
    // 3 burn + 5 community = 8 board cards
    // total dealt = 12, remaining = 40
    expect(remainingDeck.length).toBe(40)
    expect(communityCards).toHaveLength(5)
  })
})
