import type { AcquireRequest, Card, GameState } from "../types";
import {
  newRangeBelief,
  applyPlacement,
  rangeMeanStrength,
  rangeConfidence,
  decayRange,
  pruneByExclusions,
  buildPercentileMap,
  buildAbsoluteStrengthMap,
  type RangeBelief,
  type PercentileMap,
} from "./range";
import { createDeck } from "../deckUtils";

/**
 * Belief system: probabilistic inference over teammate hand strengths.
 *
 * For each teammate hand we can't see, we maintain:
 * 1. A scalar belief (mean + concentration) updated from observed slot placements.
 * 2. A range belief (weighted distribution over plausible 2-card combos).
 *
 * Both are updated every tick via `perceiveState()`, which detects churn,
 * folds new placements, and blends range-derived strength with scalar belief.
 */

/**
 * Scalar belief for a single teammate hand.
 * Modeled as (mean, concentration) — a lightweight Beta proxy.
 */
export type HandBelief = {
  /** Posterior mean strength in [0, 1]. */
  mean: number;
  /** Pseudo-observations; higher = tighter distribution. */
  concentration: number;
  /** Last observed slot index, or null if never placed. */
  lastSlot: number | null;
  /** Consecutive ticks this hand has sat at the same slot (within a phase). */
  slotStableFor: number;
  /**
   * Closing slot at each prior phase boundary, most recent last.
   * Used to reward cross-phase consistency as stronger evidence.
   */
  phaseSlots: number[];
};

/** Belief state for a single teammate player. */
export type TeammateBelief = {
  /** Per-hand scalar beliefs for this teammate. */
  hands: Map<string, HandBelief>;
  /** 0..1 — how often this teammate reorders hands recently. */
  churnRate: number;
  /** 0..1 — estimated skill of this teammate (updated at reveal from placement accuracy). */
  skillPrior: number;
  /** Behavioral patterns learned across rounds. */
  habits: TeammateHabits;
};

/** Learned behavioral patterns for a teammate, updated at each reveal. */
export type TeammateHabits = {
  /** EMA of (impliedSlot - trueSlot); positive means they systematically overvalue hands. */
  overvaluationBias: number;
  /** Number of phases observed (denominator for EMAs). */
  phasesObserved: number;
};

/** Full belief state for a bot — per-teammate data plus cached lookups. */
export type BeliefState = {
  /** playerId → per-teammate belief bucket. */
  perTeammate: Map<string, TeammateBelief>;
  /** Cached flattened view: handId → posterior mean strength. */
  handStrength: Map<string, number>;
  /** Cached flattened view: handId → confidence in [0, 1]. */
  handConfidence: Map<string, number>;
  /** handId → weighted distribution over plausible 2-card combos. */
  ranges: Map<string, RangeBelief>;
  /** Cached percentile map for the current board; rebuilt when board changes. */
  percentiles: PercentileMap | null;
  /** Phase + board signature used to invalidate stale percentile caches. */
  percentilesPhaseSig: string;
  /** Average absolute strength of all possible 2-card combos on current board. */
  boardPrior: number;
};

/** Create a fresh empty belief state. */
export function newBeliefState(): BeliefState {
  return {
    perTeammate: new Map(),
    handStrength: new Map(),
    handConfidence: new Map(),
    ranges: new Map(),
    percentiles: null,
    percentilesPhaseSig: "",
    boardPrior: 0.5,
  };
}

function freshHabits(): TeammateHabits {
  return {
    overvaluationBias: 0,
    phasesObserved: 0,
  };
}

function getOrInitTeammate(b: BeliefState, pid: string, skillPrior = 0.7): TeammateBelief {
  let t = b.perTeammate.get(pid);
  if (!t) {
    t = { hands: new Map(), churnRate: 0, skillPrior, habits: freshHabits() };
    b.perTeammate.set(pid, t);
  }
  return t;
}

/**
 * How much we trust a slot placement as evidence of true hand strength.
 *
 * Preflop placements are noisy (players only see their own 2 cards), so they
 * get low weight. By the river, teammates have full board info — their
 * placement is high-signal evidence.
 */
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

/**
 * Fold a single observed slot placement into the scalar belief for a hand.
 *
 * A teammate placing hand H at slot K of N total implies they believe H has
 * strength ≈ 1 - K/(N-1). This observation is weighted by:
 * - Teammate skillPrior (high-skill teammates are more credible)
 * - Slot stability (hands that sit still are stronger signal)
 * - Cross-phase consistency (same slot in prior phases = stronger evidence)
 * - phaseTrustWeight (how informative this phase's placements are)
 */
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
    // Use board-aware prior instead of flat 0.5. On wet boards the average
    // strength is higher; on dry boards it's lower. This gives bots a much
    // better starting point for unknown hands.
    const prior = b.boardPrior;
    hb = { mean: prior, concentration: 1, lastSlot: null, slotStableFor: 0, phaseSlots: [] as number[] };
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
  //
  // Scaled by skillPrior and capped: a low-skill teammate consistently
  // misplacing a hand should not stack into a confident wrong belief.
  let crossPhaseBonus = 0;
  for (const ps of hb.phaseSlots) {
    if (ps === slot) {
      crossPhaseBonus += 0.5;
    } else if (Math.abs(ps - slot) <= 1 && totalHands <= 4) {
      crossPhaseBonus += 0.15;
    }
  }
  crossPhaseBonus = Math.min(0.8, crossPhaseBonus * skillPrior);

  // Update weight grows with teammate skill, slot stability, and cross-phase
  // consistency, scaled by how informative this phase's placement is.
  // Higher base weights so beliefs converge faster within 4 phases.
  // Skill-weighted update — low-skill teammates' placements are weaker evidence.
  // Keep a tiny floor so the update doesn't go to zero for skill ~ 0.
  const skillWeight = Math.max(0.1, skillPrior);
  const w = (1.0 + 1.0 * skillWeight + 0.5 * Math.min(5, hb.slotStableFor) + crossPhaseBonus) * phaseTrustWeight;
  const total = hb.concentration + w;
  hb.mean = (hb.mean * hb.concentration + impliedStrength * w) / total;
  hb.concentration = Math.min(25, total);

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

/**
 * Decay confidence in a hand when its owner moves it to a different slot.
 * Called once per observed relocation during `perceiveState()`.
 */
export function decayOnChurn(b: BeliefState, teammateId: string, handId: string, slotDelta?: number, totalHands?: number): void {
  const t = b.perTeammate.get(teammateId);
  if (!t) return;
  const hb = t.hands.get(handId);
  if (!hb) return;
  // Larger slot jumps → more decay (old belief is less relevant).
  let decay = 0.6;
  if (slotDelta !== undefined && totalHands !== undefined && totalHands > 1) {
    const propChange = slotDelta / (totalHands - 1);
    decay = Math.max(0.15, 1.0 - propChange * 0.9);
  }
  hb.concentration = Math.max(1, hb.concentration * decay);
  hb.slotStableFor = 0;
  t.churnRate = Math.min(1, t.churnRate * 0.9 + 0.15);
  b.handConfidence.set(handId, Math.min(1, hb.concentration / 10));
}

/**
 * Calibrate teammate skill estimates at reveal using ground truth.
 *
 * Compares each teammate's final placements to the true ranking and updates
 * their `skillPrior` via EMA. Accurate teammates earn higher trust (their
 * future placements get more weight); inaccurate ones lose trust.
 *
 * Also updates `overvaluationBias` habit tracking from signed placement errors.
 */
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

/**
 * Reset transient per-phase belief state at phase boundaries.
 *
 * New community cards make previous slot-implied strengths stale, so we
 * decay concentrations and reset slot trackers. Before resetting, we snapshot
 * the closing slot into `phaseSlots` so cross-phase consistency bonuses work.
 */
export function onPhaseBoundary(b: BeliefState): void {
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
  b.boardPrior = 0.5;
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


/**
 * Main perception loop — call once per bot tick.
 *
 * 1. Build a map of current slot placements for all teammate hands.
 * 2. Detect churn (slot changes since last tick) and decay confidence.
 * 3. Fold current placements into scalar beliefs via `updateFromPlacement()`.
 * 4. Refresh range percentiles for the current board.
 * 5. Update range beliefs with new observations and blend with scalar beliefs.
 *
 * Safe to call repeatedly — it is idempotent for unchanged state.
 */
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
        const slotDelta = cur !== null ? Math.abs(cur - hb.lastSlot) : totalHands - 1;
        decayOnChurn(b, pid, hid, slotDelta, totalHands);
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
    const existing = t.hands.get(hid);
    if (existing && existing.lastSlot === slot) {
      existing.slotStableFor += 1;
      continue;
    }
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
    let rangeChanged = false;
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
        rangeChanged = true;
      }
    }
    // Blend range-derived strength with scalar belief. Range is sharper
    // postflop where the percentile lookup carries real card-strength info;
    // preflop placements aren't folded into the range (too noisy), so the
    // range posterior stays uniform and any preflop blend would just pull
    // every teammate belief toward 0.5 with no signal. Skip the blend entirely
    // preflop and let scalar belief from observed placements dominate.
    if (rangeChanged) {
      const phaseRangeWeight =
        state.phase === "river" ? 0.65 :
        state.phase === "turn" ? 0.55 :
        state.phase === "flop" ? 0.40 :
        0;
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
  // Compute board-aware prior: average absolute strength of all possible hands.
  const absMap = buildAbsoluteStrengthMap(excl, state.communityCards);
  let total = 0, count = 0;
  for (const s of absMap.values()) {
    total += s;
    count++;
  }
  b.boardPrior = count > 0 ? total / count : 0.5;
  b.percentilesPhaseSig = sig;
}

/**
 * Reconcile pending trades from the previous tick against current state.
 *
 * A request that disappeared was either:
 * - **Accepted**: the ranking now reflects the move. We boost concentration on
 *   both hands (multi-observer evidence is stronger than single placement).
 * - **Rejected/Cancelled**: the recipient affirmed their current placement.
 *   We boost concentration on the recipient hand at its current slot.
 *
 */
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
