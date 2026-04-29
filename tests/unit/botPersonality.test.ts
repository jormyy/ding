import { describe, it, expect } from 'vitest'
import {
  pickUnusedArchetype,
  archetypeFlavor,
  allArchetypes,
  type Archetype,
} from '../../src/lib/ai/archetypes'
import { randomTraits, pickBotName } from '../../src/lib/ai/personality'

describe('pickUnusedArchetype', () => {
  it('picks five distinct archetypes for five fresh bots in a row', () => {
    const used = new Set<Archetype>()
    const picks: Archetype[] = []
    for (let i = 0; i < 5; i++) {
      const a = pickUnusedArchetype(used)
      picks.push(a)
      used.add(a)
    }
    expect(new Set(picks).size).toBe(5)
  })

  it('falls back to uniform random once all 10 are taken', () => {
    const used = new Set<Archetype>(allArchetypes())
    // Should not throw and should return a valid archetype.
    const a = pickUnusedArchetype(used)
    expect(allArchetypes().includes(a)).toBe(true)
  })
})

describe('archetypeFlavor', () => {
  it('every archetype has a non-empty name pool and tendency multipliers', () => {
    for (const a of allArchetypes()) {
      const f = archetypeFlavor(a)
      expect(f.namePool.length).toBeGreaterThan(0)
      expect(f.dingTendency).toBeGreaterThan(0)
      expect(f.fuckoffTendency).toBeGreaterThan(0)
    }
  })

  it('extreme archetypes differ in ding tendency', () => {
    const gut = archetypeFlavor('gut')
    const quiet = archetypeFlavor('quiet')
    expect(gut.dingTendency).toBeGreaterThan(quiet.dingTendency)
  })
})

describe('randomTraits exposes flavor', () => {
  it('returned traits include dingTendency, fuckoffTendency, and quirks', () => {
    const { traits, archetype } = randomTraits('skeptic')
    expect(archetype).toBe('skeptic')
    expect(traits.dingTendency).toBeGreaterThan(0)
    expect(traits.fuckoffTendency).toBeGreaterThan(0)
    expect(traits.quirks).toBeDefined()
    // Skeptic specifically suspects top-slot proposals.
    expect(traits.quirks.suspectsTop).toBeGreaterThan(0)
  })
})

describe('pickBotName uses archetype pool when given one', () => {
  it('returns a name from the archetype pool when none are taken', () => {
    const taken = new Set<string>()
    const name = pickBotName(taken, 'anchor')
    expect(archetypeFlavor('anchor').namePool).toContain(name)
  })
})
