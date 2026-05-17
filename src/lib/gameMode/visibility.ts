import type { Phase } from "../types";
import { clamp } from "../utils";
import { getGameModeDefinition } from "./registry";
import {
  baseVisibleCommunity,
  type DingGameModeDefinition,
  type HoleCardVisibilityDetail,
} from "./types";

export function visibleCommunityCardCount(modeId: string | undefined, phase: Phase): number {
  const mode = getGameModeDefinition(modeId);
  const maxVisible = maxVisibleCommunityCards(mode);
  const configuredIndexes = mode.deal.visibleCommunityIndexes?.[phase];
  if (configuredIndexes !== undefined) {
    return clamp(configuredIndexes.length, 0, maxVisible);
  }
  if (phase === "reveal") {
    const configuredReveal = mode.deal.visibleCommunityCards?.reveal;
    if (configuredReveal !== undefined) return configuredReveal;
    // Reveal returns a very large slot count so the caller's slice (sliced
    // against `state.allCommunityCards`) yields every card on the board —
    // including any absorbed onto it by phase effects (last-rites). Clamping
    // here would hide absorbed cards even though the engine has placed them.
    return Number.MAX_SAFE_INTEGER;
  }
  const configured = mode.deal.visibleCommunityCards?.[phase];
  if (configured !== undefined) {
    return clamp(configured, 0, maxVisible);
  }
  const fallback = baseVisibleCommunity[phase] ?? 0;
  return clamp(fallback, 0, maxVisible);
}

/**
 * Phase-substep-aware count override. When a phase-effect sets a substep on
 * state, the renderer can call this from the broadcast wrapper to override
 * the static count from `visibleCommunityCardCount` — e.g. flopOneAtATime
 * exposes 1, then 2, then 3 cards across consecutive ticks.
 *
 * Returns null when no override applies — the renderer should use the
 * static count in that case.
 */
export function visibleCommunityCardCountForSubstep(
  _modeId: string | undefined,
  phase: Phase,
  substep: string | undefined,
): number | null {
  if (phase !== "flop") return null;
  switch (substep) {
    case "flop1": return 1;
    case "flop2": return 2;
    case "flop3": return 3;
    case "flopRevert": return 3;
    // flopDraftPending: 6 cards laid out face-up so each seat picks one
    case "flopDraftPending": return 6;
    default: return null;
  }
}

export function visibleCommunityCardIndexes(modeId: string | undefined, phase: Phase): ReadonlyArray<number> | null {
  const mode = getGameModeDefinition(modeId);
  return mode.deal.visibleCommunityIndexes?.[phase] ?? null;
}

export function visibleHoleCardCount(modeId: string | undefined, phase: Phase): number {
  const mode = getGameModeDefinition(modeId);
  const configured = mode.deal.visibleHoleCards?.[phase];
  const count = configured ?? mode.deal.publicCards ?? 0;
  return clamp(count, 0, mode.deal.holeCards);
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
  const counts = Object.values(mode.deal.visibleCommunityCards ?? {});
  const indexLengths = Object.values(mode.deal.visibleCommunityIndexes ?? {}).map((idx) => idx.length);
  return Math.max(mode.deal.communityCards, ...counts, ...indexLengths);
}
