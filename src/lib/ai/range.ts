/**
 * Range estimation — weighted distributions over plausible hole-card combos.
 *
 * For each teammate hand we can't see, we maintain a Map<comboKey, weight>
 * representing which 2-card holdings are consistent with public info and
 * observed placements. A teammate placing hand H at slot K of N is evidence
 * that H's strength is near the (1 - K/(N-1)) percentile. We re-weight combos
 * by Gaussian likelihood of that implied percentile, given the current board.
 *
 * Also maintains a cached `PercentileMap`: for each combo, its absolute
 * strength on the current board (computed via pokersolver postflop, or the
 * strategy-guide tier score preflop).
 */

import type { Card } from "../types";
import { Hand as PokerHand } from "pokersolver";
import { cardKey, cardToPokersolverStr } from "../utils";
import { createDeck } from "../deckUtils";
import { preflopTierStrength, currentHandStrength } from "./handStrength";

/** String key for a 2-card combo, e.g. "AS-KH". Deterministic order. */
type ComboKey = string;

/** Weighted distribution over plausible hole-card combos for a single hand. */
export type RangeBelief = {
  /** Unnormalized weights; consumers normalize on read. */
  weights: Map<ComboKey, number>;
  /** Number of placement observations that have been folded in. */
  observations: number;
};

/** Create an empty range belief with no weights. */
export function newRangeBelief(): RangeBelief {
  return { weights: new Map(), observations: 0 };
}

/**
 * Deterministic combo key for two cards.
 * Sorts by cardKey so {AS, KH} and {KH, AS} collapse to the same identity.
 */
function makeComboKey(a: Card, b: Card): ComboKey {
  const ka = cardKey(a);
  const kb = cardKey(b);
  return ka < kb ? `${ka}-${kb}` : `${kb}-${ka}`;
}

/**
 * Map from combo key to its percentile strength on the current board.
 *
 * For postflop boards, percentiles are derived from pokersolver ranks.
 * For empty boards (preflop), the strategy-guide tier score provides the score.
 */
export type PercentileMap = Map<ComboKey, number>;

function preflopScalar(a: Card, b: Card): number {
  // Use the same tier-based scoring as the bot's own hand estimates so
  // that range beliefs and scalar beliefs share the same strength scale.
  return preflopTierStrength([a, b]);
}

/**
 * Build a percentile map for all possible 2-card combos on the given board.
 *
 * Excludes cards known to be unavailable (board cards, own hole cards, flipped
 * hands). Each remaining combo is scored and sorted; the percentile is its
 * position in the sorted list (0 = weakest, 1 = strongest).
 */
export function buildPercentileMap(
  excluded: Set<string>,
  board: Card[]
): PercentileMap {
  const candidates = createDeck().filter((c) => !excluded.has(cardKey(c)));
  const scored: Array<{ key: ComboKey; score: number }> = [];

  if (board.length === 0) {
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const a = candidates[i], b = candidates[j];
        scored.push({ key: makeComboKey(a, b), score: preflopScalar(a, b) });
      }
    }
  } else {
    const boardStrs = board.map(cardToPokersolverStr);
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const a = candidates[i], b = candidates[j];
        const cards = [cardToPokersolverStr(a), cardToPokersolverStr(b), ...boardStrs];
        const ph = PokerHand.solve(cards);
        // pokersolver's `rank` increases with hand strength (e.g., high card
        // < pair < two-pair < ...). Convert to a numeric score; lexicographic
        // order via .rank already works for sorting.
        scored.push({ key: makeComboKey(a, b), score: ph.rank });
      }
    }
  }

  // Sort by score ascending → low-strength combos at the start.
  scored.sort((a, b) => a.score - b.score);
  const N = Math.max(1, scored.length - 1);
  const out: PercentileMap = new Map();
  scored.forEach((s, i) => out.set(s.key, i / N));
  return out;
}

/**
 * Bayesian update of a range belief from a single placement observation.
 *
 * A teammate placing hand H at slot K of N implies strength ≈ 1 - K/(N-1).
 * For each combo, we multiply its weight by the Gaussian likelihood of
 * (impliedStrength - comboPercentile), with standard deviation `sigma`.
 * Smaller sigma = sharper update (used on later phases where placements are
 * more reliable).
 */
export function applyPlacement(
  range: RangeBelief,
  percentiles: PercentileMap,
  slot: number,
  totalHands: number,
  sigma: number
): void {
  if (totalHands <= 1) return;
  const impliedQ = 1 - slot / (totalHands - 1);
  const twoSigmaSq = 2 * sigma * sigma;
  for (const [key, w] of range.weights) {
    const p = percentiles.get(key);
    if (p === undefined) continue;
    const d = impliedQ - p;
    const lik = Math.exp(-(d * d) / twoSigmaSq);
    range.weights.set(key, w * lik);
  }
  range.observations++;
  // Normalize to keep weights from underflowing/overflowing. Total mass = 1.
  let total = 0;
  for (const w of range.weights.values()) total += w;
  if (total > 0 && total !== 1) {
    for (const [k, w] of range.weights) range.weights.set(k, w / total);
  }
}

/**
 * Map from combo key to its absolute strength on the current board.
 * Uses the same `currentHandStrength` scale as the bot's own hand estimates,
 * so range-derived beliefs are directly comparable to scalar beliefs.
 */
type AbsoluteStrengthMap = Map<ComboKey, number>;

/**
 * Build an absolute strength map for all possible 2-card combos on the board.
 */
export function buildAbsoluteStrengthMap(
  excluded: Set<string>,
  board: Card[]
): AbsoluteStrengthMap {
  const candidates = createDeck().filter((c) => !excluded.has(cardKey(c)));
  const out: AbsoluteStrengthMap = new Map();
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i], b = candidates[j];
      out.set(makeComboKey(a, b), currentHandStrength([a, b], board));
    }
  }
  return out;
}

/**
 * Remove combos from a range that are inconsistent with newly known cards.
 * Called when the board changes or a hand is flipped, revealing new cards.
 */
export function pruneByExclusions(range: RangeBelief, excluded: Set<string>): void {
  for (const key of Array.from(range.weights.keys())) {
    const [a, b] = key.split("-");
    if (excluded.has(a) || excluded.has(b)) range.weights.delete(key);
  }
}

/**
 * Weighted-mean percentile across a range belief.
 * This is the value plugged into the team-EV scorer in place of a scalar
 * belief mean when range-derived strength is active.
 */
export function rangeMeanStrength(
  range: RangeBelief,
  percentiles: PercentileMap
): number {
  let totalW = 0;
  let acc = 0;
  for (const [key, w] of range.weights) {
    const p = percentiles.get(key);
    if (p === undefined) continue;
    totalW += w;
    acc += p * w;
  }
  if (totalW <= 0) return 0.5;
  return acc / totalW;
}

/**
 * Decay a range belief toward uniform weights.
 * Called at phase boundaries because the previous phase's placements were
 * made on a different board and are now stale signal.
 * @param alpha  Blend factor toward uniform (0 = no change, 1 = fully uniform).
 */
export function decayRange(range: RangeBelief, alpha: number): void {
  if (range.weights.size === 0) return;
  const uniform = 1 / range.weights.size;
  for (const [k, w] of range.weights) {
    range.weights.set(k, w * (1 - alpha) + uniform * alpha);
  }
}
