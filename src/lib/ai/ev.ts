import type { GameState } from "../types";
import type { BeliefState } from "./belief";
import { applyChipMoveToRanking } from "../chipMove";

/**
 * Compute a cheap surrogate for "how wrong is this ranking?"
 *
 * Counts pairwise inversions (stronger hands ranked worse than weaker ones).
 * Also adds a small positional alignment term so that with few placed hands
 * (where no pairs exist yet), we still prefer strong hands in low-index slots.
 * Unclaimed slots receive a heavy penalty that dominates pairwise costs.
 */
export function expectedInversions(
  ranking: (string | null)[],
  strengthOf: (handId: string) => number
): number {
  const filled: Array<{ id: string; slot: number; s: number }> = [];
  for (let i = 0; i < ranking.length; i++) {
    const id = ranking[i];
    if (!id) continue;
    filled.push({ id, slot: i, s: strengthOf(id) });
  }
  let inv = 0;
  for (let i = 0; i < filled.length; i++) {
    for (let j = i + 1; j < filled.length; j++) {
      const a = filled[i], b = filled[j];
      // lower slot index = claimed stronger. Inversion if stronger-by-estimate
      // sits at a higher (worse) slot than weaker-by-estimate.
      if (a.slot < b.slot && a.s < b.s) inv++;
      if (a.slot > b.slot && a.s > b.s) inv++;
    }
  }
  // Tie-breaker only: a tiny positional bias so that with only one or two
  // hands placed (no pairs to compare yet), we still prefer to put strong
  // hands in low-index slots. Coefficient is small enough that any real
  // pairwise inversion (cost 1.0) dominates accumulated positional drift.
  const N = ranking.length;
  let positional = 0;
  if (N > 1 && filled.length > 0) {
    for (const f of filled) {
      const ideal = (1 - f.s) * (N - 1);
      const dist = Math.abs(f.slot - ideal);
      positional += dist;
    }
    // Scale so total positional contribution stays well below 1 per hand
    // even in worst case — this is a tiebreaker, not a score signal.
    positional *= 0.05;
  }
  // Penalty for unclaimed slots. A null slot = no chip placed → the hand
  // can't be scored at reveal, which is strictly worse than any ordering
  // mistake. Must dominate pairwise-inversion cost.
  const unclaimed = ranking.filter((x) => x === null).length;
  return inv + positional + unclaimed * (N + 1);
}

/**
 * Score for a candidate action.
 * `teamInversionDelta > 0` means the action improves the team ranking.
 */
export type ActionScore = {
  /** Expected inversion reduction (current − after). Positive = improvement. */
  teamInversionDelta: number;
  /** Confidence in this score, in [0, 1]. */
  confidence: number;
};

/**
 * Build a strength lookup function that resolves handId → estimated strength.
 * Priority: own Monte Carlo estimate > belief posterior > default 0.5.
 */
function buildStrengthFn(
  state: GameState,
  myPlayerId: string,
  belief: BeliefState,
  myEstimates: Map<string, number>
): (handId: string) => number {
  return (handId: string): number => {
    const mine = myEstimates.get(handId);
    if (mine !== undefined) return mine;
    const b = belief.handStrength.get(handId);
    if (b !== undefined) return b;
    // Unknown teammate hand — default to mid strength.
    const h = state.hands.find((x) => x.id === handId);
    if (h && h.playerId === myPlayerId && h.cards.length === 0) return 0.5;
    return 0.5;
  };
}

/**
 * Score a hypothetical ranking change by expected inversion reduction.
 *
 * @param trustOverrides  Optional per-hand strength overrides. Used when
 *   evaluating incoming proposals — the proposer is asserting their hand
 *   belongs at a new slot, which is evidence weighted by trust.
 *   Without this, bots reject good swaps because the proposer's hand looks
 *   weak from the recipient's current belief.
 */
export function scoreAction(
  state: GameState,
  after: (string | null)[],
  myPlayerId: string,
  belief: BeliefState,
  myEstimates: Map<string, number>,
  trustOverrides?: Map<string, number>
): ActionScore {
  const baseStrengthOf = buildStrengthFn(state, myPlayerId, belief, myEstimates);
  const strengthOf = trustOverrides
    ? (handId: string): number => trustOverrides.get(handId) ?? baseStrengthOf(handId)
    : baseStrengthOf;
  const currInv = expectedInversions(state.ranking, strengthOf);
  const nextInv = expectedInversions(after, strengthOf);

  // Confidence: average belief confidence over affected slots.
  let totalConf = 0;
  let n = 0;
  for (let i = 0; i < Math.max(state.ranking.length, after.length); i++) {
    const a = state.ranking[i];
    const b = after[i];
    if (a === b) continue;
    for (const hid of [a, b]) {
      if (!hid) continue;
      const h = state.hands.find((x) => x.id === hid);
      if (!h) continue;
      if (h.playerId === myPlayerId) { totalConf += 0.9; n++; }
      else { totalConf += belief.handConfidence.get(hid) ?? 0.3; n++; }
    }
  }
  const confidence = n === 0 ? 0.5 : totalConf / n;

  return {
    teamInversionDelta: currInv - nextInv,
    confidence,
  };
}

// ── Helpers that produce the `after` ranking for common actions ──

/**
 * Preview the ranking after moving a hand to a slot.
 * @returns The new ranking, or null if the move is illegal (target occupied by
 *   a different hand, or out of bounds).
 */
export function rankingAfterMove(
  ranking: (string | null)[],
  handId: string,
  toIndex: number
): (string | null)[] | null {
  if (toIndex < 0 || toIndex >= ranking.length) return null;
  const next = ranking.slice();
  const from = next.indexOf(handId);
  if (from === toIndex) return null; // no-op
  if (from !== -1) next[from] = null;
  if (next[toIndex] !== null && next[toIndex] !== undefined) return null;
  next[toIndex] = handId;
  return next;
}

/** Preview the ranking after swapping two placed hands. */
export function rankingAfterSwap(
  ranking: (string | null)[],
  a: string,
  b: string
): (string | null)[] {
  const next = ranking.slice();
  const ia = next.indexOf(a);
  const ib = next.indexOf(b);
  if (ia === -1 || ib === -1) return next;
  next[ia] = b;
  next[ib] = a;
  return next;
}

/** Preview the ranking after applying a chip move (acquire/offer/swap). */
export function rankingAfterChipMove(
  ranking: (string | null)[],
  initiatorHandId: string,
  recipientHandId: string,
  kind: "acquire" | "offer" | "swap"
): (string | null)[] {
  return applyChipMoveToRanking(ranking, kind, initiatorHandId, recipientHandId);
}

