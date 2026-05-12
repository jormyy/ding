/**
 * Ding's reveal mechanics — flip order (worst rank first → best last) and
 * inversion scoring. Wraps the existing scoring/solver code so the engine
 * goes through the GameMode contract.
 */

import type { Card, Hand } from "../../lib/types";
import {
  computeShowdownForMode,
  countInversionsForRanks,
} from "../../lib/gameMode";

/**
 * Index in `ranking` of the next hand to be flipped.
 * Reveal proceeds worst → best, so revealIndex=0 maps to the last slot.
 */
export function nextFlipIndex(rankingLength: number, revealIndex: number): number {
  return rankingLength - 1 - revealIndex;
}

/**
 * Hand id of the next hand to be flipped, or null if the slot is empty
 * or out of range.
 */
export function nextFlipHandId(
  ranking: (string | null)[],
  revealIndex: number
): string | null {
  const idx = nextFlipIndex(ranking.length, revealIndex);
  if (idx < 0 || idx >= ranking.length) return null;
  return ranking[idx] ?? null;
}

/** Compute final score, ranking, and ranks for the reveal payload. */
export function computeReveal(
  ranking: (string | null)[],
  hands: Hand[],
  board: Card[],
  modeId?: string
): { score: number; trueRanking: string[]; trueRanks: Record<string, number> } {
  const showdown = computeShowdownForMode(modeId, hands, board);
  const score = countInversionsForRanks(ranking, showdown.trueRanks);
  return { score, trueRanking: showdown.trueRanking, trueRanks: showdown.trueRanks };
}
