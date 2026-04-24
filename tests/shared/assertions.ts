/**
 * Invariant assertion helpers for validating game state.
 * These helpers ensure game state consistency and catch bugs early in tests.
 */

import type {
  GameState,
  ServerGameState,
  Player,
  Hand,
  Phase,
} from '../../src/lib/types'

/**
 * Custom error class for invariant violations
 */
export class InvariantError extends Error {
  constructor(message: string) {
    super(`Invariant violation: ${message}`)
    this.name = 'InvariantError'
  }
}

/**
 * Assert that a condition is true, throwing an InvariantError if not
 */
export function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new InvariantError(message)
  }
}

/**
 * Assert that a value is not null or undefined
 */
export function assertNotNull<T>(
  value: T | null | undefined,
  message: string = 'Value should not be null or undefined'
): asserts value is T {
  invariant(value !== null && value !== undefined, message)
}

/**
 * Validate basic game state structure
 */
export function assertValidGameState(state: GameState): void {
  invariant(typeof state.phase === 'string', 'Phase must be a string')
  invariant(Array.isArray(state.players), 'Players must be an array')
  invariant(Array.isArray(state.hands), 'Hands must be an array')
  invariant(Array.isArray(state.communityCards), 'Community cards must be an array')
  invariant(Array.isArray(state.ranking), 'Ranking must be an array')
  invariant(
    typeof state.handsPerPlayer === 'number' && state.handsPerPlayer >= 1 && state.handsPerPlayer <= 6,
    'handsPerPlayer must be between 1 and 6'
  )
  invariant(typeof state.revealIndex === 'number' && state.revealIndex >= 0, 'revealIndex must be non-negative')
}

/**
 * Validate that all players have valid structure
 */
export function assertValidPlayers(players: Player[]): void {
  players.forEach((player, index) => {
    invariant(typeof player.id === 'string' && player.id.length > 0, `Player ${index}: id must be a non-empty string`)
    invariant(typeof player.connId === 'string' && player.connId.length > 0, `Player ${index}: connId must be a non-empty string`)
    invariant(typeof player.name === 'string' && player.name.length > 0, `Player ${index}: name must be a non-empty string`)
    invariant(typeof player.isCreator === 'boolean', `Player ${index}: isCreator must be a boolean`)
    invariant(typeof player.ready === 'boolean', `Player ${index}: ready must be a boolean`)
    invariant(typeof player.connected === 'boolean', `Player ${index}: connected must be a boolean`)
    invariant(
      player.isBot === undefined || typeof player.isBot === 'boolean',
      `Player ${index}: isBot must be a boolean if present`
    )
  })

  // Check that exactly one player is the creator (except in lobby where there might be none)
  const creatorCount = players.filter((p) => p.isCreator).length
  invariant(creatorCount <= 1, 'At most one player can be creator')
}

/**
 * Validate that all hands have valid structure
 */
export function assertValidHands(hands: Hand[], players: Player[]): void {
  const playerIds = new Set(players.map((p) => p.id))

  hands.forEach((hand, index) => {
    invariant(typeof hand.id === 'string' && hand.id.length > 0, `Hand ${index}: id must be a non-empty string`)
    invariant(typeof hand.playerId === 'string', `Hand ${index}: playerId must be a string`)
    invariant(playerIds.has(hand.playerId), `Hand ${index}: playerId ${hand.playerId} must exist in players`)
    invariant(Array.isArray(hand.cards), `Hand ${index}: cards must be an array`)
    invariant(hand.cards.length >= 0 && hand.cards.length <= 7, `Hand ${index}: must have 0-7 cards`)
    invariant(typeof hand.flipped === 'boolean', `Hand ${index}: flipped must be a boolean`)
  })

  // Check that hand IDs are unique
  const handIds = hands.map((h) => h.id)
  const uniqueHandIds = new Set(handIds)
  invariant(handIds.length === uniqueHandIds.size, 'Hand IDs must be unique')
}

/**
 * Validate that ranking array matches hands
 */
export function assertValidRanking(state: GameState): void {
  const totalHands = state.players.length * state.handsPerPlayer
  invariant(
    state.ranking.length === totalHands,
    `Ranking length (${state.ranking.length}) must equal total hands (${totalHands})`
  )

  // Check that all non-null ranking entries reference valid hand IDs
  const handIds = new Set(state.hands.map((h) => h.id))
  state.ranking.forEach((entry, index) => {
    if (entry !== null) {
      invariant(
        typeof entry === 'string',
        `Ranking entry ${index} must be a string or null, got ${typeof entry}`
      )
      invariant(handIds.has(entry), `Ranking entry ${index} references unknown hand ID: ${entry}`)
    }
  })

  // Check that each hand appears at most once in ranking
  const claimedHandIds = state.ranking.filter((h): h is string => h !== null)
  const uniqueClaimed = new Set(claimedHandIds)
  invariant(
    claimedHandIds.length === uniqueClaimed.size,
    'Ranking contains duplicate hand IDs (no hand can be claimed twice)'
  )
}

/**
 * Validate community cards
 */
export function assertValidCommunityCards(state: GameState, phase?: Phase): void {
  const currentPhase = phase || state.phase

  invariant(
    state.communityCards.length >= 0 && state.communityCards.length <= 5,
    `Community cards must be 0-5, got ${state.communityCards.length}`
  )

  // Check card count per phase
  const expectedCount: Record<Phase, number> = {
    lobby: 0,
    preflop: 0,
    flop: 3,
    turn: 4,
    river: 5,
    reveal: 5,
  }

  if (currentPhase !== 'lobby') {
    invariant(
      state.communityCards.length === expectedCount[currentPhase],
      `Phase ${currentPhase} should have ${expectedCount[currentPhase]} community cards, got ${state.communityCards.length}`
    )
  }
}

/**
 * Validate reveal phase state
 */
export function assertValidRevealState(state: GameState): void {
  invariant(state.phase === 'reveal', 'State must be in reveal phase')
  invariant(state.trueRanking !== null, 'trueRanking must be set in reveal phase')
  invariant(state.trueRanks !== null, 'trueRanks must be set in reveal phase')

  // Check that trueRanking contains all hand IDs
  const handIds = new Set(state.hands.map((h) => h.id))
  const trueRankingSet = new Set(state.trueRanking)
  invariant(
    state.trueRanking.length === state.hands.length,
    `trueRanking length (${state.trueRanking.length}) must equal hands count (${state.hands.length})`
  )

  for (const handId of state.trueRanking) {
    invariant(handIds.has(handId), `trueRanking contains unknown hand ID: ${handId}`)
  }

  // Check that trueRanks has entries for all hands
  for (const hand of state.hands) {
    invariant(hand.id in state.trueRanks!, `trueRanks missing entry for hand: ${hand.id}`)
  }

  // Check that revealIndex is valid
  invariant(
    state.revealIndex >= 0 && state.revealIndex < state.hands.length,
    `revealIndex (${state.revealIndex}) must be between 0 and ${state.hands.length - 1}`
  )

  // Check that score is set if all hands are flipped
  const allFlipped = state.hands.every((h) => h.flipped)
  invariant(
    allFlipped ? state.score !== null : state.score === null,
    `score should be ${allFlipped ? 'set' : 'null'} when ${allFlipped ? 'all' : 'not all'} hands are flipped`
  )
}

/**
 * Validate that all invariants hold for a game state
 */
export function assertGameStateInvariants(state: GameState, phase?: Phase): void {
  assertValidGameState(state)
  assertValidPlayers(state.players)
  assertValidHands(state.hands, state.players)
  assertValidRanking(state)
  assertValidCommunityCards(state, phase)

  if (state.phase === 'reveal') {
    assertValidRevealState(state)
  }
}

/**
 * Validate server game state (includes allCommunityCards)
 */
export function assertServerGameStateInvariants(state: ServerGameState, phase?: Phase): void {
  assertGameStateInvariants(state as GameState, phase)
  invariant(
    typeof state.allCommunityCards === 'string' || Array.isArray(state.allCommunityCards),
    'allCommunityCards must be an array (ServerGameState)'
  )
  invariant(
    Array.isArray(state.allCommunityCards),
    'allCommunityCards must be an array in ServerGameState'
  )
  invariant(
    state.allCommunityCards.length === 5,
    `allCommunityCards must have exactly 5 cards, got ${state.allCommunityCards.length}`
  )
}

/**
 * Assert that a player exists in the state
 */
export function assertPlayerExists(state: GameState, playerId: string): void {
  const player = state.players.find((p) => p.id === playerId)
  invariant(player !== undefined, `Player ${playerId} not found in game state`)
}

/**
 * Assert that a hand exists in the state
 */
export function assertHandExists(state: GameState, handId: string): void {
  const hand = state.hands.find((h) => h.id === handId)
  invariant(hand !== undefined, `Hand ${handId} not found in game state`)
}

/**
 * Assert that a hand belongs to a specific player
 */
export function assertHandBelongsToPlayer(state: GameState, handId: string, playerId: string): void {
  const hand = state.hands.find((h) => h.id === handId)
  invariant(hand !== undefined, `Hand ${handId} not found in game state`)
  invariant(hand.playerId === playerId, `Hand ${handId} belongs to ${hand.playerId}, not ${playerId}`)
}

/**
 * Assert phase transition is valid
 */
export function assertValidPhaseTransition(from: Phase, to: Phase): void {
  const validTransitions: Record<Phase, Phase[]> = {
    lobby: ['preflop'],
    preflop: ['preflop', 'flop'],
    flop: ['turn'],
    turn: ['river'],
    river: ['reveal'],
    reveal: ['lobby'], // After playAgain
  }

  const allowed = validTransitions[from]
  invariant(allowed.includes(to), `Invalid phase transition: ${from} -> ${to}. Allowed: ${allowed.join(', ')}`)
}

/**
 * Assert that all players are connected
 */
export function assertAllPlayersConnected(state: GameState): void {
  invariant(
    state.players.every((p) => p.connected),
    'Not all players are connected'
  )
}

/**
 * Assert that a specific player is the creator
 */
export function assertPlayerIsCreator(state: GameState, playerId: string): void {
  const player = state.players.find((p) => p.id === playerId)
  invariant(player !== undefined, `Player ${playerId} not found`)
  invariant(player.isCreator, `Player ${playerId} is not creator`)
}

/**
 * Assert that card count is valid for a phase
 */
export function assertCardCountForPhase(state: GameState, phase: Phase, expectedCards: number): void {
  invariant(
    state.communityCards.length === expectedCards,
    `Expected ${expectedCards} community cards in ${phase} phase, got ${state.communityCards.length}`
  )
}

/**
 * Assert that hands per player is valid for player count
 */
export function assertValidHandsPerPlayer(playerCount: number, handsPerPlayer: number): void {
  const maxHands: Record<number, number> = {
    2: 6,
    3: 6,
    4: 5,
    5: 4,
    6: 3,
    7: 2,
    8: 2,
  }

  const max = maxHands[playerCount] || 1
  invariant(
    handsPerPlayer >= 1 && handsPerPlayer <= max,
    `handsPerPlayer must be between 1 and ${max} for ${playerCount} players`
  )
}

/**
 * Assert that no duplicate hand IDs exist in ranking
 */
export function assertNoDuplicateRanking(state: GameState): void {
  const claimed = state.ranking.filter((h): h is string => h !== null)
  const unique = new Set(claimed)
  invariant(
    claimed.length === unique.size,
    `Ranking contains duplicates: ${claimed.filter((h, i) => claimed.indexOf(h) !== i)}`
  )
}

/**
 * Assert that rankHistory has correct structure
 */
export function assertValidRankHistory(state: GameState): void {
  const expectedPhases = 4 // preflop, flop, turn, river

  for (const hand of state.hands) {
    invariant(
      hand.id in state.rankHistory,
      `rankHistory missing entry for hand ${hand.id}`
    )
    const history = state.rankHistory[hand.id]
    invariant(
      Array.isArray(history),
      `rankHistory for ${hand.id} must be an array`
    )
    invariant(
      history.length === expectedPhases,
      `rankHistory for ${hand.id} must have ${expectedPhases} entries, got ${history.length}`
    )
    invariant(
      history.every((r) => r === null || (typeof r === 'number' && r >= 1)),
      `All rankHistory entries must be null or >= 1`
    )
  }
}
