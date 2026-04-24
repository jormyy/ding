/**
 * Test invariant assertion helpers
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  InvariantError,
  invariant,
  assertNotNull,
  assertValidGameState,
  assertValidPlayers,
  assertValidHands,
  assertValidRanking,
  assertValidCommunityCards,
  assertValidRevealState,
  assertGameStateInvariants,
  assertServerGameStateInvariants,
  assertPlayerExists,
  assertHandExists,
  assertHandBelongsToPlayer,
  assertValidPhaseTransition,
  assertAllPlayersConnected,
  assertPlayerIsCreator,
  assertCardCountForPhase,
  assertValidHandsPerPlayer,
  assertNoDuplicateRanking,
  assertValidRankHistory,
} from './assertions'
import {
  createGameState,
  createPlayer,
  createHand,
  createCard,
  createLobbyState,
  createPreflopState,
  createRevealState,
} from './factories'
import type { Phase } from '../../src/lib/types'

describe('invariant', () => {
  it('should not throw when condition is true', () => {
    expect(() => invariant(true, 'test')).not.toThrow()
  })

  it('should throw InvariantError when condition is false', () => {
    expect(() => invariant(false, 'test message')).toThrow(InvariantError)
    expect(() => invariant(false, 'test message')).toThrow('Invariant violation: test message')
  })
})

describe('assertNotNull', () => {
  it('should not throw when value is not null or undefined', () => {
    expect(() => assertNotNull('value')).not.toThrow()
    expect(() => assertNotNull(0)).not.toThrow()
    expect(() => assertNotNull(false)).not.toThrow()
  })

  it('should throw when value is null', () => {
    expect(() => assertNotNull(null)).toThrow(InvariantError)
  })

  it('should throw when value is undefined', () => {
    expect(() => assertNotNull(undefined)).toThrow(InvariantError)
  })

  it('should have custom message', () => {
    expect(() => assertNotNull(null, 'custom message')).toThrow('Invariant violation: custom message')
  })
})

describe('assertValidGameState', () => {
  it('should not throw for valid game state', () => {
    const state = createGameState()
    expect(() => assertValidGameState(state)).not.toThrow()
  })

  it('should throw for invalid phase', () => {
    const state = createGameState()
    // @ts-expect-error - testing invalid input
    state.phase = 123
    expect(() => assertValidGameState(state)).toThrow(InvariantError)
  })

  it('should throw for invalid players array', () => {
    const state = createGameState()
    // @ts-expect-error - testing invalid input
    state.players = 'not an array'
    expect(() => assertValidGameState(state)).toThrow(InvariantError)
  })

  it('should throw for invalid handsPerPlayer', () => {
    const state = createGameState()
    // @ts-expect-error - testing invalid input
    state.handsPerPlayer = 0
    expect(() => assertValidGameState(state)).toThrow(InvariantError)

    // @ts-expect-error - testing invalid input
    state.handsPerPlayer = 10
    expect(() => assertValidGameState(state)).toThrow(InvariantError)
  })
})

describe('assertValidPlayers', () => {
  it('should not throw for valid players', () => {
    const players = [createPlayer(), createPlayer()]
    expect(() => assertValidPlayers(players)).not.toThrow()
  })

  it('should throw for empty player ID', () => {
    const players = [createPlayer({ id: '' })]
    expect(() => assertValidPlayers(players)).toThrow(InvariantError)
  })

  it('should throw for empty player name', () => {
    const players = [createPlayer({ name: '' })]
    expect(() => assertValidPlayers(players)).toThrow(InvariantError)
  })

  it('should throw for multiple creators', () => {
    const players = [createPlayer({ isCreator: true }), createPlayer({ isCreator: true })]
    expect(() => assertValidPlayers(players)).toThrow(InvariantError)
  })
})

describe('assertValidHands', () => {
  let players: ReturnType<typeof createPlayer>[]

  beforeEach(() => {
    players = [createPlayer({ id: 'p1' }), createPlayer({ id: 'p2' })]
  })

  it('should not throw for valid hands', () => {
    const hands = [
      createHand('p1', 0, [createCard('A', 'H')]),
      createHand('p2', 0, [createCard('K', 'D')]),
    ]
    expect(() => assertValidHands(hands, players)).not.toThrow()
  })

  it('should throw for duplicate hand IDs', () => {
    const hands = [
      createHand('p1', 0, []),
      createHand('p2', 0, []),
    ]
    hands[1].id = hands[0].id
    expect(() => assertValidHands(hands, players)).toThrow(InvariantError)
  })

  it('should throw for hand with invalid playerId', () => {
    const hands = [createHand('invalid-id', 0, [])]
    expect(() => assertValidHands(hands, players)).toThrow(InvariantError)
  })
})

describe('assertValidRanking', () => {
  it('should not throw for valid ranking', () => {
    const state = createPreflopState(2, 1)
    expect(() => assertValidRanking(state)).not.toThrow()
  })

  it('should throw for duplicate hand IDs in ranking', () => {
    const state = createPreflopState(2, 1)
    state.ranking = [state.hands[0].id, state.hands[0].id]
    expect(() => assertValidRanking(state)).toThrow(InvariantError)
  })

  it('should throw for invalid hand ID in ranking', () => {
    const state = createPreflopState(2, 1)
    state.ranking = ['invalid-hand-id', null]
    expect(() => assertValidRanking(state)).toThrow(InvariantError)
  })
})

describe('assertValidCommunityCards', () => {
  it('should not throw for valid community cards in each phase', () => {
    const phases: Phase[] = ['preflop', 'flop', 'turn', 'river', 'reveal']
    phases.forEach((phase) => {
      const state = createGameState({ phase })
      state.communityCards = Array.from({ length: phase === 'preflop' ? 0 : phase === 'flop' ? 3 : phase === 'turn' ? 4 : 5 })
      expect(() => assertValidCommunityCards(state, phase)).not.toThrow()
    })
  })

  it('should throw for wrong number of cards in phase', () => {
    const state = createGameState({ phase: 'flop' })
    state.communityCards = [createCard('A', 'H')]
    expect(() => assertValidCommunityCards(state)).toThrow(InvariantError)
  })
})

describe('assertValidRevealState', () => {
  it('should not throw for valid reveal state', () => {
    const state = createRevealState(2, 1, 0) // Use default score = null
    expect(() => assertValidRevealState(state)).not.toThrow()
  })

  it('should throw if phase is not reveal', () => {
    const state = createGameState({ phase: 'preflop' })
    state.trueRanking = []
    state.trueRanks = {}
    expect(() => assertValidRevealState(state)).toThrow(InvariantError)
  })

  it('should throw if trueRanking is null', () => {
    const state = createGameState({ phase: 'reveal' })
    state.trueRanking = null
    state.trueRanks = {}
    expect(() => assertValidRevealState(state)).toThrow(InvariantError)
  })
})

describe('assertGameStateInvariants', () => {
  it('should not throw for valid game state in any phase', () => {
    const phases: Phase[] = ['lobby', 'preflop', 'flop', 'turn', 'river', 'reveal']
    phases.forEach((phase) => {
      let state: GameState
      switch (phase) {
        case 'lobby':
          state = createLobbyState(2)
          break
        case 'reveal':
          state = createRevealState(2, 1) // Provide handsPerPlayer to avoid default of 1
          break
        default:
          // Create base preflop state, then set appropriate phase and cards
          state = createPreflopState(2, 1)
          switch (phase) {
            case 'preflop':
              // Already set correctly
              break
            case 'flop':
              state.phase = 'flop'
              state.communityCards = [createCard('2', 'H'), createCard('3', 'D'), createCard('4', 'C')]
              break
            case 'turn':
              state.phase = 'turn'
              state.communityCards.push(createCard('5', 'S'))
              break
            case 'river':
              state.phase = 'river'
              state.communityCards.push(createCard('6', 'H'))
              break
          }
          break
      }
      expect(() => assertGameStateInvariants(state, phase)).not.toThrow()
    })
  })
})

describe('assertServerGameStateInvariants', () => {
  it('should not throw for valid server game state', () => {
    const state = createRevealState(2) as any
    state.allCommunityCards = Array.from({ length: 5 })
    expect(() => assertServerGameStateInvariants(state)).not.toThrow()
  })

  it('should throw if allCommunityCards is not length 5', () => {
    const state = createRevealState(2) as any
    state.allCommunityCards = Array.from({ length: 3 })
    expect(() => assertServerGameStateInvariants(state)).toThrow(InvariantError)
  })
})

describe('assertPlayerExists', () => {
  it('should not throw when player exists', () => {
    const state = createLobbyState(2)
    expect(() => assertPlayerExists(state, state.players[0].id)).not.toThrow()
  })

  it('should throw when player does not exist', () => {
    const state = createLobbyState(2)
    expect(() => assertPlayerExists(state, 'invalid-id')).toThrow(InvariantError)
  })
})

describe('assertHandExists', () => {
  it('should not throw when hand exists', () => {
    const state = createPreflopState(1, 1)
    expect(() => assertHandExists(state, state.hands[0].id)).not.toThrow()
  })

  it('should throw when hand does not exist', () => {
    const state = createPreflopState(1, 1)
    expect(() => assertHandExists(state, 'invalid-hand-id')).toThrow(InvariantError)
  })
})

describe('assertHandBelongsToPlayer', () => {
  it('should not throw when hand belongs to player', () => {
    const state = createPreflopState(1, 1)
    const hand = state.hands[0]
    expect(() => assertHandBelongsToPlayer(state, hand.id, hand.playerId)).not.toThrow()
  })

  it('should throw when hand belongs to different player', () => {
    const state = createPreflopState(2, 1)
    const hand = state.hands[0]
    const otherPlayer = state.players.find((p) => p.id !== hand.playerId)!.id
    expect(() => assertHandBelongsToPlayer(state, hand.id, otherPlayer)).toThrow(InvariantError)
  })
})

describe('assertValidPhaseTransition', () => {
  it('should allow valid transitions', () => {
    const validTransitions: [Phase, Phase][] = [
      ['lobby', 'preflop'],
      ['preflop', 'flop'],
      ['flop', 'turn'],
      ['turn', 'river'],
      ['river', 'reveal'],
      ['reveal', 'lobby'],
    ]
    validTransitions.forEach(([from, to]) => {
      expect(() => assertValidPhaseTransition(from, to)).not.toThrow()
    })
  })

  it('should throw for invalid transitions', () => {
    const invalidTransitions: [Phase, Phase][] = [
      ['preflop', 'lobby'],
      ['flop', 'preflop'],
      ['reveal', 'preflop'],
    ]
    invalidTransitions.forEach(([from, to]) => {
      expect(() => assertValidPhaseTransition(from, to)).toThrow(InvariantError)
    })
  })
})

describe('assertAllPlayersConnected', () => {
  it('should not throw when all players connected', () => {
    const state = createLobbyState(2)
    state.players.forEach((p) => (p.connected = true))
    expect(() => assertAllPlayersConnected(state)).not.toThrow()
  })

  it('should throw when some players disconnected', () => {
    const state = createLobbyState(2)
    state.players[0].connected = false
    expect(() => assertAllPlayersConnected(state)).toThrow(InvariantError)
  })
})

describe('assertPlayerIsCreator', () => {
  it('should not throw when player is creator', () => {
    const state = createLobbyState(2)
    const creator = state.players.find((p) => p.isCreator)!
    expect(() => assertPlayerIsCreator(state, creator.id)).not.toThrow()
  })

  it('should throw when player is not creator', () => {
    const state = createLobbyState(2)
    const nonCreator = state.players.find((p) => !p.isCreator)!
    expect(() => assertPlayerIsCreator(state, nonCreator.id)).toThrow(InvariantError)
  })
})

describe('assertCardCountForPhase', () => {
  it('should not throw for correct card count', () => {
    const state = createGameState({ phase: 'flop' })
    state.communityCards = Array.from({ length: 3 })
    expect(() => assertCardCountForPhase(state, 'flop', 3)).not.toThrow()
  })

  it('should throw for incorrect card count', () => {
    const state = createGameState({ phase: 'flop' })
    state.communityCards = Array.from({ length: 5 })
    expect(() => assertCardCountForPhase(state, 'flop', 3)).toThrow(InvariantError)
  })
})

describe('assertValidHandsPerPlayer', () => {
  it('should not throw for valid combinations', () => {
    const valid: [number, number][] = [
      [2, 6], [3, 6], [4, 5], [5, 4], [6, 3], [7, 2], [8, 2],
    ]
    valid.forEach(([playerCount, handsPerPlayer]) => {
      expect(() => assertValidHandsPerPlayer(playerCount, handsPerPlayer)).not.toThrow()
    })
  })

  it('should throw for invalid combinations', () => {
    const invalid: [number, number][] = [
      [2, 10], [8, 3], [5, 10],
    ]
    invalid.forEach(([playerCount, handsPerPlayer]) => {
      expect(() => assertValidHandsPerPlayer(playerCount, handsPerPlayer)).toThrow(InvariantError)
    })
  })
})

describe('assertNoDuplicateRanking', () => {
  it('should not throw for ranking without duplicates', () => {
    const state = createPreflopState(2, 1)
    state.ranking = [state.hands[0].id, null]
    expect(() => assertNoDuplicateRanking(state)).not.toThrow()
  })

  it('should throw for ranking with duplicates', () => {
    const state = createPreflopState(2, 1)
    state.ranking = [state.hands[0].id, state.hands[0].id]
    expect(() => assertNoDuplicateRanking(state)).toThrow(InvariantError)
  })
})

describe('assertValidRankHistory', () => {
  it('should not throw for valid rank history', () => {
    const state = createRevealState(2, 1, 0) // Use default score = null
    expect(() => assertValidRankHistory(state)).not.toThrow()
  })

  it('should throw for missing rank history entry', () => {
    const state = createRevealState(2, 1, 0, 5)
    delete state.rankHistory[state.hands[0].id]
    expect(() => assertValidRankHistory(state)).toThrow(InvariantError)
  })

  it('should throw for wrong number of rank history entries', () => {
    const state = createRevealState(2, 1, 0, 5)
    state.rankHistory[state.hands[0].id] = [1, 2, 3] // should be 4 entries
    expect(() => assertValidRankHistory(state)).toThrow(InvariantError)
  })
})
