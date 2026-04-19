import type { ClientMessage, GameState, Hand } from "../types";
import type { BeliefState } from "./belief";

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
  // Penalty for unclaimed slots (null means no chip → unscorable at reveal).
  const unclaimed = ranking.filter((x) => x === null).length;
  return inv + unclaimed * 0.5;
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
  const next = ranking.slice();
  const ii = next.indexOf(initiatorHandId);
  const ir = next.indexOf(recipientHandId);
  if (kind === "acquire") {
    // initiator takes recipient's slot; recipient becomes unranked.
    if (ir === -1) return next;
    next[ir] = initiatorHandId;
    if (ii !== -1) next[ii] = null;
  } else if (kind === "offer") {
    // recipient takes initiator's slot; initiator becomes unranked.
    if (ii === -1) return next;
    next[ii] = recipientHandId;
    if (ir !== -1) next[ir] = null;
  } else {
    // swap
    if (ii === -1 || ir === -1) return next;
    next[ii] = recipientHandId;
    next[ir] = initiatorHandId;
  }
  return next;
}

export function ownsHand(state: GameState, handId: string, pid: string): boolean {
  const h = state.hands.find((x) => x.id === handId);
  return !!h && h.playerId === pid;
}

export function myHands(state: GameState, pid: string): Hand[] {
  return state.hands.filter((h) => h.playerId === pid);
}

// Used by the "is this action still worth emitting" guard.
export function messageAffectsRanking(msg: ClientMessage): boolean {
  switch (msg.type) {
    case "move":
    case "swap":
    case "proposeChipMove":
    case "acceptChipMove":
      return true;
    default:
      return false;
  }
}
