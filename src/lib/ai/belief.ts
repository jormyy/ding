import type { AcquireRequest, Card, GameState } from "../types";
import {
  newRangeBelief,
  applyPlacement,
  rangeMeanStrength,
  rangeConfidence,
  decayRange,
  pruneByExclusions,
  buildPercentileMap,
  type RangeBelief,
  type PercentileMap,
} from "./range";
import { createDeck } from "../deckUtils";

// Belief: for each teammate hand we don't own, a posterior over its strength
// in [0,1]. Stored as (mean, concentration) — a lightweight Beta proxy.
export type HandBelief = {
  mean: number;          // posterior mean strength
  concentration: number; // pseudo-observations; higher = tighter
  lastSlot: number | null;
  slotStableFor: number; // ticks the hand has sat at the same slot (within a phase)
  // Closing slot at each prior phase boundary, in order — used to recognize
  // stable cross-phase placements as stronger evidence than any single read.
  phaseSlots: number[];
};

export type TeammateBelief = {
  hands: Map<string, HandBelief>; // handId -> belief
  churnRate: number;              // 0..1 — recent reorder frequency
  skillPrior: number;             // 0..1 — how "good" we think they are (updated at reveal)
  // Opponent habit tracking — behavioral patterns learned across rounds.
  habits: TeammateHabits;
};

export type TeammateHabits = {
  proposalsInitiated: number;   // total proposals they've started
  proposalsAccepted: number;    // total they've accepted
  proposalsRejected: number;    // total they've rejected
  placementLatency: number;     // EMA of ticks before first placement per phase (0 = fast)
  slotAdjustments: number;      // how often they reposition within a phase
  overvaluationBias: number;    // EMA of (impliedSlot - trueSlot) — positive = overvalues
  phasesObserved: number;       // denominator for EMA updates
};

export type BeliefState = {
  perTeammate: Map<string, TeammateBelief>; // playerId -> belief
  // Cached per-hand posterior strength (handId -> mean). Flattened view.
  handStrength: Map<string, number>;
  handConfidence: Map<string, number>; // handId -> 0..1
  // Per-teammate-hand range over plausible hole-card combos.
  ranges: Map<string, RangeBelief>; // handId -> RangeBelief
  // Cached per-board percentile lookup; rebuilt at phase boundary.
  percentiles: PercentileMap | null;
  percentilesPhaseSig: string;
};

export function newBeliefState(): BeliefState {
  return {
    perTeammate: new Map(),
    handStrength: new Map(),
    handConfidence: new Map(),
    ranges: new Map(),
    percentiles: null,
    percentilesPhaseSig: "",
  };
}

function freshHabits(): TeammateHabits {
  return {
    proposalsInitiated: 0,
    proposalsAccepted: 0,
    proposalsRejected: 0,
    placementLatency: 0.5,
    slotAdjustments: 0,
    overvaluationBias: 0,
    phasesObserved: 0,
  };
}

function getOrInitTeammate(b: BeliefState, pid: string, skillPrior = 0.5): TeammateBelief {
  let t = b.perTeammate.get(pid);
  if (!t) {
    t = { hands: new Map(), churnRate: 0, skillPrior, habits: freshHabits() };
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
    hb = { mean: 0.5, concentration: 1, lastSlot: null, slotStableFor: 0, phaseSlots: [] as number[] };
    t.hands.set(handId, hb);
  }

  if (hb.lastSlot === slot) {
    hb.slotStableFor += 1;
  } else {
    hb.slotStableFor = 0;
    hb.lastSlot = slot;
  }

  // Cross-phase stability: if the hand sat at (or near) this slot in previous
  // phases, the teammate has been consistently placing it the same way — that's
  // stronger evidence than a single-phase read. phaseSlots tracks closing slots
  // from prior phases (most recent last). Reward matches; penalize jumps.
  let crossPhaseBonus = 0;
  for (const ps of hb.phaseSlots) {
    if (ps === slot) {
      crossPhaseBonus += 0.15; // same slot across phases → stronger belief
    } else if (Math.abs(ps - slot) <= 1 && totalHands <= 4) {
      crossPhaseBonus += 0.05; // near-neighbor on small tables
    }
  }
  crossPhaseBonus = Math.min(0.3, crossPhaseBonus);

  // Update weight grows with teammate skill, slot stability, and cross-phase
  // consistency, scaled by how informative this phase's placement is.
  // Base weight: 0.2–0.5 depending on skill; doubled for very high-skill
  // teammates so the professor/anchors lead the table effectively.
  const skillWeight = skillPrior < 0.65 ? 0.2 : skillPrior;
  const w = (0.3 + 0.5 * skillWeight + 0.2 * Math.min(3, hb.slotStableFor) + crossPhaseBonus) * phaseTrustWeight;
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
//
// We use a faster EMA (0.6/0.4) than the original 0.7/0.3 so a single
// disastrous round actually shifts trust — the old setting was too sticky.
// We also weight by how many hands the teammate had: 4 placed hands is
// stronger evidence than 1.
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
    // EMA weight scales with sample size; cap at 0.5 so a single round can't
    // entirely overwrite years of reputation but a clearly-bad run moves it.
    const w = Math.min(0.5, 0.2 + 0.1 * count);
    t.skillPrior = (1 - w) * t.skillPrior + w * accuracy;

    // Track overvaluation bias: average signed error (positive = overvalues).
    const h = t.habits;
    let signedErr: number[] = [];
    for (const hand of state.hands) {
      if (hand.playerId !== pid) continue;
      const placed = state.ranking.indexOf(hand.id);
      const truth = truePos.get(hand.id);
      if (placed === -1 || truth === undefined) continue;
      const implied = N <= 0 ? 0 : placed / N;
      const trueNorm = N <= 0 ? 0 : truth / N;
      signedErr.push(trueNorm - implied);
    }
    if (signedErr.length > 0) {
      const avg = signedErr.reduce((a, b) => a + b, 0) / signedErr.length;
      const habW = Math.min(0.5, 0.15 + 0.05 * signedErr.length);
      h.overvaluationBias = (1 - habW) * h.overvaluationBias + habW * avg;
      h.phasesObserved++;
    }
  }
}

export function onPhaseBoundary(b: BeliefState): void {
  // Phase change = new community cards = previous slot-implied strengths are
  // stale signal. Decay both confidence in past observations and the per-hand
  // posterior weight so fresh placements at the new phase dominate.
  //
  // Before resetting lastSlot, snapshot the closing slot into phaseSlots so
  // future improvements can read trajectory; today the field is observed
  // but not yet consumed by the posterior update.
  for (const t of b.perTeammate.values()) {
    t.churnRate *= 0.7;
    for (const hb of t.hands.values()) {
      if (hb.lastSlot !== null) {
        hb.phaseSlots.push(hb.lastSlot);
        if (hb.phaseSlots.length > 4) hb.phaseSlots.shift();
      }
      hb.concentration = Math.max(1, hb.concentration * 0.4);
      hb.slotStableFor = 0;
      hb.lastSlot = null;
    }
  }
  for (const hid of Array.from(b.handConfidence.keys())) {
    const c = b.handConfidence.get(hid) ?? 0;
    b.handConfidence.set(hid, Math.min(c, 0.4));
  }
  // Range belief: previous-phase observations were against an older board.
  // Decay weights toward uniform so the new phase's percentile lookup
  // dominates. Force percentile rebuild on next perceiveState.
  for (const r of b.ranges.values()) {
    decayRange(r, 0.5);
  }
  b.percentiles = null;
  b.percentilesPhaseSig = "";
}

// Build the set of cards that are NOT available to be in a teammate's hand:
// my own hole cards, visible community cards, and any revealed teammate
// hands. The cards excluded define the universe of plausible combos.
function buildExclusions(state: GameState, myPlayerId: string): Set<string> {
  const out = new Set<string>();
  for (const h of state.hands) {
    if (h.playerId === myPlayerId || h.flipped) {
      for (const c of h.cards) out.add(c.rank + c.suit);
    }
  }
  for (const c of state.communityCards) out.add(c.rank + c.suit);
  return out;
}

// Sigma per phase — preflop placements are noisy, river placements sharp.
function rangeSigmaForPhase(phase: string): number {
  switch (phase) {
    case "preflop": return 0.35;
    case "flop":    return 0.22;
    case "turn":    return 0.16;
    case "river":
    case "reveal":  return 0.12;
    default:        return 0.25;
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
    let movedThisTick = false;
    for (const [hid, hb] of t.hands) {
      const cur = currentSlot.has(hid) ? currentSlot.get(hid)! : null;
      if (hb.lastSlot !== null && cur !== hb.lastSlot) {
        decayOnChurn(b, pid, hid);
        movedThisTick = true;
      }
    }
    // Track repositioning frequency as a behavioral signal.
    if (movedThisTick) {
      const h = t.habits;
      h.slotAdjustments++;
      // EMA normalize: if they adjust every 3 phases, that's a pattern.
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

  // Range belief: incremental update across phases. The percentile map is
  // rebuilt when the board changes; range WEIGHTS persist (they're a posterior
  // over the SAME card combos). Each placement observation is folded once
  // per slot change, so re-observing the same slot doesn't double-count.
  // Across a phase boundary, weights are decayed toward uniform but not
  // reset — this is the value-add over scalar belief: cross-phase
  // accumulation of evidence that's interpreted against fresh percentiles.
  refreshRangePercentiles(b, state, myPlayerId);
  if (b.percentiles && b.percentiles.size > 0) {
    const sigma = rangeSigmaForPhase(state.phase);
    const exclusions = buildExclusions(state, myPlayerId);
    for (const [hid, slot] of currentSlot) {
      const h = state.hands.find((x) => x.id === hid);
      if (!h || h.flipped) continue;
      let r = b.ranges.get(hid);
      if (!r) {
        r = newRangeBelief();
        for (const k of b.percentiles.keys()) r.weights.set(k, 1);
        b.ranges.set(hid, r);
      }
      pruneByExclusions(r, exclusions);
      // Add new combos that appeared in the percentile map (board change
      // exposed combos that were previously excluded as community cards).
      for (const k of b.percentiles.keys()) {
        if (!r.weights.has(k)) r.weights.set(k, 1);
      }
      // Fold the placement only when it's a fresh observation (slot just
      // changed OR first time we see this hand) AND we're past preflop —
      // preflop placements are too noisy to constrain a range, and folding
      // them poisons the posterior the bots carry into later phases.
      const tb = b.perTeammate.get(h.playerId);
      const hb = tb?.hands.get(hid);
      if (hb && hb.slotStableFor === 0 && state.phase !== "preflop") {
        applyPlacement(r, b.percentiles, slot, totalHands, sigma);
      }
    }
    // Blend range-derived strength with scalar belief. Range is sharper
    // postflop where the percentile lookup carries real card-strength info;
    // preflop both are noisy so weight scalar more.
    const phaseRangeWeight =
      state.phase === "river" ? 0.65 :
      state.phase === "turn" ? 0.55 :
      state.phase === "flop" ? 0.40 :
      0.18; // preflop: Chen heuristic nudge
    for (const [hid, r] of b.ranges) {
      const m = rangeMeanStrength(r, b.percentiles);
      const scalar = b.handStrength.get(hid) ?? 0.5;
      const blended = (1 - phaseRangeWeight) * scalar + phaseRangeWeight * m;
      b.handStrength.set(hid, blended);
      // Confidence stays scalar-derived. The range posterior can look "tight"
      // after a single Gaussian update without actually being decisive
      // evidence — overriding scalar confidence with range confidence makes
      // bots too sure of borderline placements and they stop trading.
    }
    void rangeConfidence; // available for future, not used here
  }
}

function refreshRangePercentiles(
  b: BeliefState,
  state: GameState,
  myPlayerId: string
): void {
  const sig = state.phase + "|" + state.communityCards.map((c) => c.rank + c.suit).join("");
  if (b.percentiles && b.percentilesPhaseSig === sig) return;
  const excl = buildExclusions(state, myPlayerId);
  // Skip rebuild on lobby / phases without cards visible — leaves percentiles null.
  const phases = ["preflop", "flop", "turn", "river", "reveal"];
  if (!phases.includes(state.phase)) return;
  void (createDeck as (...args: unknown[]) => Card[]); // keep import alive
  b.percentiles = buildPercentileMap(excl, state.communityCards);
  b.percentilesPhaseSig = sig;
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

    // Habit tracking: record this proposal's outcome on the initiator.
    const initHand = state.hands.find((x) => x.id === r.initiatorHandId);
    const initPlayer = initHand ? state.players.find((p) => p.id === initHand.playerId) : null;
    const initHabits = initPlayer ? b.perTeammate.get(initPlayer.id)?.habits : null;

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
      if (initHabits) initHabits.proposalsAccepted++;
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
      if (initHabits) initHabits.proposalsRejected++;
      void myPlayerId;
    }
  }
}
