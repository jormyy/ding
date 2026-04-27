// Cooperative-bot pipeline.
//
//   1. Perception → update BeliefState from public placements.
//   2. Evaluation → score candidate actions by team-EV (inversion reduction).
//   3. Selection  → softmax over top actions, modulated by Traits + Mood.

import type { AcquireRequest, ClientMessage, GameState, Hand } from "../types";
import { estimateStrength } from "./handStrength";
import type { Traits } from "./personality";
import {
  newBeliefState,
  perceiveState,
  reconcileTrades,
  updateSkillFromReveal,
  onPhaseBoundary as beliefOnPhaseBoundary,
  type BeliefState,
} from "./belief";
import {
  scoreAction,
  rankingAfterMove,
  rankingAfterSwap,
  rankingAfterChipMove,
  type ActionScore,
} from "./ev";
import { extractSignals, deferralWeight } from "./signals";
import {
  newMood,
  moodAdjustedTraits,
  onTeammateChurn,
  onTeamConverged,
  onPhaseBoundary as moodOnPhaseBoundary,
  type Mood,
} from "./mood";

export type BotMemo = {
  estimates: Map<string, number>;
  estimatesPhase: string;
  idleTicks: number;
  decisionCount: number;
  recentlyRejected: Set<string>;
  belief: BeliefState;
  mood: Mood;
  lastRankingSig: string;
  // Expressive-behavior tracking
  prevMyProposals: Set<string>;    // reqKeys present last tick for proposals I initiated
  myRejectedKeys: Set<string>;     // my own proposals that were rejected — don't re-propose this phase
  prevHandSlots: Map<string, number>; // handId -> slot from previous tick
  stallTicks: number;              // consecutive ticks where everyone ranked but not all ready
  ticksSinceProgress: number;      // ticks since last state-changing action (move/swap/accept/propose/ready)
  myProposalsThisPhase: number;    // proposals I've initiated in the current phase
  prevAcquireRequests: AcquireRequest[]; // last tick's pending requests — used to classify accept/reject
  proposalAges: Map<string, number>;     // ticks since each of my proposals was first seen
};

export function newBotMemo(): BotMemo {
  return {
    estimates: new Map(),
    estimatesPhase: "",
    idleTicks: 0,
    decisionCount: 0,
    recentlyRejected: new Set(),
    belief: newBeliefState(),
    mood: newMood(),
    lastRankingSig: "",
    prevMyProposals: new Set(),
    myRejectedKeys: new Set(),
    prevHandSlots: new Map(),
    stallTicks: 0,
    ticksSinceProgress: 0,
    myProposalsThisPhase: 0,
    prevAcquireRequests: [],
    proposalAges: new Map(),
  };
}

function commitAction(memo: BotMemo, msg: ClientMessage): void {
  // Anything that mutates the table or moves negotiation forward counts as
  // progress — including outgoing proposals and rejections, so the stall
  // breaker doesn't fire on a bot that's actively trading.
  if (
    msg.type === "move" ||
    msg.type === "swap" ||
    msg.type === "acceptChipMove" ||
    msg.type === "rejectChipMove" ||
    msg.type === "proposeChipMove" ||
    msg.type === "cancelChipMove" ||
    msg.type === "ready"
  ) {
    memo.ticksSinceProgress = 0;
  }
  if (msg.type === "proposeChipMove") {
    memo.myProposalsThisPhase++;
  }
}

type Candidate = {
  msg: ClientMessage;
  score: ActionScore;
  utility: number;
};

function reqKey(a: string, b: string): string { return a + "|" + b; }
function rankingSig(r: (string | null)[]): string { return r.map((x) => x ?? "_").join(","); }

// Single source of truth for "should I propose this trade?" — used by both
// acquire/swap and offer paths. Resignation raises the bar; the per-phase cap
// stops bot pairs from ping-pong trading; the decision-cap kills voluntary
// churn after we've already deliberated a lot.
function canPropose(
  memo: BotMemo,
  resignation: number,
  overDecisionCap: boolean,
  teamInversionDelta: number,
  tableSize: number
): boolean {
  if (overDecisionCap) return false;
  if (resignation >= 0.7) return false;
  const cap = Math.max(4, Math.ceil(tableSize * 0.8));
  if (memo.myProposalsThisPhase >= cap) return false;
  const proposeBar = 0.2 + resignation * 2.0;
  return teamInversionDelta > proposeBar;
}

function getEstimate(
  memo: BotMemo,
  hand: Hand,
  board: GameState["communityCards"],
  fieldSize: number,
  nSims: number
): number {
  const cached = memo.estimates.get(hand.id);
  if (cached !== undefined) return cached;
  const est = estimateStrength(hand.cards, board, fieldSize, nSims);
  memo.estimates.set(hand.id, est);
  return est;
}

function softmaxPick<T>(items: T[], scores: number[], temperature: number): T {
  const t = Math.max(0.05, temperature);
  const maxS = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - maxS) / t));
  const sum = exps.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < items.length; i++) {
    r -= exps[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function utilityFor(
  score: ActionScore,
  traits: Traits,
  bonuses: { selfBenefit?: number; teamOnlyBenefit?: number } = {}
): number {
  const base = score.teamInversionDelta * (0.4 + 0.6 * score.confidence);
  const helper = (bonuses.teamOnlyBenefit ?? 0) * traits.helpfulness * 0.3;
  const self = (bonuses.selfBenefit ?? 0) * 0.1;
  return base + helper + self;
}

export function decideAction(
  state: GameState,
  myPlayerId: string,
  traits: Traits,
  memo: BotMemo,
  opts?: { nSims?: number }
): ClientMessage | null {
  const nSims = opts?.nSims ?? Math.round(20 + 60 * traits.skill);

  if (memo.estimatesPhase !== state.phase) {
    // When entering reveal we have ground truth — calibrate teammates'
    // skillPrior before resetting per-phase state. This carries trust
    // forward into the next round.
    if (state.phase === "reveal" && state.trueRanking) {
      updateSkillFromReveal(memo.belief, state, myPlayerId);
    }
    memo.estimates.clear();
    memo.estimatesPhase = state.phase;
    memo.idleTicks = 0;
    memo.decisionCount = 0;
    memo.recentlyRejected.clear();
    memo.myRejectedKeys.clear();
    memo.ticksSinceProgress = 0;
    memo.myProposalsThisPhase = 0;
    memo.proposalAges.clear();
    beliefOnPhaseBoundary(memo.belief);
    moodOnPhaseBoundary(memo.mood);
  }

  if (state.phase === "reveal") {
    if (state.score !== null) return null;
    const totalHands = state.hands.length;
    if (state.revealIndex >= totalHands) return null;
    const currentRevealIdx = state.ranking.length - 1 - state.revealIndex;
    const handToFlipId = state.ranking[currentRevealIdx];
    if (!handToFlipId) return null;
    const owner = state.players.find((p) =>
      state.hands.find((h) => h.id === handToFlipId && h.playerId === p.id)
    );
    if (!owner) return null;
    if (owner.id === myPlayerId) return { type: "flip", handId: handToFlipId };
    if (!owner.connected) {
      const connected = state.players.filter((p) => p.connected).map((p) => p.id).sort();
      if (connected[0] === myPlayerId) return { type: "flip", handId: handToFlipId };
    }
    return null;
  }

  if (state.phase === "lobby") return null;
  const gamePhases = ["preflop", "flop", "turn", "river"];
  if (!gamePhases.includes(state.phase)) return null;

  memo.ticksSinceProgress++;

  const unrankedHandsAll = state.hands.filter((h) => state.ranking.indexOf(h.id) === -1);
  const onlyOfflineUnrankedAll = unrankedHandsAll.every((h) => {
    const owner = state.players.find((p) => p.id === h.playerId);
    return owner ? !owner.connected : true;
  });
  const effectiveAllRanked =
    state.ranking.every((s) => s !== null) || onlyOfflineUnrankedAll;

  // Soft cap: once we've spent a lot of decisions in this phase, prefer to
  // settle. We still allow mandatory work (placements, responding to incoming
  // proposals) — just suppress voluntary churn (new proposals/swaps).
  const overDecisionCap = memo.decisionCount > 40;
  if (overDecisionCap) {
    if (effectiveAllRanked) {
      const me = state.players.find((p) => p.id === myPlayerId);
      if (me && !me.ready) {
        memo.ticksSinceProgress = 0;
        return { type: "ready", ready: true };
      }
    }
    // Fall through — we may still need to place a hand or respond to a
    // proposal targeting us. Voluntary candidates are gated below.
  }

  const myHands = state.hands.filter((h) => h.playerId === myPlayerId);
  if (myHands.length === 0) return null;

  const board = state.communityCards;
  const fieldSize = Math.max(1, state.hands.length - myHands.length);

  for (const h of myHands) getEstimate(memo, h, board, fieldSize, nSims);

  // === 1. PERCEPTION ===
  // First: reconcile last tick's pending trades against now. A vanished
  // request was accepted (slot pattern matches) or rejected — both update
  // belief with multi-observer evidence.
  reconcileTrades(memo.belief, state, memo.prevAcquireRequests, myPlayerId);
  // Snapshot now for next tick. Done BEFORE perceiveState mutates lastSlot
  // so reconcileTrades next tick can still see the pre-swap slots it needs.
  memo.prevAcquireRequests = state.acquireRequests.map((r) => ({ ...r }));
  perceiveState(memo.belief, state, myPlayerId);

  const sig = rankingSig(state.ranking);
  if (memo.lastRankingSig && memo.lastRankingSig !== sig) {
    onTeammateChurn(memo.mood, traits);
  } else if (state.ranking.every((s) => s !== null)) {
    onTeamConverged(memo.mood);
  }
  memo.lastRankingSig = sig;

  const signals = extractSignals(state, memo.belief, myPlayerId);
  const traitsM = moodAdjustedTraits(traits, memo.mood);
  const me = state.players.find((p) => p.id === myPlayerId);

  // Resignation: rises with rejected/vanished proposals and idle ticks.
  // Low-conscientiousness / low-neuroticism bots give up faster; Worriers
  // hold out longer. In [0, 1].
  const resignationRaw =
    memo.myRejectedKeys.size * 0.54 +
    Math.min(8, memo.idleTicks) * 0.18 +
    Math.min(10, memo.decisionCount) * 0.075;
  const resignation = Math.max(0, Math.min(1,
    resignationRaw * (1.2 - 0.4 * traitsM.conscientiousness - 0.3 * traitsM.neuroticism)
  ));

  const alreadyReady = !!me?.ready;

  // If a proposal targets ME, do NOT ready — answer first. Otherwise we close
  // the phase and the proposer never gets a response.
  const incomingProposal = state.acquireRequests.some((r) => {
    const rh = state.hands.find((h) => h.id === r.recipientHandId);
    return rh && rh.playerId === myPlayerId;
  });

  // Hard stall breaker — before any expressive returns so ding loops can't block it.
  if (effectiveAllRanked && !alreadyReady && !incomingProposal &&
      (memo.ticksSinceProgress >= 3 || resignation >= 0.85)) {
    memo.ticksSinceProgress = 0;
    return { type: "ready", ready: true };
  }
  const myHandsPlaced = myHands.every((h) => state.ranking.indexOf(h.id) !== -1);
  const othersAllReady = state.players
    .filter((p) => p.id !== myPlayerId && p.connected)
    .every((p) => p.ready);
  if (!alreadyReady && !incomingProposal && myHandsPlaced && othersAllReady && effectiveAllRanked && memo.ticksSinceProgress >= 1) {
    memo.ticksSinceProgress = 0;
    return { type: "ready", ready: true };
  }

  // === 1b. EXPRESSIVE EVENTS — ding / fuckoff before the normal pipeline ===
  // Detect rejected proposals: a key in prevMyProposals that is no longer
  // present in state.acquireRequests AND the ranking didn't change to reflect
  // acceptance. Best-effort — we mark "rejected-ish" and let traits decide.
  const currentMyProposalKeys = new Set<string>();
  for (const r of state.acquireRequests) {
    if (r.initiatorId === myPlayerId) {
      currentMyProposalKeys.add(reqKey(r.initiatorHandId, r.recipientHandId));
    }
  }
  let myProposalVanished = false;
  for (const k of memo.prevMyProposals) {
    if (!currentMyProposalKeys.has(k)) {
      myProposalVanished = true;
      // Treat any vanished own proposal as rejected-or-cancelled; either way
      // don't re-propose the same pairing this phase.
      memo.myRejectedKeys.add(k);
    }
  }
  memo.prevMyProposals = currentMyProposalKeys;

  // Detect teammate churn on a hand I had high belief confidence in.
  let confidentChurn = false;
  for (const h of state.hands) {
    if (h.playerId === myPlayerId) continue;
    const prevSlot = memo.prevHandSlots.get(h.id);
    const curSlot = state.ranking.indexOf(h.id);
    if (prevSlot !== undefined && prevSlot !== -1 && curSlot !== -1 && prevSlot !== curSlot) {
      const conf = memo.belief.handConfidence.get(h.id) ?? 0;
      if (conf > 0.5) confidentChurn = true;
    }
  }
  // Refresh slot snapshot.
  memo.prevHandSlots.clear();
  for (let i = 0; i < state.ranking.length; i++) {
    const hid = state.ranking[i];
    if (hid) memo.prevHandSlots.set(hid, i);
  }

  // Stall tracking: all ranked but someone isn't ready.
  const allRankedNow = state.ranking.every((s) => s !== null);
  const someoneNotReady = state.players.some((p) => p.connected && !p.ready);
  if (allRankedNow && someoneNotReady) memo.stallTicks++;
  else memo.stallTicks = 0;

  // Express freely — no cooldown. Bots spam ding/fuckoff when their
  // personality + mood say so.
  if (myProposalVanished) {
    const frustration = (1 - traitsM.agreeableness) * 0.7
      + traitsM.neuroticism * 0.35
      + memo.mood.concern * 0.35;
    if (Math.random() < frustration) {
      memo.idleTicks = 0;
      return { type: "fuckoff" };
    }
  }
  if (confidentChurn) {
    const complaint = traitsM.extraversion * 0.6 + traitsM.helpfulness * 0.35
      + memo.mood.concern * 0.25;
    if (Math.random() < complaint) {
      memo.idleTicks = 0;
      return { type: "ding" };
    }
  }
  if (memo.stallTicks >= 2) {
    const nudge = traitsM.extraversion * 0.4 + (1 - traitsM.conscientiousness) * 0.2;
    if (Math.random() < nudge) {
      memo.idleTicks = 0;
      return { type: "ding" };
    }
  }
  if (memo.mood.concern > 0.5 && traitsM.agreeableness < 0.45) {
    if (Math.random() < 0.12 * traitsM.extraversion) {
      memo.idleTicks = 0;
      return { type: "fuckoff" };
    }
  }

  // === 2. EVALUATION ===
  const candidates: Candidate[] = [];

  const proposalsToMe = state.acquireRequests.filter((r) => {
    const rh = state.hands.find((h) => h.id === r.recipientHandId);
    return rh && rh.playerId === myPlayerId;
  });

  for (const p of proposalsToMe) {
    const after = rankingAfterChipMove(state.ranking, p.initiatorHandId, p.recipientHandId, p.kind);
    // Score from MY view (raw delta).
    const myScore = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates);
    // Score from a TRUST-BLENDED view: the proposer is asserting their hand
    // belongs at its post-move slot. Treat that as evidence proportional to
    // trustInTeammates. Without this, bots reject objectively-good swaps
    // because the proposer's hand looks weak from the slot history alone.
    const totalHands = state.hands.length;
    const initIdxAfter = after.indexOf(p.initiatorHandId);
    const trust = traitsM.trustInTeammates;
    const overrides = new Map<string, number>();
    if (initIdxAfter !== -1 && totalHands > 1) {
      const proposerImplied = 1 - initIdxAfter / (totalHands - 1);
      const myView = memo.belief.handStrength.get(p.initiatorHandId) ?? 0.5;
      overrides.set(p.initiatorHandId, (1 - trust) * myView + trust * proposerImplied);
    }
    const trustedScore = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates, overrides);
    // Final accept score = blend (with trust as weight) so high-trust bots
    // weight the proposer's claim more heavily, low-trust bots stay skeptical.
    const blendedDelta = (1 - trust) * myScore.teamInversionDelta + trust * trustedScore.teamInversionDelta;
    const acceptScore: typeof myScore = {
      teamInversionDelta: blendedDelta,
      confidence: myScore.confidence,
    };
    const initDefer = deferralWeight(memo.belief, signals, p.initiatorHandId);
    const acceptBoost = traitsM.agreeableness * 0.3
      + initDefer * 0.2 * traitsM.trustInTeammates
      + resignation * 0.4
      + traitsM.trustInTeammates * 0.5; // baseline trust-the-proposer bonus
    candidates.push({
      msg: { type: "acceptChipMove", initiatorHandId: p.initiatorHandId, recipientHandId: p.recipientHandId },
      score: acceptScore,
      utility: utilityFor(acceptScore, traitsM) + acceptBoost,
    });

    const k = reqKey(p.initiatorHandId, p.recipientHandId);
    if (!memo.recentlyRejected.has(k)) {
      // Reject only when the swap looks meaningfully bad even after trusting
      // the proposer. A 0.5 margin keeps marginal trades from being rejected.
      const rejectMargin = 0.5;
      const rejectU = (-blendedDelta - rejectMargin) * (0.4 + 0.6 * acceptScore.confidence)
        + (1 - traitsM.agreeableness) * 0.25
        - traitsM.trustInTeammates * 0.3;
      candidates.push({
        msg: { type: "rejectChipMove", initiatorHandId: p.initiatorHandId, recipientHandId: p.recipientHandId },
        score: { teamInversionDelta: -blendedDelta, confidence: acceptScore.confidence },
        utility: rejectU,
      });
    }
  }

  // Track ages of my own pending proposals — stale ones get cancelled so we
  // don't block the recipient's queue forever.
  const myActivePropKeys = new Set<string>();
  for (const p of state.acquireRequests.filter((r) => r.initiatorId === myPlayerId)) {
    const k = reqKey(p.initiatorHandId, p.recipientHandId);
    myActivePropKeys.add(k);
    memo.proposalAges.set(k, (memo.proposalAges.get(k) ?? 0) + 1);

    const after = rankingAfterChipMove(state.ranking, p.initiatorHandId, p.recipientHandId, p.kind);
    const score = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates);
    const age = memo.proposalAges.get(k) ?? 0;
    const stale = age >= 5;
    if (score.teamInversionDelta <= 0.05 || stale) {
      candidates.push({
        msg: { type: "cancelChipMove", initiatorHandId: p.initiatorHandId, recipientHandId: p.recipientHandId },
        score: { teamInversionDelta: 0.1, confidence: score.confidence },
        // Stale cancel beats other low-utility candidates so we actually flush
        // the queue and try something else.
        utility: stale ? 0.4 : 0.15,
      });
    }
  }
  // Drop ages for proposals that no longer exist.
  for (const k of Array.from(memo.proposalAges.keys())) {
    if (!myActivePropKeys.has(k)) memo.proposalAges.delete(k);
  }

  const emptySlots: number[] = [];
  for (let i = 0; i < state.ranking.length; i++) if (state.ranking[i] === null) emptySlots.push(i);
  const myUnranked = myHands.filter((h) => state.ranking.indexOf(h.id) === -1);
  for (const h of myUnranked) {
    for (const slot of emptySlots) {
      const after = rankingAfterMove(state.ranking, h.id, slot);
      if (after === null) continue;
      const score = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates);
      candidates.push({
        msg: { type: "move", handId: h.id, toIndex: slot },
        score,
        utility: utilityFor(score, traitsM),
      });
    }
  }

  if (emptySlots.length > 0) {
    if (!overDecisionCap) {
      for (const h of myHands) {
        const from = state.ranking.indexOf(h.id);
        if (from === -1) continue;
        for (const slot of emptySlots) {
          const after = rankingAfterMove(state.ranking, h.id, slot);
          if (after === null) continue;
          const score = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates);
          if (score.teamInversionDelta > 0.2) {
            candidates.push({
              msg: { type: "move", handId: h.id, toIndex: slot },
              score,
              utility: utilityFor(score, traitsM),
            });
          }
        }
      }
    }
  }

  if (!overDecisionCap) {
    const myRanked = myHands
      .map((h) => ({ h, idx: state.ranking.indexOf(h.id) }))
      .filter((x) => x.idx !== -1);
    for (let i = 0; i < myRanked.length; i++) {
      for (let j = i + 1; j < myRanked.length; j++) {
        const a = myRanked[i], b = myRanked[j];
        const after = rankingAfterSwap(state.ranking, a.h.id, b.h.id);
        const score = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates);
        if (score.teamInversionDelta > 0.2) {
          candidates.push({
            msg: { type: "swap", handIdA: a.h.id, handIdB: b.h.id },
            score,
            utility: utilityFor(score, traitsM),
          });
        }
      }
    }
  }

  for (const h of myHands) {
    const myIdx = state.ranking.indexOf(h.id);
    for (let s = 0; s < state.ranking.length; s++) {
      const otherId = state.ranking[s];
      if (!otherId) continue;
      const otherHand = state.hands.find((x) => x.id === otherId);
      if (!otherHand || otherHand.playerId === myPlayerId) continue;

      const kind: "acquire" | "offer" | "swap" = myIdx === -1 ? "acquire" : "swap";

      const already = state.acquireRequests.some(
        (r) => r.initiatorId === myPlayerId && r.initiatorHandId === h.id && r.recipientHandId === otherId
      );
      if (already) continue;
      // Don't re-propose a pairing that was just rejected/cancelled this phase.
      if (memo.myRejectedKeys.has(reqKey(h.id, otherId))) continue;
      const taken = state.acquireRequests.some(
        (r) => r.recipientHandId === otherId && r.initiatorId !== myPlayerId
      );
      if (taken) continue;

      const after = rankingAfterChipMove(state.ranking, h.id, otherId, kind);
      const score = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates);

      const defer = deferralWeight(memo.belief, signals, otherId);
      const deferPenalty = defer * 0.5 * traitsM.trustInTeammates;
      const extraversionBonus = (traitsM.extraversion - 0.5) * 0.2;

      const util = utilityFor(score, traitsM, { teamOnlyBenefit: score.teamInversionDelta })
        - deferPenalty + extraversionBonus;

      if (canPropose(memo, resignation, overDecisionCap, score.teamInversionDelta, state.hands.length)) {
        candidates.push({
          msg: { type: "proposeChipMove", initiatorHandId: h.id, recipientHandId: otherId },
          score,
          utility: util,
        });
      }
    }
  }

  // Offer proposals: I'm ranked, opponent is unranked — offer my slot to them.
  const myRankedHands = myHands.filter((h) => state.ranking.indexOf(h.id) !== -1);
  const unrankedOpponentHands = state.hands.filter((h) => {
    if (h.playerId === myPlayerId) return false;
    return state.ranking.indexOf(h.id) === -1;
  });
  for (const myH of myRankedHands) {
    for (const theirH of unrankedOpponentHands) {
      const already = state.acquireRequests.some(
        (r) => r.initiatorId === myPlayerId && r.initiatorHandId === myH.id && r.recipientHandId === theirH.id
      );
      if (already) continue;
      if (memo.myRejectedKeys.has(reqKey(myH.id, theirH.id))) continue;
      const taken = state.acquireRequests.some(
        (r) => r.recipientHandId === theirH.id && r.initiatorId !== myPlayerId
      );
      if (taken) continue;
      const after = rankingAfterChipMove(state.ranking, myH.id, theirH.id, "offer");
      const score = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates);
      const defer = deferralWeight(memo.belief, signals, theirH.id);
      const deferPenalty = defer * 0.5 * traitsM.trustInTeammates;
      const extraversionBonus = (traitsM.extraversion - 0.5) * 0.2;
      const util = utilityFor(score, traitsM, { teamOnlyBenefit: score.teamInversionDelta })
        - deferPenalty + extraversionBonus;
      if (canPropose(memo, resignation, overDecisionCap, score.teamInversionDelta, state.hands.length)) {
        candidates.push({
          msg: { type: "proposeChipMove", initiatorHandId: myH.id, recipientHandId: theirH.id },
          score,
          utility: util,
        });
      }
    }
  }

  if (effectiveAllRanked && !alreadyReady) {
    const readyU = 0.2 + 0.4 * traitsM.decisiveness + 0.2 * memo.mood.focus
      - 0.3 * memo.mood.concern
      + resignation * 1.5; // give up → just lock in what we've got
    candidates.push({
      msg: { type: "ready", ready: true },
      score: { teamInversionDelta: 0.05, confidence: 0.5 },
      utility: readyU,
    });
  }

  // === 3. SELECTION ===
  if (candidates.length === 0) {
    const dingP = (1 - traitsM.conscientiousness) * 0.08 + traitsM.extraversion * 0.18;
    if (Math.random() < dingP) {
      memo.idleTicks++;
      return { type: "ding" };
    }
    memo.idleTicks++;
    return null;
  }

  candidates.sort((a, b) => b.utility - a.utility);

  // Mandatory placement: if I have unranked hands and empty slots, restrict
  // to placement candidates and skip the utility-zero gate. An unranked hand
  // at reveal is unscoreable — always worse than any placement.
  const haveUnranked = myHands.some((h) => state.ranking.indexOf(h.id) === -1);
  const haveEmpty = state.ranking.some((s) => s === null);
  // If a proposal targets me, accept/reject must be in the pool — otherwise
  // proposers wait forever while I'm placing.
  const mustRespond = proposalsToMe.length > 0;
  let pool = candidates;
  // Priority 1: if a proposal is targeting me and was already pending last
  // tick, RESPOND first. The proposer is burning ticks waiting; placements
  // can wait one cycle. Fresh proposals (just arrived this tick) don't get
  // priority — placement is still more important than a not-yet-confirmed
  // request.
  const stalePropToMe = mustRespond && memo.prevAcquireRequests.some((p) => {
    const rh = state.hands.find((h) => h.id === p.recipientHandId);
    return rh && rh.playerId === myPlayerId && state.acquireRequests.some(
      (cur) => cur.initiatorHandId === p.initiatorHandId && cur.recipientHandId === p.recipientHandId
    );
  });
  if (stalePropToMe) {
    const responses = candidates.filter(
      (c) => c.msg.type === "acceptChipMove" || c.msg.type === "rejectChipMove"
    );
    if (responses.length > 0) pool = responses;
  } else if (haveUnranked && haveEmpty) {
    const placeOnly = candidates.filter((c) => {
      if (c.msg.type === "move") {
        const m = c.msg as { handId: string };
        return myHands.some((h) => h.id === m.handId && state.ranking.indexOf(h.id) === -1);
      }
      // Always keep responses to incoming proposals so we don't ghost the table.
      return mustRespond && (c.msg.type === "acceptChipMove" || c.msg.type === "rejectChipMove");
    });
    if (placeOnly.length > 0) pool = placeOnly;
  }
  const top = pool.slice(0, 3);

  if (!mustRespond && !(haveUnranked && haveEmpty) && top[0].utility <= 0 && top[0].msg.type !== "ready") {
    memo.idleTicks++;
    return null;
  }

  // Difficulty: low when top candidate clearly dominates, high when it's a
  // close call. We use the GAP between #1 and #2 as the signal — a wide gap
  // means the decision is easy and we should pick deterministically.
  const gap = top[0].utility - (top[1]?.utility ?? top[0].utility);
  const difficulty = Math.min(1, gap < 0.1 ? 1 : gap < 0.5 ? 0.6 : gap < 1.5 ? 0.3 : 0.1);

  const honestMisread = Math.random() < Math.min(0.03, (1 - traitsM.skill) * 0.04);
  if (honestMisread && top.length >= 2) {
    memo.decisionCount++;
    memo.idleTicks = 0;
    commitAction(memo, top[1].msg);
    return top[1].msg;
  }

  // Temperature collapses toward 0 when top candidate clearly dominates so
  // we're not gambling on lower-utility options. Skill and mood still pull
  // it up for genuinely close decisions.
  const tempBase = (1 - traitsM.skill) * 0.4 + memo.mood.concern * 0.3;
  const temperature = tempBase * difficulty + 0.05;
  const scores = top.map((c) => c.utility);
  const pick = softmaxPick(top, scores, temperature);

  memo.decisionCount++;
  memo.idleTicks = 0;
  commitAction(memo, pick.msg);

  if (pick.msg.type === "rejectChipMove") {
    memo.recentlyRejected.add(reqKey(pick.msg.initiatorHandId, pick.msg.recipientHandId));
  }

  return pick.msg;
}
