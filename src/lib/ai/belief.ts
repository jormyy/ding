import type { GameState } from "../types";

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
  overallConfidence: number;     // 0..1 — how much we trust this teammate's signals
  churnRate: number;             // 0..1 — recent reorder frequency
  skillPrior: number;            // 0..1 — how "good" we think they are (from cross-round memory)
  lastPhase: string;
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
    t = {
      hands: new Map(),
      overallConfidence: 0.4,
      churnRate: 0,
      skillPrior,
      lastPhase: "",
    };
    b.perTeammate.set(pid, t);
  }
  return t;
}

// Likelihood-weighted update: a teammate placing hand H at slot K/N is evidence
// that (in their estimation) H is the K-th strongest. We fold that into a
// posterior mean, weighted by the teammate's skillPrior.
export function updateFromPlacement(
  b: BeliefState,
  teammateId: string,
  handId: string,
  slot: number,
  totalHands: number,
  skillPrior = 0.5
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

  // Update weight grows with teammate skill and with slot stability.
  const w = 0.4 + 0.5 * skillPrior + 0.2 * Math.min(3, hb.slotStableFor);
  const total = hb.concentration + w;
  hb.mean = (hb.mean * hb.concentration + impliedStrength * w) / total;
  hb.concentration = Math.min(20, total);

  b.handStrength.set(handId, hb.mean);
  b.handConfidence.set(handId, Math.min(1, hb.concentration / 10));
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

export function onPhaseBoundary(b: BeliefState, newPhase: string): void {
  for (const t of b.perTeammate.values()) {
    t.churnRate *= 0.7;
    t.lastPhase = newPhase;
  }
}

// Walk the current ranking and fold all placements from teammates into belief.
// Cheap and idempotent — safe to call on every tick.
export function perceiveState(
  b: BeliefState,
  state: GameState,
  myPlayerId: string
): void {
  const totalHands = state.hands.length;
  for (let slot = 0; slot < state.ranking.length; slot++) {
    const hid = state.ranking[slot];
    if (!hid) continue;
    const h = state.hands.find((x) => x.id === hid);
    if (!h || h.playerId === myPlayerId) continue;
    const t = getOrInitTeammate(b, h.playerId);
    updateFromPlacement(b, h.playerId, hid, slot, totalHands, t.skillPrior);
  }
}
