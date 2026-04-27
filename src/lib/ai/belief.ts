import type { AcquireRequest, GameState } from "../types";

// Belief: for each teammate hand we don't own, a posterior over its strength
// in [0,1]. Stored as (mean, concentration) — a lightweight Beta proxy.
export type HandBelief = {
  mean: number;          // posterior mean strength
  concentration: number; // pseudo-observations; higher = tighter
  lastSlot: number | null;
  slotStableFor: number; // phases the hand has sat at the same slot
};

export type TeammateBelief = {
  hands: Map<string, HandBelief>; // handId -> belief
  churnRate: number;              // 0..1 — recent reorder frequency
  skillPrior: number;             // 0..1 — how "good" we think they are (updated at reveal)
};

export type BeliefState = {
  perTeammate: Map<string, TeammateBelief>; // playerId -> belief
  // Cached per-hand posterior strength (handId -> mean). Flattened view.
  handStrength: Map<string, number>;
  handConfidence: Map<string, number>; // handId -> 0..1
};

export function newBeliefState(): BeliefState {
  return {
    perTeammate: new Map(),
    handStrength: new Map(),
    handConfidence: new Map(),
  };
}

function getOrInitTeammate(b: BeliefState, pid: string, skillPrior = 0.5): TeammateBelief {
  let t = b.perTeammate.get(pid);
  if (!t) {
    t = { hands: new Map(), churnRate: 0, skillPrior };
    b.perTeammate.set(pid, t);
  }
  return t;
}

// How much we trust slot-implied strength as a postflop signal at each phase.
// Hole-card-only "rankings" (preflop) correlate weakly with final hand
// strength, so preflop placements should barely move the posterior. By the
// river the teammate has full board information; that placement is gospel.
export function phaseTrust(phase: string): number {
  switch (phase) {
    case "preflop": return 0.25;
    case "flop":    return 0.6;
    case "turn":    return 0.85;
    case "river":
    case "reveal":  return 1.0;
    default:        return 0.5;
  }
}

// Likelihood-weighted update: a teammate placing hand H at slot K/N is evidence
// that (in their estimation) H is the K-th strongest. We fold that into a
// posterior mean, weighted by teammate skill, slot stability, and the
// reliability of slot-as-strength-signal at this phase.
export function updateFromPlacement(
  b: BeliefState,
  teammateId: string,
  handId: string,
  slot: number,
  totalHands: number,
  skillPrior = 0.5,
  phaseTrustWeight = 1.0
): void {
  const t = getOrInitTeammate(b, teammateId, skillPrior);
  const impliedStrength = totalHands <= 1 ? 0.5 : 1 - slot / (totalHands - 1);
  let hb = t.hands.get(handId);
  if (!hb) {
    hb = { mean: 0.5, concentration: 1, lastSlot: null, slotStableFor: 0 };
    t.hands.set(handId, hb);
  }

  if (hb.lastSlot === slot) {
    hb.slotStableFor += 1;
  } else {
    hb.slotStableFor = 0;
    hb.lastSlot = slot;
  }

  // Update weight grows with teammate skill and with slot stability, scaled
  // by how informative this phase's placement is.
  const w = (0.4 + 0.5 * skillPrior + 0.2 * Math.min(3, hb.slotStableFor)) * phaseTrustWeight;
  const total = hb.concentration + w;
  hb.mean = (hb.mean * hb.concentration + impliedStrength * w) / total;
  hb.concentration = Math.min(20, total);

  b.handStrength.set(handId, hb.mean);
  b.handConfidence.set(handId, Math.min(1, hb.concentration / 10));
}

// When two bots agree on a swap (proposer + accepter), or a recipient rejects
// (affirming the current placement), we have stronger evidence than a single
// player's slot choice. Bump the concentration of the involved hand.
function bumpConsensus(b: BeliefState, handId: string, amount: number): void {
  const hb = findHandBelief(b, handId);
  if (!hb) return;
  hb.concentration = Math.min(20, hb.concentration + amount);
  b.handConfidence.set(handId, Math.min(1, hb.concentration / 10));
}

// Search across all teammate buckets for a hand's belief record. Two hands
// involved in a single swap belong to DIFFERENT teammate buckets, so we
// can't iterate per-teammate looking for both at once.
function findHandBelief(b: BeliefState, handId: string): HandBelief | null {
  for (const t of b.perTeammate.values()) {
    const hb = t.hands.get(handId);
    if (hb) return hb;
  }
  return null;
}

// Decay confidence when a teammate churns (moves a hand they had previously
// placed). Called once per observed relocation.
export function decayOnChurn(b: BeliefState, teammateId: string, handId: string): void {
  const t = b.perTeammate.get(teammateId);
  if (!t) return;
  const hb = t.hands.get(handId);
  if (!hb) return;
  hb.concentration = Math.max(1, hb.concentration * 0.6);
  hb.slotStableFor = 0;
  t.churnRate = Math.min(1, t.churnRate * 0.9 + 0.15);
  b.handConfidence.set(handId, Math.min(1, hb.concentration / 10));
}

// Called once per round when phase transitions to "reveal" — by then we know
// the true ranking. Score each teammate's placement accuracy and update their
// skillPrior with EMA. A teammate who consistently places hands at their
// truth-implied slots earns higher trust; one who's off gets less weight on
// their placements next round.
export function updateSkillFromReveal(
  b: BeliefState,
  state: GameState,
  myPlayerId: string
): void {
  if (!state.trueRanking) return;
  const truePos = new Map<string, number>();
  state.trueRanking.forEach((id, i) => truePos.set(id, i));
  const N = Math.max(1, state.ranking.length - 1);

  for (const [pid, t] of b.perTeammate) {
    if (pid === myPlayerId) continue;
    let totalErr = 0;
    let count = 0;
    for (const h of state.hands) {
      if (h.playerId !== pid) continue;
      const placed = state.ranking.indexOf(h.id);
      const truth = truePos.get(h.id);
      if (placed === -1 || truth === undefined) continue;
      totalErr += Math.abs(placed - truth) / N;
      count++;
    }
    if (count === 0) continue;
    const accuracy = Math.max(0, Math.min(1, 1 - totalErr / count));
    t.skillPrior = 0.7 * t.skillPrior + 0.3 * accuracy;
  }
}

export function onPhaseBoundary(b: BeliefState): void {
  // Phase change = new community cards = previous slot-implied strengths are
  // stale signal. Decay both confidence in past observations and the per-hand
  // posterior weight so fresh placements at the new phase dominate.
  for (const t of b.perTeammate.values()) {
    t.churnRate *= 0.7;
    for (const hb of t.hands.values()) {
      hb.concentration = Math.max(1, hb.concentration * 0.4);
      hb.slotStableFor = 0;
      hb.lastSlot = null;
    }
  }
  for (const hid of Array.from(b.handConfidence.keys())) {
    const c = b.handConfidence.get(hid) ?? 0;
    b.handConfidence.set(hid, Math.min(c, 0.4));
  }
}

// Walk the current ranking and fold all placements from teammates into belief.
// Cheap and idempotent — safe to call on every tick.
//
// Detects "churn": a teammate hand whose slot has changed since we last saw
// it placed. We decay confidence in that hand before re-folding the new
// placement, so flaky teammates lose authority instead of accumulating it.
export function perceiveState(
  b: BeliefState,
  state: GameState,
  myPlayerId: string
): void {
  const totalHands = state.hands.length;
  // Build a map of where each placed teammate hand is right now.
  const currentSlot = new Map<string, number>();
  for (let slot = 0; slot < state.ranking.length; slot++) {
    const hid = state.ranking[slot];
    if (!hid) continue;
    const h = state.hands.find((x) => x.id === hid);
    if (!h || h.playerId === myPlayerId) continue;
    currentSlot.set(hid, slot);
  }

  // Detect churn: any teammate hand we previously believed was at slot X is
  // now at slot Y (or unranked). Decay confidence before re-perceiving.
  for (const [pid, t] of b.perTeammate) {
    if (pid === myPlayerId) continue;
    for (const [hid, hb] of t.hands) {
      const cur = currentSlot.has(hid) ? currentSlot.get(hid)! : null;
      if (hb.lastSlot !== null && cur !== hb.lastSlot) {
        decayOnChurn(b, pid, hid);
      }
    }
  }

  // Fold current placements into belief, weighted by how much slot-as-signal
  // means at this phase.
  const trust = phaseTrust(state.phase);
  for (const [hid, slot] of currentSlot) {
    const h = state.hands.find((x) => x.id === hid);
    if (!h) continue;
    const t = getOrInitTeammate(b, h.playerId);
    updateFromPlacement(b, h.playerId, hid, slot, totalHands, t.skillPrior, trust);
  }
}

// Reconcile pending trades against last tick's snapshot. A request that has
// vanished was either accepted (the ranking now reflects the swap) or
// rejected/cancelled. Each gives us a different signal:
//
//   accepted: TWO bots agree on the relative strength of these hands. Boost
//             concentration on both at their post-swap slots — we have
//             multi-observer evidence.
//
//   rejected: the recipient affirmed their hand belongs where it sits. Boost
//             concentration on the recipient's hand at its current slot.
//             (Don't update our self-estimate of own hands — those come from
//             Monte Carlo math, not social signal.)
export function reconcileTrades(
  b: BeliefState,
  state: GameState,
  prev: AcquireRequest[],
  myPlayerId: string
): void {
  if (prev.length === 0) return;
  const stillPending = (r: AcquireRequest): boolean =>
    state.acquireRequests.some(
      (x) => x.initiatorHandId === r.initiatorHandId && x.recipientHandId === r.recipientHandId
    );
  const rankingPos = new Map<string, number>();
  state.ranking.forEach((id, i) => { if (id) rankingPos.set(id, i); });

  for (const r of prev) {
    if (stillPending(r)) continue;
    const initSlot = rankingPos.get(r.initiatorHandId);
    const recSlot = rankingPos.get(r.recipientHandId);

    let accepted = false;
    if (r.kind === "swap") {
      // Both should still be placed; a swap produces inverted slot ownership.
      // Compare against per-hand lastSlot from before this tick's perceiveState.
      if (initSlot !== undefined && recSlot !== undefined) {
        const hbI = findHandBelief(b, r.initiatorHandId);
        const hbR = findHandBelief(b, r.recipientHandId);
        if (hbI && hbR && hbI.lastSlot === recSlot && hbR.lastSlot === initSlot) {
          accepted = true;
        }
      }
    } else if (r.kind === "acquire") {
      // Initiator's unranked hand takes recipient's slot. Recipient's hand
      // becomes unranked. Accepted iff initiator is now placed.
      accepted = initSlot !== undefined && recSlot === undefined;
    } else if (r.kind === "offer") {
      // Initiator's placed hand becomes unranked, recipient takes its slot.
      accepted = initSlot === undefined && recSlot !== undefined;
    }

    if (accepted) {
      // Double-evidence boost on both hands at their new slots.
      bumpConsensus(b, r.initiatorHandId, 2);
      bumpConsensus(b, r.recipientHandId, 2);
      // The slot change was intentional, not churn — sync lastSlot so the
      // subsequent perceiveState pass doesn't decay our just-affirmed belief.
      const hbI = findHandBelief(b, r.initiatorHandId);
      const hbR = findHandBelief(b, r.recipientHandId);
      if (hbI && initSlot !== undefined) hbI.lastSlot = initSlot;
      if (hbR && recSlot !== undefined) hbR.lastSlot = recSlot;
    } else {
      // Vanished without acceptance = rejected/cancelled.
      // If I am the initiator, the recipient affirmed their placement.
      // If I am the recipient, I was the one affirming — already updated by
      // perceiveState. Either way, give a small concentration boost on the
      // recipient hand at its current slot.
      if (recSlot !== undefined) bumpConsensus(b, r.recipientHandId, 1);
      void myPlayerId;
    }
  }
}
