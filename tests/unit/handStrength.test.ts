import { describe, it, expect } from 'vitest'
import {
  estimateStrength,
  preflopTierStrength,
  currentHandStrength,
} from '../../src/lib/ai/handStrength'
import type { Card } from '../../src/lib/types'

const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

describe('preflopTierStrength — strict tier ordering', () => {
  it('every pair beats every non-pair', () => {
    const lowestPair = preflopTierStrength([c('2', 'H'), c('2', 'D')])
    const bestNonPair = preflopTierStrength([c('A', 'H'), c('K', 'H')])
    expect(lowestPair).toBeGreaterThan(bestNonPair)
  })

  it('orders pairs from AA down to 22', () => {
    const ranks: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
    const scores = ranks.map((r) => preflopTierStrength([c(r, 'H'), c(r, 'D')]))
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeLessThan(scores[i + 1])
    }
    expect(scores[scores.length - 1]).toBeCloseTo(1.0, 5)
    expect(scores[0]).toBeCloseTo(0.8, 5)
  })

  it('orders Ace-high hands by kicker', () => {
    const ak = preflopTierStrength([c('A', 'H'), c('K', 'D')])
    const aq = preflopTierStrength([c('A', 'H'), c('Q', 'D')])
    const a2 = preflopTierStrength([c('A', 'H'), c('2', 'D')])
    expect(ak).toBeGreaterThan(aq)
    expect(aq).toBeGreaterThan(a2)
    expect(ak).toBeCloseTo(0.78, 5)
    expect(a2).toBeCloseTo(0.60, 5)
  })

  it('respects tier boundaries (Tier 2 > Tier 3 > Tier 4...)', () => {
    const a2 = preflopTierStrength([c('A', 'H'), c('2', 'D')])  // Tier 2 floor
    const kq = preflopTierStrength([c('K', 'H'), c('Q', 'D')])  // Tier 3 ceiling
    const k2 = preflopTierStrength([c('K', 'H'), c('2', 'D')])  // Tier 3 floor
    const qj = preflopTierStrength([c('Q', 'H'), c('J', 'D')])  // Tier 4 ceiling
    expect(a2).toBeGreaterThan(kq)
    expect(kq).toBeGreaterThan(k2)
    expect(k2).toBeGreaterThan(qj)
  })

  it('treats 32 as the explicit weakest hand', () => {
    const trash = preflopTierStrength([c('3', 'H'), c('2', 'D')])
    expect(trash).toBeCloseTo(0.05, 5)
    // ...weaker than every Ten-high+
    const t2 = preflopTierStrength([c('T', 'H'), c('2', 'D')])
    expect(trash).toBeLessThan(t2)
  })

  it('ignores suits and connectors (coordination convention)', () => {
    const akSuited = preflopTierStrength([c('A', 'H'), c('K', 'H')])
    const akOff = preflopTierStrength([c('A', 'H'), c('K', 'D')])
    expect(akSuited).toBeCloseTo(akOff, 5)
  })
})

describe('estimateStrength preflop wraps tier function', () => {
  it('returns the tier score on an empty board', () => {
    const aa: Card[] = [c('A', 'H'), c('A', 'D')]
    expect(estimateStrength(aa, [], 1)).toBeCloseTo(1.0, 5)
  })

  it('still produces postflop equity', () => {
    const hole: Card[] = [c('A', 'H'), c('K', 'H')]
    const board: Card[] = [c('Q', 'H'), c('J', 'H'), c('2', 'C')]
    const eq = estimateStrength(hole, board, 1, 50)
    expect(eq).toBeGreaterThan(0)
    expect(eq).toBeLessThanOrEqual(1)
  })

  it('returns 0.5 for empty hole', () => {
    expect(estimateStrength([], [], 1)).toBe(0.5)
  })
})

describe('currentHandStrength — rank what you have, not what you could have', () => {
  it('a made low pair on the flop ranks above a flush draw with no pair', () => {
    // Pocket 4s on a flush-draw board for the K-high hand.
    const lowPair: Card[] = [c('4', 'C'), c('4', 'S')]
    const flushDraw: Card[] = [c('K', 'H'), c('5', 'H')]
    const board: Card[] = [c('Q', 'H'), c('7', 'H'), c('2', 'D')]
    const pairScore = currentHandStrength(lowPair, board)
    const drawScore = currentHandStrength(flushDraw, board)
    expect(pairScore).toBeGreaterThan(drawScore)
  })

  it('made flush > made straight > set > two-pair > pair > high-card', () => {
    const board: Card[] = [c('5', 'H'), c('9', 'H'), c('Q', 'H')]
    const flush = currentHandStrength([c('A', 'H'), c('2', 'H')], board)        // ace-high flush
    const straight = currentHandStrength([c('8', 'C'), c('6', 'D')], [c('5', 'H'), c('7', 'D'), c('9', 'C')])
    const set = currentHandStrength([c('5', 'C'), c('5', 'S')], [c('5', 'H'), c('9', 'D'), c('Q', 'C')])
    const twoPair = currentHandStrength([c('Q', 'D'), c('9', 'C')], [c('Q', 'H'), c('9', 'S'), c('2', 'C')])
    const pair = currentHandStrength([c('Q', 'D'), c('4', 'C')], [c('Q', 'H'), c('9', 'D'), c('2', 'C')])
    const highCard = currentHandStrength([c('A', 'D'), c('5', 'C')], [c('K', 'H'), c('9', 'D'), c('2', 'C')])

    expect(flush).toBeGreaterThan(straight)
    expect(straight).toBeGreaterThan(set)
    expect(set).toBeGreaterThan(twoPair)
    expect(twoPair).toBeGreaterThan(pair)
    expect(pair).toBeGreaterThan(highCard)
  })

  it('returns the preflop tier score on an empty board', () => {
    const aa: Card[] = [c('A', 'H'), c('A', 'D')]
    expect(currentHandStrength(aa, [])).toBeCloseTo(1.0, 5)
  })
})
