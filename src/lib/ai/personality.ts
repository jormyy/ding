import {
  pickArchetype,
  archetypePatch,
  archetypeFlavor,
  type Archetype,
  type ArchetypeQuirks,
} from "./archetypes";

// Trait-based bot personality. See plan "Trait Model".
export type Traits = {
  // Big-Five-inspired
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;

  // Ding-specific
  skill: number;
  decisiveness: number;
  trustInTeammates: number;
  helpfulness: number;
  stubbornness: number;        // tighter reject margins, slower resignation, re-propose across phases

  // Pacing
  baseThinkMs: number;
  thinkPerDifficultyMs: number;
  hesitationProb: number;

  // Archetype-specific strategy modifiers.
  quirks: ArchetypeQuirks;
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function jitter(v: number, amt = 0.08): number {
  return Math.max(0, Math.min(1, v + (Math.random() * 2 - 1) * amt));
}

function defaultTraits(): Traits {
  return {
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.6,
    neuroticism: 0.3,

    skill: 0.55,
    decisiveness: 0.5,
    trustInTeammates: 0.5,
    helpfulness: 0.5,
    stubbornness: 0.55,         // baseline "a bit more stubborn"

    baseThinkMs: 6000,
    thinkPerDifficultyMs: 6000,
    hesitationProb: 0.08,

    quirks: {},
  };
}

export function randomTraits(archetype?: Archetype): { traits: Traits; archetype: Archetype } {
  const a = archetype ?? pickArchetype();
  const merged: Traits = { ...defaultTraits(), ...archetypePatch(a) } as Traits;
  const flavor = archetypeFlavor(a);
  const jittered: Traits = {
    ...merged,
    openness: jitter(merged.openness),
    conscientiousness: jitter(merged.conscientiousness),
    extraversion: jitter(merged.extraversion),
    agreeableness: jitter(merged.agreeableness),
    neuroticism: jitter(merged.neuroticism),
    skill: jitter(merged.skill, 0.06),
    decisiveness: jitter(merged.decisiveness),
    trustInTeammates: jitter(merged.trustInTeammates),
    helpfulness: jitter(merged.helpfulness),
    stubbornness: jitter(merged.stubbornness ?? 0.55),
    hesitationProb: jitter(merged.hesitationProb, 0.04),
    baseThinkMs: Math.round(merged.baseThinkMs * rand(0.85, 1.15)),
    thinkPerDifficultyMs: Math.round(merged.thinkPerDifficultyMs * rand(0.85, 1.15)),
    quirks: flavor.quirks,
  };
  return { traits: jittered, archetype: a };
}

// Pacing windows derived from traits + current decision difficulty.
// difficulty in [0,1] comes from entropy of top-candidate utilities.
// Global pacing multiplier — bots act ~2x faster than raw trait values imply.
// (Was 1/3 — too fast; humans couldn't orient before bots filled the board.)
const PACE_SCALE = 1 / 2;

export function thinkDelayMs(traits: Traits, difficulty: number): number {
  const jit = rand(0.85, 1.2);
  return Math.round((traits.baseThinkMs + difficulty * traits.thinkPerDifficultyMs) * jit * PACE_SCALE);
}

// Wider random range than thinkDelay — gives humans time to look at their
// hand and the board before any bot acts. Floor is ~3-4s for the fastest
// archetype (gut/anchor); slower archetypes (professor, deliberator) sit
// closer to 10-15s on phase entry.
export function firstActionDelayMs(traits: Traits): number {
  return Math.round(traits.baseThinkMs * rand(1.5, 3.0) * PACE_SCALE);
}

const NAMES = [
  "Bot-Alice", "Bot-Bob", "Bot-Carmen", "Bot-Diego", "Bot-Eve",
  "Bot-Finn", "Bot-Gus", "Bot-Hana", "Bot-Ivy", "Bot-Jax",
  "Bot-Kira", "Bot-Luna", "Bot-Milo", "Bot-Nina", "Bot-Otto",
  "Bot-Pia", "Bot-Quinn", "Bot-Remy", "Bot-Sai", "Bot-Tess",
];

/**
 * Prefer a name from the archetype's pool (so each archetype feels distinct);
 * fall back to the global pool, then a random suffix.
 */
export function pickBotName(taken: Set<string>, archetype?: Archetype): string {
  if (archetype) {
    const pool = archetypeFlavor(archetype).namePool;
    for (const n of pool) {
      if (!taken.has(n)) return n;
    }
  }
  for (const n of NAMES) {
    if (!taken.has(n)) return n;
  }
  return "Bot-" + Math.floor(Math.random() * 10000);
}
