import { pickArchetype, archetypePatch, type Archetype } from "./archetypes";

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
  memoryHorizon: number; // 0..4

  // Pacing
  baseThinkMs: number;
  thinkPerDifficultyMs: number;
  hesitationProb: number;
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
    memoryHorizon: 2,

    baseThinkMs: 6000,
    thinkPerDifficultyMs: 6000,
    hesitationProb: 0.08,
  };
}

export function randomTraits(archetype?: Archetype): { traits: Traits; archetype: Archetype } {
  const a = archetype ?? pickArchetype();
  const merged: Traits = { ...defaultTraits(), ...archetypePatch(a) } as Traits;
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
    hesitationProb: jitter(merged.hesitationProb, 0.04),
    baseThinkMs: Math.round(merged.baseThinkMs * rand(0.85, 1.15)),
    thinkPerDifficultyMs: Math.round(merged.thinkPerDifficultyMs * rand(0.85, 1.15)),
  };
  return { traits: jittered, archetype: a };
}

// Pacing windows derived from traits + current decision difficulty.
// difficulty in [0,1] comes from entropy of top-candidate utilities.
// Global pacing multiplier — bots act ~3x faster than raw trait values imply.
const PACE_SCALE = 1 / 3;

export function thinkDelayMs(traits: Traits, difficulty: number): number {
  const jit = rand(0.85, 1.2);
  return Math.round((traits.baseThinkMs + difficulty * traits.thinkPerDifficultyMs) * jit * PACE_SCALE);
}

export function firstActionDelayMs(traits: Traits): number {
  return Math.round(traits.baseThinkMs * rand(0.8, 1.6) * PACE_SCALE);
}

const NAMES = [
  "Bot-Alice", "Bot-Bob", "Bot-Carmen", "Bot-Diego", "Bot-Eve",
  "Bot-Finn", "Bot-Gus", "Bot-Hana", "Bot-Ivy", "Bot-Jax",
  "Bot-Kira", "Bot-Luna", "Bot-Milo", "Bot-Nina", "Bot-Otto",
  "Bot-Pia", "Bot-Quinn", "Bot-Remy", "Bot-Sai", "Bot-Tess",
];

export function pickBotName(taken: Set<string>): string {
  for (const n of NAMES) {
    if (!taken.has(n)) return n;
  }
  return "Bot-" + Math.floor(Math.random() * 10000);
}
