/**
 * Test the factory functions for creating test data
 */

import { describe, it, expect } from 'vitest'
import {
  createCard,
  createDeck,
  createHand,
  createPlayer,
  createPlayers,
  createBots,
  createGameState,
  createServerGameState,
  createLobbyState,
  createPreflopState,
  createFlopState,
  createTurnState,
  createRiverState,
  createRevealState,
  createAcquireRequest,
  createChatMessage,
  setRanking,
  flipHand,
  setPlayerReady,
  setAllPlayersReady,
  createCustomHand,
  PokerHandPresets,
} from './factories'
import type { GameState } from '../../src/lib/types'
import { assertGameStateInvariants, assertValidPlayers, assertValidHands } from './assertions'

describe('Card factories', () => {
  it('should create a card with rank and suit', () => {
    const card = createCard('A', 'H')
    expect(card.rank).toBe('A')
    expect(card.suit).toBe('H')
  })

  it('should create a full 52-card deck', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    expect(deck[0]).toEqual({ rank: '2', suit: 'H' })
    expect(deck[51]).toEqual({ rank: 'A', suit: 'S' })
  })

  it('should have all unique cards in deck', () => {
    const deck = createDeck()
    const uniqueCards = new Set(deck.map((c) => `${c.rank}${c.suit}`))
    expect(uniqueCards.size).toBe(52)
  })
})

describe('Hand factories', () => {
  it('should create a hand with cards', () => {
    const hand = createHand('player-1', 0, [
      createCard('A', 'H'),
      createCard('K', 'D'),
    ])
    expect(hand.id).toBe('player-1-0')
    expect(hand.playerId).toBe('player-1')
    expect(hand.cards).toHaveLength(2)
    expect(hand.flipped).toBe(false)
  })

  it('should create a hand without cards by default', () => {
    const hand = createHand('player-1', 0)
    expect(hand.cards).toHaveLength(0)
  })

  it('should create a flipped hand', () => {
    const hand = createHand('player-1', 0, [], true)
    expect(hand.flipped).toBe(true)
  })
})

describe('Player factories', () => {
  it('should create a player with defaults', () => {
    const player = createPlayer()
    expect(player.id).toMatch(/^player-/)
    expect(player.name).toBe('Test Player')
    expect(player.isCreator).toBe(false)
    expect(player.ready).toBe(false)
    expect(player.connected).toBe(true)
    expect(player.isBot).toBe(false)
  })

  it('should create a player with overrides', () => {
    const player = createPlayer({
      name: 'Custom Player',
      isCreator: true,
      ready: true,
    })
    expect(player.name).toBe('Custom Player')
    expect(player.isCreator).toBe(true)
    expect(player.ready).toBe(true)
  })

  it('should create multiple players', () => {
    const players = createPlayers(3)
    expect(players).toHaveLength(3)
    expect(players[0].isCreator).toBe(true)
    expect(players[1].isCreator).toBe(false)
    expect(players[2].isCreator).toBe(false)
  })

  it('should create bot players', () => {
    const bots = createBots(2)
    expect(bots).toHaveLength(2)
    expect(bots[0].isBot).toBe(true)
    expect(bots[1].isBot).toBe(true)
    expect(bots.every((b) => b.isCreator === false)).toBe(true)
  })
})

describe('GameState factories', () => {
  it('should create a minimal game state', () => {
    const state = createGameState()
    expect(state.phase).toBe('lobby')
    expect(state.players).toHaveLength(0)
    expect(state.hands).toHaveLength(0)
    expect(state.communityCards).toHaveLength(0)
  })

  it('should create a game state with overrides', () => {
    const state = createGameState({
      phase: 'preflop',
      handsPerPlayer: 2,
    })
    expect(state.phase).toBe('preflop')
    expect(state.handsPerPlayer).toBe(2)
  })

  it('should create a server game state', () => {
    const state = createServerGameState({
      phase: 'preflop',
    })
    expect('allCommunityCards' in state).toBe(true)
    expect(state.allCommunityCards).toEqual([])
  })

  it('should create a lobby state', () => {
    const state = createLobbyState(4, 2)
    expect(state.phase).toBe('lobby')
    expect(state.players).toHaveLength(4)
    expect(state.handsPerPlayer).toBe(2)
    assertValidPlayers(state.players)
  })

  it('should create a preflop state with dealt cards', () => {
    const state = createPreflopState(2, 1)
    expect(state.phase).toBe('preflop')
    expect(state.players).toHaveLength(2)
    expect(state.hands).toHaveLength(2)
    expect(state.communityCards).toHaveLength(0)
    expect(state.ranking).toEqual([null, null])

    // Each hand should have 2 cards
    state.hands.forEach((hand) => {
      expect(hand.cards).toHaveLength(2)
    })
    assertValidHands(state.hands, state.players)
    assertGameStateInvariants(state)
  })

  it('should create a flop state', () => {
    const state = createFlopState(2)
    expect(state.phase).toBe('flop')
    expect(state.communityCards).toHaveLength(3)
    assertGameStateInvariants(state)
  })

  it('should create a turn state', () => {
    const state = createTurnState(2)
    expect(state.phase).toBe('turn')
    expect(state.communityCards).toHaveLength(4)
    assertGameStateInvariants(state)
  })

  it('should create a river state', () => {
    const state = createRiverState(2)
    expect(state.phase).toBe('river')
    expect(state.communityCards).toHaveLength(5)
    assertGameStateInvariants(state)
  })

  it('should create a reveal state', () => {
    const state = createRevealState(2, 1, 0, 5)
    expect(state.phase).toBe('reveal')
    expect(state.trueRanking).not.toBeNull()
    expect(state.trueRanks).not.toBeNull()
    expect(state.revealIndex).toBe(0)
    expect(state.score).toBe(5)
    // Don't check invariants - this creates a state where score is set
    // but not all hands are flipped, which violates invariants
  })
})

describe('Helper functions', () => {
  it('should set ranking', () => {
    const state = createPreflopState(2, 1)
    const newState = setRanking(state, [state.hands[0].id, null])
    expect(newState.ranking).toEqual([state.hands[0].id, null])
  })

  it('should flip a hand', () => {
    const state = createPreflopState(1, 1)
    const newState = flipHand(state, state.hands[0].id)
    expect(newState.hands[0].flipped).toBe(true)
  })

  it('should set player ready state', () => {
    const state = createLobbyState(2)
    const newState = setPlayerReady(state, state.players[0].id, true)
    expect(newState.players[0].ready).toBe(true)
  })

  it('should set all players ready', () => {
    const state = createLobbyState(2)
    const newState = setAllPlayersReady(state)
    expect(newState.players.every((p) => p.ready)).toBe(true)
  })

  it('should create an acquire request', () => {
    const request = createAcquireRequest('acquire', 'player-1', 'hand-1', 'hand-2')
    expect(request.kind).toBe('acquire')
    expect(request.initiatorId).toBe('player-1')
    expect(request.initiatorHandId).toBe('hand-1')
    expect(request.recipientHandId).toBe('hand-2')
  })

  it('should create a chat message', () => {
    const msg = createChatMessage('player-1', 'Player 1', 'Hello!')
    expect(msg.id).toMatch(/^msg-/)
    expect(msg.playerId).toBe('player-1')
    expect(msg.playerName).toBe('Player 1')
    expect(msg.text).toBe('Hello!')
  })
})

describe('Custom hands', () => {
  it('should create a custom hand with specific cards', () => {
    const hand = createCustomHand('player-1', 0, [
      { rank: 'A', suit: 'H' },
      { rank: 'K', suit: 'D' },
    ])
    expect(hand.cards).toHaveLength(2)
    expect(hand.cards[0]).toEqual({ rank: 'A', suit: 'H' })
    expect(hand.cards[1]).toEqual({ rank: 'K', suit: 'D' })
  })
})

describe('Poker hand presets', () => {
  it('should create a royal flush', () => {
    const hand = PokerHandPresets.royalFlush('player-1')
    expect(hand.cards).toHaveLength(5)
    expect(hand.cards.every((c) => c.suit === 'H')).toBe(true)
    expect(hand.cards.map((c) => c.rank)).toEqual(['T', 'J', 'Q', 'K', 'A'])
  })

  it('should create a straight flush', () => {
    const hand = PokerHandPresets.straightFlush('player-1')
    expect(hand.cards).toHaveLength(5)
    expect(hand.cards.every((c) => c.suit === 'H')).toBe(true)
  })

  it('should create four of a kind', () => {
    const hand = PokerHandPresets.fourOfAKind('player-1')
    expect(hand.cards).toHaveLength(5)
    const aces = hand.cards.filter((c) => c.rank === 'A')
    expect(aces).toHaveLength(4)
  })

  it('should create a full house', () => {
    const hand = PokerHandPresets.fullHouse('player-1')
    expect(hand.cards).toHaveLength(5)
    const kings = hand.cards.filter((c) => c.rank === 'K')
    const queens = hand.cards.filter((c) => c.rank === 'Q')
    expect(kings).toHaveLength(3)
    expect(queens).toHaveLength(2)
  })

  it('should create a flush', () => {
    const hand = PokerHandPresets.flush('player-1')
    expect(hand.cards).toHaveLength(5)
    expect(hand.cards.every((c) => c.suit === 'H')).toBe(true)
  })

  it('should create a straight', () => {
    const hand = PokerHandPresets.straight('player-1')
    expect(hand.cards).toHaveLength(5)
    const ranks = hand.cards.map((c) => c.rank)
    expect(ranks).toEqual(['9', 'T', 'J', 'Q', 'K'])
  })

  it('should create three of a kind', () => {
    const hand = PokerHandPresets.threeOfAKind('player-1')
    expect(hand.cards).toHaveLength(5)
    const queens = hand.cards.filter((c) => c.rank === 'Q')
    expect(queens).toHaveLength(3)
  })

  it('should create two pair', () => {
    const hand = PokerHandPresets.twoPair('player-1')
    expect(hand.cards).toHaveLength(5)
    const jacks = hand.cards.filter((c) => c.rank === 'J')
    const tens = hand.cards.filter((c) => c.rank === 'T')
    expect(jacks).toHaveLength(2)
    expect(tens).toHaveLength(2)
  })

  it('should create one pair', () => {
    const hand = PokerHandPresets.onePair('player-1')
    expect(hand.cards).toHaveLength(5)
    const aces = hand.cards.filter((c) => c.rank === 'A')
    expect(aces).toHaveLength(2)
  })

  it('should create high card', () => {
    const hand = PokerHandPresets.highCard('player-1')
    expect(hand.cards).toHaveLength(5)
    // Just verify it has cards
    expect(hand.cards.length).toBeGreaterThan(0)
  })
})
