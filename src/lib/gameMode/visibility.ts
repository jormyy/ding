import type { Phase } from "../types";
import { getGameModeDefinition } from "./registry";
import {
  baseVisibleCommunity,
  type DingGameModeDefinition,
  type HoleCardVisibilityDetail,
} from "./types";

export function visibleCommunityCardCount(modeId: string | undefined, phase: Phase): number {
  const mode = getGameModeDefinition(modeId);
  const maxVisible = maxVisibleCommunityCards(mode);
  if (phase === "reveal") {
    const configuredReveal = mode.deal.visibleCommunityCards?.reveal;
    return Math.max(0, Math.min(maxVisible, configuredReveal ?? mode.deal.communityCards));
  }
  const configured = mode.deal.visibleCommunityCards?.[phase];
  if (configured !== undefined) {
    return Math.max(0, Math.min(maxVisible, configured));
  }
  const fallback = baseVisibleCommunity[phase] ?? 0;
  return Math.max(0, Math.min(maxVisible, fallback));
}

export function visibleHoleCardCount(modeId: string | undefined, phase: Phase): number {
  const mode = getGameModeDefinition(modeId);
  const configured = mode.deal.visibleHoleCards?.[phase];
  const count = configured ?? mode.deal.publicCards ?? 0;
  return Math.max(0, Math.min(mode.deal.holeCards, count));
}

export function visibleHoleCardDetail(
  modeId: string | undefined,
  phase?: Phase
): HoleCardVisibilityDetail {
  const detail = getGameModeDefinition(modeId).deal.visibleHoleCardDetail;
  if (detail === undefined) return "full";
  if (typeof detail === "string") return detail;
  return phase === undefined ? "full" : detail[phase] ?? "full";
}

export function visibleHoleCardIndexes(modeId: string | undefined, phase: Phase): readonly number[] | undefined {
  return getGameModeDefinition(modeId).deal.visibleHoleCardIndexes?.[phase];
}

export function visibleCommunityCardDetail(
  modeId: string | undefined,
  phase: Phase
): HoleCardVisibilityDetail {
  if (phase === "reveal") return "full";
  return getGameModeDefinition(modeId).deal.visibleCommunityCardDetail?.[phase] ?? "full";
}

export function visibleCommunityCardDetails(
  modeId: string | undefined,
  phase: Phase
): Record<number, HoleCardVisibilityDetail> {
  if (phase === "reveal") return {};
  return getGameModeDefinition(modeId).deal.visibleCommunityCardDetails?.[phase] ?? {};
}

function maxVisibleCommunityCards(mode: DingGameModeDefinition): number {
  const configured = Object.values(mode.deal.visibleCommunityCards ?? {});
  return Math.max(mode.deal.communityCards, ...configured);
}
