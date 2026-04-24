/**
 * Test data factories for creating GameState, Player, Hand, Card, and related objects.
 * Provides consistent, configurable test data for unit and integration tests.
 */

import type {
  Card,
  Hand,
  Player,
  GameState,
  ServerGameState,
  AcquireRequest,
  ChatMessage,
  Rank,
  Suit,
  Phase,
} from '../../src/lib/types'

/**
 * Create a card with the given rank and suit
 */
export function createCard(rank: Rank, suit: Suit): Card {
  return { rank, suit }
}

/**
 * Create a standard deck of 52 cards
 */
export function createDeck(): Card[] {
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
  const suits: Suit[] = ['H', 'D', 'C', 'S']
  const deck: Card[] = []
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

/**
 * Create a hand with optional cards
 */
export function createHand(
  playerId: string,
  handIndex: number,
  cards: Card[] = [],
  flipped: boolean = false
): Hand {
  return {
    id: `${playerId}-${handIndex}`,
    playerId,
    cards,
    flipped,
  }
}

/**
 * Create a player with configurable properties
 */
export function createPlayer(overrides: Partial<Player> = {}): Player {
  const defaults: Player = {
    id: `player-${Math.random().toString(36).substring(7)}`,
    connId: `conn-${Math.random().toString(36).substring(7)}`,
    name: 'Test Player',
    isCreator: false,
    ready: false,
    connected: true,
    isBot: false,
  }
  return { ...defaults, ...overrides }
}

/**
 * Create multiple players for testing
 */
export function createPlayers(count: number, startCreator = true): Player[] {
  const players: Player[] = []
  for (let i = 0; i < count; i++) {
    players.push(
      createPlayer({
        id: `player-${i}`,
        connId: `conn-${i}`,
        name: `Player ${i + 1}`,
        isCreator: startCreator && i === 0,
      })
    )
  }
  return players
}

/**
 * Create bot players
 */
export function createBots(count: number): Player[] {
  const bots: Player[] = []
  for (let i = 0; i < count; i++) {
    bots.push(
      createPlayer({
        id: `bot-${i}`,
        connId: `bot-conn-${i}`,
        name: `Bot ${i + 1}`,
        isBot: true,
        isCreator: false,
      })
    )
  }
  return bots
}

/**
 * Create a minimal game state
 */
export function createGameState(overrides: Partial<GameState> = {}): GameState {
  const defaults: GameState = {
    phase: 'lobby',
    players: [],
    handsPerPlayer: 1,
    communityCards: [],
    ranking: [],
    hands: [],
    revealIndex: 0,
    trueRanking: null,
    trueRanks: null,
    score: null,
    rankHistory: {},
    acquireRequests: [],
    chatMessages: [],
  }
  return { ...defaults, ...overrides }
}

/**
 * Create a server game state (with allCommunityCards)
 */
export function createServerGameState(
  overrides: Partial<ServerGameState> = {}
): ServerGameState {
  const gameState = createGameState(overrides) as ServerGameState
  const defaults: Partial<ServerGameState> = {
    allCommunityCards: overrides.communityCards || [],
  }
  return { ...gameState, ...defaults }
}

/**
 * Create a game in lobby phase
 */
export function createLobbyState(
  playerCount: number = 2,
  handsPerPlayer: number = 1
): GameState {
  const players = createPlayers(playerCount)
  const totalHands = playerCount * handsPerPlayer
  const ranking: (string | null)[] = Array(totalHands).fill(null)
  const rankHistory: Record<string, null> = {}
  // Add empty rank history entries for lobby phase
  for (let p = 0; p < playerCount; p++) {
    for (let h = 0; h < handsPerPlayer; h++) {
      const handId = `${players[p].id}-${h}`
      rankHistory[handId] = null
    }
  }
  return createGameState({
    phase: 'lobby',
    players,
    handsPerPlayer,
    ranking,
    rankHistory,
  })
}

/**
 * Create a game in preflop phase with cards dealt
 */
export function createPreflopState(
  playerCount: number = 2,
  handsPerPlayer: number = 1,
  deck?: Card[]
): GameState {
  const players = createPlayers(playerCount)
  const usedDeck = deck || createDeck()

  const hands: Hand[] = []
  let cardIndex = 0

  // Deal 2 cards per hand
  for (let p = 0; p < playerCount; p++) {
    for (let h = 0; h < handsPerPlayer; h++) {
      const cards = [usedDeck[cardIndex++], usedDeck[cardIndex++]]
      hands.push(createHand(players[p].id, h, cards))
    }
  }

  // Initialize ranking with nulls
  const totalHands = playerCount * handsPerPlayer
  const ranking: (string | null)[] = Array(totalHands).fill(null)

  return createGameState({
    phase: 'preflop',
    players,
    hands,
    handsPerPlayer,
    communityCards: [],
    ranking,
  })
}

/**
 * Create a game in flop phase
 */
export function createFlopState(playerCount: number = 2, handsPerPlayer: number = 1): GameState {
  const state = createPreflopState(playerCount, handsPerPlayer)
  state.phase = 'flop'
  state.communityCards = [createCard('2', 'H'), createCard('3', 'D'), createCard('4', 'C')]
  return state
}

/**
 * Create a game in turn phase
 */
export function createTurnState(playerCount: number = 2, handsPerPlayer: number = 1): GameState {
  const state = createFlopState(playerCount, handsPerPlayer)
  state.phase = 'turn'
  state.communityCards.push(createCard('5', 'S'))
  return state
}

/**
 * Create a game in river phase
 */
export function createRiverState(playerCount: number = 2, handsPerPlayer: number = 1): GameState {
  const state = createTurnState(playerCount, handsPerPlayer)
  state.phase = 'river'
  state.communityCards.push(createCard('6', 'H'))
  return state
}

/**
 * Create a game in reveal phase
 */
export function createRevealState(
  playerCount: number = 2,
  handsPerPlayer: number = 1,
  revealIndex: number = 0,
  score: number | null = null
): GameState {
  const state = createRiverState(playerCount, handsPerPlayer)
  state.phase = 'reveal'
  state.revealIndex = revealIndex
  state.score = score
  state.trueRanking = state.hands.map((h) => h.id)
  state.trueRanks = Object.fromEntries(state.hands.map((h, i) => [h.id, i + 1]))
  state.rankHistory = Object.fromEntries(
    state.hands.map((h) => [h.id, null]) // Placeholder history - null means no ranks yet
  )
  return state
}

/**
 * Create an acquire request for testing chip moves
 */
export function createAcquireRequest(
  kind: 'acquire' | 'offer' | 'swap',
  initiatorId: string,
  initiatorHandId: string,
  recipientHandId: string
): AcquireRequest {
  return {
    kind,
    initiatorId,
    initiatorHandId,
    recipientHandId,
  }
}

/**
 * Create a chat message
 */
export function createChatMessage(
  playerId: string,
  playerName: string,
  text: string,
  ts: number = Date.now()
): ChatMessage {
  return {
    id: `msg-${Math.random().toString(36).substring(7)}`,
    playerId,
    playerName,
    text,
    ts,
  }
}

/**
 * Helper to set ranking with hand IDs
 */
export function setRanking(state: GameState, handIds: (string | null)[]): GameState {
  return {
    ...state,
    ranking: handIds,
  }
}

/**
 * Helper to mark a hand as flipped
 */
export function flipHand(state: GameState, handId: string): GameState {
  return {
    ...state,
    hands: state.hands.map((h) => (h.id === handId ? { ...h, flipped: true } : h)),
  }
}

/**
 * Helper to set player ready state
 */
export function setPlayerReady(state: GameState, playerId: string, ready: boolean): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, ready } : p)),
  }
}

/**
 * Helper to mark all players as ready
 */
export function setAllPlayersReady(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, ready: true })),
  }
}

/**
 * Create a custom hand with specific cards (e.g., for testing specific poker hands)
 */
export function createCustomHand(
  playerId: string,
  handIndex: number,
  cardSpecs: Array<{ rank: Rank; suit: Suit }>,
  flipped: boolean = false
): Hand {
  return {
    id: `${playerId}-${handIndex}`,
    playerId,
    cards: cardSpecs.map((spec) => createCard(spec.rank, spec.suit)),
    flipped,
  }
}

/**
 * Helper to create a specific poker hand for testing
 */
export const PokerHandPresets = {
  royalFlush: (playerId: string, index: number = 0): Hand =>
    createCustomHand(playerId, index, [
      { rank: 'T', suit: 'H' },
      { rank: 'J', suit: 'H' },
      { rank: 'Q', suit: 'H' },
      { rank: 'K', suit: 'H' },
      { rank: 'A', suit: 'H' },
    ]),

  straightFlush: (playerId: string, index: number = 0): Hand =>
    createCustomHand(playerId, index, [
      { rank: '8', suit: 'H' },
      { rank: '9', suit: 'H' },
      { rank: 'T', suit: 'H' },
      { rank: 'J', suit: 'H' },
      { rank: 'Q', suit: 'H' },
    ]),

  fourOfAKind: (playerId: string, index: number = 0): Hand =>
    createCustomHand(playerId, index, [
      { rank: 'A', suit: 'H' },
      { rank: 'A', suit: 'D' },
      { rank: 'A', suit: 'C' },
      { rank: 'A', suit: 'S' },
      { rank: 'K', suit: 'H' },
    ]),

  fullHouse: (playerId: string, index: number = 0): Hand =>
    createCustomHand(playerId, index, [
      { rank: 'K', suit: 'H' },
      { rank: 'K', suit: 'D' },
      { rank: 'K', suit: 'C' },
      { rank: 'Q', suit: 'H' },
      { rank: 'Q', suit: 'D' },
    ]),

  flush: (playerId: string, index: number = 0): Hand =>
    createCustomHand(playerId, index, [
      { rank: 'A', suit: 'H' },
      { rank: 'K', suit: 'H' },
      { rank: 'Q', suit: 'H' },
      { rank: 'J', suit: 'H' },
      { rank: '9', suit: 'H' },
    ]),

  straight: (playerId: string, index: number = 0): Hand =>
    createCustomHand(playerId, index, [
      { rank: '9', suit: 'H' },
      { rank: 'T', suit: 'D' },
      { rank: 'J', suit: 'C' },
      { rank: 'Q', suit: 'S' },
      { rank: 'K', suit: 'H' },
    ]),

  threeOfAKind: (playerId: string, index: number = 0): Hand =>
    createCustomHand(playerId, index, [
      { rank: 'Q', suit: 'H' },
      { rank: 'Q', suit: 'D' },
      { rank: 'Q', suit: 'C' },
      { rank: 'J', suit: 'H' },
      { rank: '9', suit: 'D' },
    ]),

  twoPair: (playerId: string, index: number = 0): Hand =>
    createCustomHand(playerId, index, [
      { rank: 'J', suit: 'H' },
      { rank: 'J', suit: 'D' },
      { rank: 'T', suit: 'C' },
      { rank: 'T', suit: 'S' },
      { rank: '9', suit: 'H' },
    ]),

  onePair: (playerId: string, index: number = 0): Hand =>
    createCustomHand(playerId, index, [
      { rank: 'A', suit: 'H' },
      { rank: 'A', suit: 'D' },
      { rank: 'K', suit: 'C' },
      { rank: 'Q', suit: 'S' },
      { rank: '9', suit: 'H' },
    ]),

  highCard: (playerId: string, index: number = 0): Hand =>
    createCustomHand(playerId, index, [
      { rank: 'A', suit: 'H' },
      { rank: 'K', suit: 'D' },
      { rank: 'Q', suit: 'C' },
      { rank: '9', suit: 'S' },
      { rank: '5', suit: 'H' },
    ]),
}
