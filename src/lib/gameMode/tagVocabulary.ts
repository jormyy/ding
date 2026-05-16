/**
 * Canonical taxonomy for the gamemode catalog.
 *
 * Two required axes per mode:
 *   - `family` (this file's FAMILIES): the single most load-bearing mechanic
 *     group — the answer to "what kind of thing is this mode?"
 *   - `tier` (this file's TIERS): chaos level on a 5-step curve.
 *
 * Plus 0–3 sub-tags from `SUB_TAGS` that refine the mode further. Sub-tags
 * can cross families (e.g., a `tempo` mode can carry `weather` if environment
 * is a secondary aspect).
 *
 * The schema in `schema.ts` enforces all three lists as zod enums; YAMLs that
 * drift get rejected at codegen.
 */

export const FAMILIES = [
  "info",
  "selection",
  "tempo",
  "environment",
  "identity",
  "hand",
] as const;

export type ModeFamily = (typeof FAMILIES)[number];

export const FAMILY_DESCRIPTIONS: Record<ModeFamily, string> = {
  info: "What players see or know about cards and game state.",
  selection: "Pre-deal or mid-game card choice (peek, mulligan, trade, inherit).",
  tempo: "When phases happen and when twists fire.",
  environment: "Board, world, or deck-level effects.",
  identity: "Player roles, seats, tokens, and objectives.",
  hand: "What hands look like and how they score.",
};

export const TIERS = [
  "standard",
  "twist",
  "wild",
  "chaos",
  "insanity",
] as const;

export type ModeTier = (typeof TIERS)[number];

export const TIER_DESCRIPTIONS: Record<ModeTier, string> = {
  standard: "1 mechanic, low surprise — closest to baseline poker.",
  twist: "1 mechanic with a clear hook.",
  wild: "2 mechanics or 1 large-effect mechanic.",
  chaos: "3+ mechanics or compounding effects.",
  insanity: "Multiple twists stack; designed to overwhelm.",
};

export const SUB_TAGS = [
  // info family
  "info-public",
  "info-private",
  "info-overlay",
  // selection family
  "peek-keep",
  "mulligan",
  "trade-up",
  "inheritance",
  "expose-choice",
  // tempo family
  "phase-tempo",
  "late-detonation",
  // environment family
  "weather",
  "multi-board",
  "constrained-deal",
  "deck-swap",
  // identity family
  "identity-token",
  "positional",
  "relational",
  "mission",
  // hand family
  "big-hands",
  "wild",
  "score-pivot",
] as const;

export type SubTag = (typeof SUB_TAGS)[number];

export const TAG_DESCRIPTIONS: Record<SubTag, string> = {
  "info-public": "All players see the same extra card info (public reveal schedule).",
  "info-private": "Owner or a subset peek at info hidden from others.",
  "info-overlay": "Informational chip only — board state unchanged.",
  "peek-keep": "Owner sees N candidates and keeps a subset.",
  mulligan: "Owner can take a one-time full redraw.",
  "trade-up": "Owner passes one card to a neighbor before preflop.",
  inheritance: "Owner keeps one card; another comes from a neighbor's discard.",
  "expose-choice": "Owner chooses which hole card is publicly visible.",
  "phase-tempo": "Phase order or pacing diverges from the baseline schedule.",
  "late-detonation": "Twist fires at river or reveal after most decisions are locked.",
  weather: "Atmospheric mid-game effect hitting all hands equally.",
  "multi-board": "Two or more separately scored boards.",
  "constrained-deal": "Hand composition constraint at deal (pocket pair, same suit, …).",
  "deck-swap": "Deck composition replaced (short, stripped, double, …).",
  "identity-token": "Cards carry hidden identity metadata (joker, tarot, cursed, …).",
  positional: "Seat-relative effects: clockwise rotations, neighbor swaps.",
  relational: "One hand's contents affect another's score, qualifier, or inheritance.",
  mission: "Alternate qualifier or score rule — round only counts when a property holds.",
  "big-hands": "Non-baseline deal shape (Omaha-style, tiny-board, behemoth).",
  wild: "Designated ranks/suits substitute at showdown.",
  "score-pivot": "Mid-hand scoring rule swap (red, black, lowball, invert).",
};

export const FAMILY_TO_SUB_TAGS: Record<ModeFamily, readonly SubTag[]> = {
  info: ["info-public", "info-private", "info-overlay"],
  selection: ["peek-keep", "mulligan", "trade-up", "inheritance", "expose-choice"],
  tempo: ["phase-tempo", "late-detonation"],
  environment: ["weather", "multi-board", "constrained-deal", "deck-swap"],
  identity: ["identity-token", "positional", "relational", "mission"],
  hand: ["big-hands", "wild", "score-pivot"],
};
