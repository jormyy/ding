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

export const TIERS = [
  "standard",
  "twist",
  "wild",
  "chaos",
  "insanity",
] as const;

export type ModeTier = (typeof TIERS)[number];

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
