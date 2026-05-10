/**
 * Single source for own-hand strength estimation. The bot's `getEstimate`
 * computes & caches `currentHandStrength` for hands the bot owns; this is the
 * only place the strategy guide's "rank what you have, not what you could
 * have" rule is enforced for own placements.
 */

import type { GameState, Hand } from "../../types";
import { currentHandStrength } from "../handStrength";
import type { BotMemo } from "../strategy";

/**
 * Get a cached strength estimate for a hand the bot owns, computing if
 * necessary. Cache lives in `memo.estimates` keyed by hand id; cleared at
 * phase boundaries.
 *
 * For unknown teammate hands the cache is keyed by hand and reused; callers
 * route those through belief, not this function.
 */
export function getEstimate(
  memo: BotMemo,
  hand: Hand,
  board: GameState["communityCards"]
): number {
  const cached = memo.estimates.get(hand.id);
  if (cached !== undefined) return cached;
  const score = currentHandStrength(hand.cards, board);
  memo.estimates.set(hand.id, score);
  return score;
}
