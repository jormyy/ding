// Archetype presets. Stored as plain partial records to avoid a circular
// type import with personality.ts.

export type Archetype =
  | "anchor"
  | "deliberator"
  | "helper"
  | "quiet"
  | "professor"
  | "gut"
  | "newbie"
  | "worrier"
  | "optimist"
  | "skeptic";

type TraitPatch = Record<string, number>;

const PRESETS: Record<Archetype, TraitPatch> = {
  anchor: {
    decisiveness: 0.85, skill: 0.75, conscientiousness: 0.6,
    neuroticism: 0.2, extraversion: 0.45, helpfulness: 0.55,
    hesitationProb: 0.03, baseThinkMs: 5000, thinkPerDifficultyMs: 3500,
  },
  deliberator: {
    conscientiousness: 0.85, openness: 0.7, decisiveness: 0.35,
    skill: 0.7, hesitationProb: 0.18, baseThinkMs: 8000, thinkPerDifficultyMs: 8000,
  },
  helper: {
    helpfulness: 0.9, extraversion: 0.8, agreeableness: 0.7,
    skill: 0.65, baseThinkMs: 5500, thinkPerDifficultyMs: 5000,
  },
  quiet: {
    extraversion: 0.15, helpfulness: 0.3, agreeableness: 0.6,
    skill: 0.6, trustInTeammates: 0.65, baseThinkMs: 7000, thinkPerDifficultyMs: 6000,
  },
  professor: {
    skill: 0.92, conscientiousness: 0.75, decisiveness: 0.7,
    neuroticism: 0.15, hesitationProb: 0.02, helpfulness: 0.55,
    baseThinkMs: 9000, thinkPerDifficultyMs: 10000,
  },
  gut: {
    skill: 0.35, decisiveness: 0.85, conscientiousness: 0.25,
    openness: 0.6, hesitationProb: 0.04, baseThinkMs: 3000, thinkPerDifficultyMs: 2000,
  },
  newbie: {
    skill: 0.25, trustInTeammates: 0.85, conscientiousness: 0.5,
    decisiveness: 0.3, hesitationProb: 0.25, baseThinkMs: 7000, thinkPerDifficultyMs: 9000,
    memoryHorizon: 0,
  },
  worrier: {
    neuroticism: 0.85, conscientiousness: 0.7, decisiveness: 0.3,
    skill: 0.55, hesitationProb: 0.28, baseThinkMs: 7000, thinkPerDifficultyMs: 10000,
  },
  optimist: {
    agreeableness: 0.9, extraversion: 0.65, neuroticism: 0.2,
    trustInTeammates: 0.8, skill: 0.5, hesitationProb: 0.05,
    baseThinkMs: 4500, thinkPerDifficultyMs: 4000,
  },
  skeptic: {
    agreeableness: 0.2, helpfulness: 0.75, conscientiousness: 0.65,
    skill: 0.65, decisiveness: 0.55, trustInTeammates: 0.3,
    baseThinkMs: 6500, thinkPerDifficultyMs: 6500,
  },
};

const ALL: Archetype[] = Object.keys(PRESETS) as Archetype[];

export function pickArchetype(): Archetype {
  return ALL[Math.floor(Math.random() * ALL.length)];
}

export function archetypePatch(a: Archetype): TraitPatch {
  return PRESETS[a];
}

export function listArchetypes(): Archetype[] {
  return [...ALL];
}
