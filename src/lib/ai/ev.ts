import type { GameState } from "../types";
import type { BeliefState } from "./belief";
import { applyChipMoveToRanking } from "../chipMove";

// Cheap inversion surrogate: given a proposed ranking (array of handIds),
// plus our best guess at each hand's strength, count pairwise misorderings.
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
  // Penalty for unclaimed slots. A null slot = no chip placed → the hand
  // can't be scored at reveal, which is strictly worse than any ordering
  // mistake. Must dominate pairwise-inversion cost.
  const unclaimed = ranking.filter((x) => x === null).length;
  return inv + unclaimed * (ranking.length + 1);
}

export type ActionScore = {
  teamInversionDelta: number; // positive = improvement (current − after)
  confidence: number;         // 0..1 — how sure we are about this score
};

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

// Score the outcome of applying a hypothetical ranking change. Returns
// team-EV in units of (expected) inversion reduction.
export function scoreAction(
  state: GameState,
  after: (string | null)[],
  myPlayerId: string,
  belief: BeliefState,
  myEstimates: Map<string, number>
): ActionScore {
  const strengthOf = buildStrengthFn(state, myPlayerId, belief, myEstimates);
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

// Helpers that produce the `after` ranking for common actions.

export function rankingAfterMove(
  ranking: (string | null)[],
  handId: string,
  toIndex: number
): (string | null)[] {
  const next = ranking.slice();
  const from = next.indexOf(handId);
  // Remove from previous slot if any.
  if (from !== -1) next[from] = null;
  // If toIndex is occupied, cannot place — return unchanged.
  if (next[toIndex] !== null && next[toIndex] !== undefined) {
    // fallback: restore
    if (from !== -1) next[from] = handId;
    return next;
  }
  next[toIndex] = handId;
  return next;
}

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

export function rankingAfterChipMove(
  ranking: (string | null)[],
  initiatorHandId: string,
  recipientHandId: string,
  kind: "acquire" | "offer" | "swap"
): (string | null)[] {
  return applyChipMoveToRanking(ranking, kind, initiatorHandId, recipientHandId);
}

