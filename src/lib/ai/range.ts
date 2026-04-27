// Range estimation — for each teammate hand, maintain a weighted distribution
// over plausible 2-card hole combos consistent with current public info.
//
// The bot can't see teammate hole cards, but it can update beliefs from
// placements, swaps, accepts, and rejects. A teammate placing hand H at
// slot K of N is evidence that, in their view, H's strength is in the
// (1 - K/(N-1)) percentile. We re-weight combos by how compatible they are
// with that placement, given the current board.
//
// Structure: per teammate hand, a Map<comboKey, weight>. Per phase, a cached
// percentile lookup keyed by the combo — the "absolute strength" of a combo
// on the current board, expressed as a percentile in [0, 1] across all
// non-excluded combos.

import type { Card } from "../types";
import { Hand as PokerHand } from "pokersolver";
import { cardToPokersolverStr } from "../utils";
import { createDeck } from "../deckUtils";

export type ComboKey = string; // e.g. "AS-KH" with deterministic order

export type RangeBelief = {
  weights: Map<ComboKey, number>; // sum can be anything; consumers normalize
  observations: number;           // number of placements folded in
};

export function newRangeBelief(): RangeBelief {
  return { weights: new Map(), observations: 0 };
}

function cardKey(c: Card): string {
  return c.rank + c.suit;
}

// Deterministic combo key — sorted by cardKey so {AS, KH} and {KH, AS}
// collapse to the same identity.
export function makeComboKey(a: Card, b: Card): ComboKey {
  const ka = cardKey(a);
  const kb = cardKey(b);
  return ka < kb ? `${ka}-${kb}` : `${kb}-${ka}`;
}

// Initialize a teammate-hand range over all combos consistent with current
// exclusions. Each combo starts with uniform weight 1.
export function initRange(
  excluded: Set<string>,
  deck: Card[]
): RangeBelief {
  const out = newRangeBelief();
  const candidates = deck.filter((c) => !excluded.has(cardKey(c)));
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      out.weights.set(makeComboKey(candidates[i], candidates[j]), 1);
    }
  }
  return out;
}

// Per-board percentile lookup. For each candidate combo, compute its
// pokersolver score against current board (or use a cheap preflop heuristic
// for empty boards). Sort to derive a percentile in [0, 1].
//
// Preflop: Chen-style heuristic (same scale used in handStrength.ts).
export type PercentileMap = Map<ComboKey, number>;

const RANK_VALUE: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  T: 10, J: 11, Q: 12, K: 13, A: 14,
};

function preflopScalar(a: Card, b: Card): number {
  const hi = Math.max(RANK_VALUE[a.rank], RANK_VALUE[b.rank]);
  const lo = Math.min(RANK_VALUE[a.rank], RANK_VALUE[b.rank]);
  const suited = a.suit === b.suit;
  const pair = a.rank === b.rank;
  const gap = hi - lo;
  let score: number;
  if (pair) {
    score = 0.5 + ((hi - 2) / 12) * 0.5;
  } else {
    score = (hi / 14) * 0.55 + (lo / 14) * 0.25;
    if (suited) score += 0.05;
    if (gap === 1) score += 0.04;
    else if (gap === 2) score += 0.02;
    else if (gap >= 5) score -= 0.04;
    if (hi >= 12 && lo >= 10) score += 0.04;
  }
  return Math.max(0, Math.min(1, score));
}

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

// Bayesian update: a teammate placed hand H at slot K of totalHands. The
// implied strength is impliedQ = 1 - K/(N-1). For each combo, multiply weight
// by Gaussian likelihood of (impliedQ - percentile).
//
// sigma controls how informative the observation is. Preflop placements are
// noisy (low information), river placements are sharp.
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

// Strip combos that are no longer consistent (e.g., because we just learned
// a card is on the board or in another revealed hand).
export function pruneByExclusions(range: RangeBelief, excluded: Set<string>): void {
  for (const key of Array.from(range.weights.keys())) {
    const [a, b] = key.split("-");
    if (excluded.has(a) || excluded.has(b)) range.weights.delete(key);
  }
}

// Weighted-mean percentile across the range — what we plug into the team-EV
// scorer in place of a scalar belief mean.
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

// Effective sample size = (Σw)² / Σw² ; high ESS means the range is still
// diffuse, low ESS means it's collapsed onto a few combos. Useful as a
// confidence proxy for downstream consumers.
export function effectiveSampleSize(range: RangeBelief): number {
  let sum = 0, sumSq = 0;
  for (const w of range.weights.values()) {
    sum += w;
    sumSq += w * w;
  }
  if (sumSq <= 0) return 0;
  return (sum * sum) / sumSq;
}

// Confidence in [0, 1] derived from how much the range has narrowed.
// Empty/uniform → 0.3; very tight → 0.95.
export function rangeConfidence(range: RangeBelief): number {
  if (range.weights.size === 0) return 0.3;
  const ess = effectiveSampleSize(range);
  const total = range.weights.size;
  if (total <= 1) return 0.3;
  // Normalized: 1 - ess/total in [0, 1] (0 when uniform, 1 when collapsed).
  const narrowness = 1 - ess / total;
  return Math.min(0.95, 0.3 + 0.65 * narrowness);
}

// Decay observations toward uniform — used at phase boundary because the
// previous phase's placements were made on a different board.
export function decayRange(range: RangeBelief, alpha: number): void {
  if (range.weights.size === 0) return;
  const uniform = 1 / range.weights.size;
  for (const [k, w] of range.weights) {
    range.weights.set(k, w * (1 - alpha) + uniform * alpha);
  }
}
