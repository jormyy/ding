import { describe, it, expect } from 'vitest'
import { estimateStrength } from '../../src/lib/ai/handStrength'
import type { Card } from '../../src/lib/types'

describe('estimateStrength', () => {
  it('should return preflop strength for empty board', () => {
    const hole: Card[] = [{ rank: 'A', suit: 'H' }, { rank: 'A', suit: 'D' }]
    const strength = estimateStrength(hole, [], 1, 20)
    expect(strength).toBeGreaterThan(0.5)
    expect(strength).toBeLessThanOrEqual(1)
  })

  it('should return higher strength for premium preflop hands', () => {
    const aa: Card[] = [{ rank: 'A', suit: 'H' }, { rank: 'A', suit: 'D' }]
    const twoseven: Card[] = [{ rank: '2', suit: 'C' }, { rank: '7', suit: 'D' }]
    const aaStrength = estimateStrength(aa, [], 1, 20)
    const weakStrength = estimateStrength(twoseven, [], 1, 20)
    expect(aaStrength).toBeGreaterThan(weakStrength)
  })

  it('should handle postflop board', () => {
    const hole: Card[] = [{ rank: 'A', suit: 'H' }, { rank: 'K', suit: 'H' }]
    const board: Card[] = [
      { rank: 'Q', suit: 'H' }, { rank: 'J', suit: 'H' }, { rank: '2', suit: 'C' },
    ]
    const strength = estimateStrength(hole, board, 1, 20)
    expect(strength).toBeGreaterThan(0)
    expect(strength).toBeLessThanOrEqual(1)
  })

  it('should return 0.5 for empty hole cards', () => {
    const strength = estimateStrength([], [], 1, 20)
    expect(strength).toBe(0.5)
  })

  it('should return 0.5 when field size is 0', () => {
    const hole: Card[] = [{ rank: 'A', suit: 'H' }, { rank: 'K', suit: 'H' }]
    const board: Card[] = [
      { rank: 'Q', suit: 'H' }, { rank: 'J', suit: 'H' }, { rank: '2', suit: 'C' },
    ]
    const strength = estimateStrength(hole, board, 0, 20)
    expect(strength).toBe(0.5)
  })
})
