// Archetype presets + flavor. Stored as plain partial records to avoid a
// circular type import with personality.ts.

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
    decisiveness: 0.85, skill: 0.87, conscientiousness: 0.6,
    neuroticism: 0.2, extraversion: 0.45, helpfulness: 0.55,
    hesitationProb: 0.03, baseThinkMs: 5000, thinkPerDifficultyMs: 3500,
    stubbornness: 0.75,
  },
  deliberator: {
    conscientiousness: 0.85, openness: 0.7, decisiveness: 0.35,
    skill: 0.85, hesitationProb: 0.18, baseThinkMs: 8000, thinkPerDifficultyMs: 8000,
    stubbornness: 0.65,
  },
  helper: {
    helpfulness: 0.9, extraversion: 0.8, agreeableness: 0.7,
    skill: 0.81, baseThinkMs: 5500, thinkPerDifficultyMs: 5000,
    stubbornness: 0.45,
  },
  quiet: {
    extraversion: 0.15, helpfulness: 0.3, agreeableness: 0.6,
    skill: 0.79, trustInTeammates: 0.65, baseThinkMs: 7000, thinkPerDifficultyMs: 6000,
    stubbornness: 0.6,
  },
  professor: {
    skill: 0.92, conscientiousness: 0.75, decisiveness: 0.7,
    neuroticism: 0.15, hesitationProb: 0.02, helpfulness: 0.55,
    baseThinkMs: 9000, thinkPerDifficultyMs: 10000,
    stubbornness: 0.8,
  },
  gut: {
    skill: 0.72, decisiveness: 0.85, conscientiousness: 0.25,
    openness: 0.6, hesitationProb: 0.04, baseThinkMs: 3000, thinkPerDifficultyMs: 2000,
    stubbornness: 0.5,
  },
  newbie: {
    skill: 0.70, trustInTeammates: 0.85, conscientiousness: 0.5,
    decisiveness: 0.3, hesitationProb: 0.25, baseThinkMs: 7000, thinkPerDifficultyMs: 9000,
    stubbornness: 0.35,
  },
  worrier: {
    neuroticism: 0.85, conscientiousness: 0.7, decisiveness: 0.3,
    skill: 0.77, hesitationProb: 0.28, baseThinkMs: 7000, thinkPerDifficultyMs: 10000,
    stubbornness: 0.7,
  },
  optimist: {
    agreeableness: 0.9, extraversion: 0.65, neuroticism: 0.2,
    trustInTeammates: 0.8, skill: 0.75, hesitationProb: 0.05,
    baseThinkMs: 4500, thinkPerDifficultyMs: 4000,
    stubbornness: 0.4,
  },
  skeptic: {
    agreeableness: 0.2, helpfulness: 0.75, conscientiousness: 0.65,
    skill: 0.81, decisiveness: 0.55, trustInTeammates: 0.3,
    baseThinkMs: 6500, thinkPerDifficultyMs: 6500,
    stubbornness: 0.85,
  },
};

const ALL: Archetype[] = Object.keys(PRESETS) as Archetype[];

/**
 * Per-archetype quirks read by the strategy layer. All values default to 0
 * (no effect) when omitted.
 */
export type ArchetypeQuirks = {
  /** Newbie: small bias toward placing own pairs higher than warranted. */
  overrankOwnPairs?: number;
  /** Skeptic: extra reject weight on proposals into rank 1. */
  suspectsTop?: number;
  /** Anchor/professor: more likely to claim top-rank slots first. */
  leadsConsensus?: number;
  /** Helper/optimist: lower stubbornness on accept. */
  cedesEasily?: number;
};

export type ArchetypeFlavor = {
  description: string;
  namePool: string[];
  /** Multiplier on ding-emission probability. */
  dingTendency: number;
  /** Multiplier on fuckoff-emission probability. */
  fuckoffTendency: number;
  catchphrases: { ding?: string[]; fuckoff?: string[]; readyEarly?: string[] };
  quirks: ArchetypeQuirks;
};

const FLAVORS: Record<Archetype, ArchetypeFlavor> = {
  anchor: {
    description: "Confident rock; claims top slots fast, dings on premium only.",
    namePool: ["Atlas", "Pillar", "Granite", "Keel", "Mast"],
    dingTendency: 0.9,
    fuckoffTendency: 0.4,
    catchphrases: { ding: ["Got it.", "Locked."], fuckoff: ["No."] },
    quirks: { leadsConsensus: 0.5 },
  },
  deliberator: {
    description: "Slow methodical; rarely dings, never first to ready.",
    namePool: ["Sage", "Owl", "Thorne", "Vance"],
    dingTendency: 0.5,
    fuckoffTendency: 0.5,
    catchphrases: { ding: ["Hmm."], fuckoff: ["I think not."] },
    quirks: {},
  },
  helper: {
    description: "Agreeable, accepts trades, frequent encouraging dings.",
    namePool: ["Sunny", "Rosa", "Jolie", "Pip"],
    dingTendency: 1.4,
    fuckoffTendency: 0.4,
    catchphrases: { ding: ["Nice!", "Yes!"], fuckoff: ["Hmm, no."] },
    quirks: { cedesEasily: 0.4 },
  },
  quiet: {
    description: "Minimal expression, observes; almost never dings/fuckoffs.",
    namePool: ["Mira", "Wren", "Sable", "Vesper"],
    dingTendency: 0.3,
    fuckoffTendency: 0.3,
    catchphrases: { ding: ["."], fuckoff: ["..."] },
    quirks: {},
  },
  professor: {
    description: "Top skill; dings only on real premium; precise small swaps.",
    namePool: ["Doc", "Kepler", "Curie", "Turing", "Newton"],
    dingTendency: 0.7,
    fuckoffTendency: 0.5,
    catchphrases: { ding: ["Indeed.", "Precisely."], fuckoff: ["Incorrect."] },
    quirks: { leadsConsensus: 0.6 },
  },
  gut: {
    description: "Fast and loud; impulsive dings and fuckoffs both.",
    namePool: ["Blaze", "Riot", "Maverick", "Zephyr"],
    dingTendency: 1.5,
    fuckoffTendency: 1.6,
    catchphrases: { ding: ["YES!", "Boom."], fuckoff: ["NO!", "Get out."] },
    quirks: {},
  },
  newbie: {
    description: "Over-ranks own pairs; eager dings on top-pair-no-kicker.",
    namePool: ["Sprout", "Lark", "Penny", "Junior"],
    dingTendency: 1.3,
    fuckoffTendency: 0.5,
    catchphrases: { ding: ["Pair!", "Look at this!"], fuckoff: ["Hey…"] },
    quirks: { overrankOwnPairs: 0.05 },
  },
  worrier: {
    description: "Frequent hesitation, rare dings, anxious small fuckoffs.",
    namePool: ["Misha", "Pim", "Wisp", "Wilow"],
    dingTendency: 0.4,
    fuckoffTendency: 1.2,
    catchphrases: { ding: ["Maybe?"], fuckoff: ["Wait, no!"] },
    quirks: {},
  },
  optimist: {
    description: "Cheerful; dings often, assumes teammates are right.",
    namePool: ["Sunbeam", "Beam", "Rainy", "Halcyon", "Cosmo"],
    dingTendency: 1.5,
    fuckoffTendency: 0.3,
    catchphrases: { ding: ["Great!", "Love it."], fuckoff: ["Mm, nope."] },
    quirks: { cedesEasily: 0.3 },
  },
  skeptic: {
    description: "Rejects more proposals into top slots; dings on the nuts only.",
    namePool: ["Sly", "Ravi", "Quill", "Stoic"],
    dingTendency: 0.6,
    fuckoffTendency: 1.5,
    catchphrases: { ding: ["Confirmed."], fuckoff: ["No way.", "Absolutely not."] },
    quirks: { suspectsTop: 0.5 },
  },
};

export function pickArchetype(): Archetype {
  return ALL[Math.floor(Math.random() * ALL.length)];
}

/**
 * Pick an archetype that isn't already in use. Falls back to uniform random
 * once all 10 are taken, so the next bot in an oversized room behaves sanely.
 */
export function pickUnusedArchetype(used: Set<Archetype>): Archetype {
  const free = ALL.filter((a) => !used.has(a));
  if (free.length === 0) return pickArchetype();
  return free[Math.floor(Math.random() * free.length)];
}

export function archetypePatch(a: Archetype): TraitPatch {
  return PRESETS[a];
}

export function archetypeFlavor(a: Archetype): ArchetypeFlavor {
  return FLAVORS[a];
}

export function allArchetypes(): readonly Archetype[] {
  return ALL;
}
