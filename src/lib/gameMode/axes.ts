/**
 * Mode classification helpers shared by the lobby's mode browser. The catalog
 * itself only knows mechanical fields; these derive lobby-friendly axes,
 * chaos rating, and search/filter behavior from those fields.
 */
import { TIERS, type ModeTier } from "./tagVocabulary";
import type { DingGameModeDefinition } from "./types";

export type ModeAxis =
  | "Deal"
  | "Board"
  | "Identity"
  | "Visibility"
  | "Events"
  | "Info"
  | "Choice"
  | "Objective";

/** Selection-family sub-mechanics surfaced in the lobby filter. */
export type SelectSubTag =
  | "peek-keep"
  | "mulligan"
  | "trade-up"
  | "inheritance"
  | "expose-choice";

export const MODE_TIERS: readonly ModeTier[] = TIERS;

export const MODE_AXES: readonly ModeAxis[] = [
  "Deal",
  "Board",
  "Identity",
  "Visibility",
  "Events",
  "Info",
  "Choice",
  "Objective",
];

export const SELECT_SUB_TAGS: readonly SelectSubTag[] = [
  "peek-keep",
  "mulligan",
  "trade-up",
  "inheritance",
  "expose-choice",
];

export function modeAxes(mode: DingGameModeDefinition): readonly ModeAxis[] {
  const axes: ModeAxis[] = [];
  if (mode.phaseEffects) axes.push("Events");
  if (mode.infoFeatures) axes.push("Info");
  if (
    mode.deal.visibleHoleCards ||
    mode.deal.visibleHoleCardDetail ||
    mode.deal.visibleCommunityCardDetail ||
    mode.deal.visibleCommunityCardDetails ||
    mode.deal.publicCards ||
    mode.family === "info"
  ) {
    axes.push("Visibility");
  }
  if (
    mode.wildCards ||
    mode.wildCardsByPhase ||
    mode.excludedRanks ||
    mode.excludedMetas ||
    mode.forceRankByMeta ||
    mode.identityResolution ||
    mode.syntheticPair ||
    mode.rankTransform ||
    mode.suitTransform ||
    mode.deal.possibleIdentities ||
    (mode.deal.deck && mode.deal.deck !== "standard")
  ) {
    axes.push("Identity");
  }
  if (
    mode.deal.boards ||
    mode.deal.communityCards !== 5 ||
    mode.deal.visibleCommunityCards ||
    mode.deal.visibleCommunityIndexes ||
    mode.deal.scoreCommunityCards ||
    (mode.deal.boardLayout && mode.deal.boardLayout.kind !== "linear")
  ) {
    axes.push("Board");
  }
  if (mode.deal.dealChoice?.selectionPhase || mode.deal.publicCardSelection === "playerChoice") {
    axes.push("Choice");
  }
  if (mode.score !== "high") axes.push("Objective");
  if (axes.length === 0) axes.push("Deal");
  return axes;
}

export function modeChaosLevel(mode: DingGameModeDefinition): number {
  switch (mode.tier) {
    case "insanity": return 5;
    case "chaos": return 4;
    case "wild": return 3;
    case "twist": return 2;
    case "standard": return 1;
  }
}

export function modeMatchesQuery(mode: DingGameModeDefinition, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    mode.id,
    mode.name,
    mode.shortName,
    mode.summary,
    mode.detail,
    mode.tier,
    ...modeAxes(mode),
    ...mode.tags,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function isModeTier(value: string | null): value is ModeTier {
  return MODE_TIERS.includes(value as ModeTier);
}

export function dedupeModes(
  modes: readonly DingGameModeDefinition[],
): DingGameModeDefinition[] {
  const seen = new Set<string>();
  const result: DingGameModeDefinition[] = [];
  for (const mode of modes) {
    if (seen.has(mode.id)) continue;
    seen.add(mode.id);
    result.push(mode);
  }
  return result;
}
