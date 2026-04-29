/**
 * Cooperative-bot decision pipeline.
 *
 *   1. Perception → update BeliefState from public placements + trades.
 *   2. Evaluation → score candidate actions by team-EV (inversion reduction).
 *   3. Selection  → softmax over top actions, modulated by Traits.
 *
 * This is the main entry point for bot decision-making. Called once per bot
 * tick (either timer-driven in production, or synchronously in fast-sim mode).
 */

import type { AcquireRequest, ClientMessage, GameState, Hand } from "../types";
import { currentHandStrength, estimateStrength } from "./handStrength";
import { classifyHand, type ClassifiedHand } from "./handClassifier";
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
import {
  newSocialMemory,
  processSocialSignals,
  shouldSemanticDing,
  shouldSemanticFuckoff,
  socialOnPhaseBoundary,
  type SocialMemory,
} from "./socialMemory";

/**
 * Per-bot persistent memory across ticks.
 */
export type BotMemo = {
  /** Cached hand strength estimates for this phase. */
  estimates: Map<string, number>;
  /** Phase string for which estimates are valid. */
  estimatesPhase: string;
  /** Consecutive ticks with no action taken. */
  idleTicks: number;
  /** Total voluntary decisions this phase (capped at 60 to prevent churn). */
  decisionCount: number;
  /** Proposal keys we've recently rejected (cooldown to avoid ping-pong). */
  recentlyRejected: Set<string>;
  /** Belief state tracking teammate hand strengths. */
  belief: BeliefState;
  /** Signature of ranking at last tick, used to detect teammate churn. */
  lastRankingSig: string;
  /** Proposal keys we had pending last tick (used to detect rejections). */
  prevMyProposals: Set<string>;
  /** Our own proposals that were rejected this phase (don't re-propose). */
  myRejectedKeys: Set<string>;
  /** handId → slot index from the previous tick. */
  prevHandSlots: Map<string, number>;
  /** Ticks where board is full but someone isn't ready. */
  stallTicks: number;
  /** Ticks since last state-changing action. */
  ticksSinceProgress: number;
  /** Count of proposals initiated in current phase. */
  myProposalsThisPhase: number;
  /** Snapshot of pending requests from last tick. */
  prevAcquireRequests: AcquireRequest[];
  /** How many ticks each of our proposals has been pending. */
  proposalAges: Map<string, number>;
  /** Ticks we've deferred at phase start to let higher-skill bots place first. */
  phaseDeferTicks: number;
  /** Cached hand classification (draws, made hands, etc.). */
  classifiedHands: Map<string, ClassifiedHand>;
  /** Phase string for which classifications are valid. */
  handClassifiedPhase: string;
  /** Social signal memory: tracking dings/fuckoffs from other players. */
  socialMemory: SocialMemory;
};

/** Create a fresh bot memo with empty caches and counters. */
export function newBotMemo(): BotMemo {
  return {
    estimates: new Map(),
    estimatesPhase: "",
    idleTicks: 0,
    decisionCount: 0,
    recentlyRejected: new Set(),
    belief: newBeliefState(),
    lastRankingSig: "",
    prevMyProposals: new Set(),
    myRejectedKeys: new Set(),
    prevHandSlots: new Map(),
    stallTicks: 0,
    ticksSinceProgress: 0,
    myProposalsThisPhase: 0,
    prevAcquireRequests: [],
    proposalAges: new Map(),
    phaseDeferTicks: 0,
    classifiedHands: new Map(),
    handClassifiedPhase: "",
    socialMemory: newSocialMemory(),
  };
}

function commitAction(memo: BotMemo, msg: ClientMessage): void {
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

// ── Inlined teammate-signal helpers (formerly signals.ts) ──

/**
 * How "defer-worthy" a teammate hand placement looks: a blend of belief
 * confidence and the teammate's overall placement stability/churn signal.
 */
function deferralWeight(belief: BeliefState, handId: string): number {
  const conf = belief.handConfidence.get(handId) ?? 0;
  let teammateConf = 0.3;
  for (const tb of belief.perTeammate.values()) {
    if (!tb.hands.has(handId)) continue;
    let stable = 0;
    let placed = 0;
    for (const hb of tb.hands.values()) {
      placed++;
      stable += Math.min(3, hb.slotStableFor) / 3;
    }
    const stability = placed === 0 ? 0.3 : stable / placed;
    teammateConf = Math.max(0, Math.min(1, 0.2 + 0.6 * stability - 0.4 * tb.churnRate));
    break;
  }
  return Math.min(1, conf * 0.6 + teammateConf * 0.4);
}

function canPropose(
  memo: BotMemo,
  resignation: number,
  overDecisionCap: boolean,
  teamInversionDelta: number,
  tableSize: number,
  stubbornness: number
): boolean {
  if (overDecisionCap) return false;
  if (resignation >= 0.85) return false;
  const cap = Math.max(4, Math.ceil(tableSize * 0.8));
  if (memo.myProposalsThisPhase >= cap) return false;
  const proposeBar = 0.3 + resignation * 1.0 + stubbornness * 0.25;
  return teamInversionDelta > proposeBar;
}

/**
 * Get a cached strength estimate for a hand, computing if necessary.
 *
 * For hands the bot OWNS, we use `currentHandStrength` — strict "rank what
 * you have right now." MC win-rate would credit future-card draw equity
 * which the strategy guide explicitly forbids.
 *
 * For unknown teammate hands the cache is keyed by hand and reused; callers
 * route those through belief, not this function.
 */
function getEstimate(
  memo: BotMemo,
  hand: Hand,
  board: GameState["communityCards"],
): number {
  const cached = memo.estimates.get(hand.id);
  if (cached !== undefined) return cached;
  const score = currentHandStrength(hand.cards, board);
  memo.estimates.set(hand.id, score);
  return score;
}

void estimateStrength; // keep import alive — used by belief/range.

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

/**
 * Anchor bonus: when our own hand is at the strength extremes, give a
 * placement bump for the matching slot. Top-1 and bottom slot are high-value
 * commitments per the strategy guide.
 */
function anchorBonus(ownStrength: number, targetSlot: number, totalSlots: number, leadsConsensus: number): number {
  if (totalSlots <= 1) return 0;
  const lead = 1 + leadsConsensus * 0.4;
  if (ownStrength >= 0.85 && targetSlot === 0) return 0.20 * lead;
  if (ownStrength <= 0.15 && targetSlot === totalSlots - 1) return 0.20 * lead;
  return 0;
}

/**
 * Spread penalty: discourage placing two of our own hands in adjacent slots
 * when we believe their strengths are nearly equal. Pure tie-breaker —
 * dominated by any real signal in the score.
 */
function spreadPenalty(
  ownPlacements: Array<{ slot: number; strength: number }>,
  candidateSlot: number,
  candidateStrength: number,
): number {
  for (const p of ownPlacements) {
    if (Math.abs(p.slot - candidateSlot) === 1 &&
        Math.abs(p.strength - candidateStrength) < 0.02) {
      return 0.05;
    }
  }
  return 0;
}

export function decideAction(
  state: GameState,
  myPlayerId: string,
  traits: Traits,
  memo: BotMemo,
  opts?: { nSims?: number }
): ClientMessage | null {
  void opts;

  if (memo.estimatesPhase !== state.phase) {
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
    memo.phaseDeferTicks = 0;
    memo.classifiedHands.clear();
    memo.handClassifiedPhase = "";
    beliefOnPhaseBoundary(memo.belief);
    socialOnPhaseBoundary(memo.socialMemory, state);
  }

  if (state.phase === "reveal") {
    if (state.score !== null) return null;
    const totalHands = state.hands.length;
    if (state.revealIndex >= totalHands) return null;
    const currentRevealIdx = state.ranking.length - 1 - state.revealIndex;
    const handToFlipId = state.ranking[currentRevealIdx];
    if (!handToFlipId) {
      const me = state.players.find((p) => p.id === myPlayerId);
      if (me?.connected) return { type: "flip", handId: "" };
      return null;
    }
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

  // Skill-weighted deferral: at phase start, lower-skill bots wait briefly
  // so higher-skill teammates place first.
  const myHandsForDefer = state.hands.filter((h) => h.playerId === myPlayerId);
  const haveAnyPlaced = state.ranking.some((s) => s !== null);
  const myAnyPlaced = myHandsForDefer.some((h) => state.ranking.indexOf(h.id) !== -1);
  if (!myAnyPlaced && !haveAnyPlaced && memo.phaseDeferTicks < 3) {
    let highestTeammateSkill = 0;
    for (const p of state.players) {
      if (p.id === myPlayerId || !p.connected) continue;
      const tb = memo.belief.perTeammate.get(p.id);
      const sp = tb?.skillPrior ?? 0.5;
      if (sp > highestTeammateSkill) highestTeammateSkill = sp;
    }
    if (highestTeammateSkill > traits.skill + 0.1) {
      memo.phaseDeferTicks++;
      return null;
    }
  }

  memo.ticksSinceProgress++;

  const unrankedHandsAll = state.hands.filter((h) => state.ranking.indexOf(h.id) === -1);
  const onlyOfflineUnrankedAll = unrankedHandsAll.every((h) => {
    const owner = state.players.find((p) => p.id === h.playerId);
    return owner ? !owner.connected : true;
  });
  const effectiveAllRanked =
    state.ranking.every((s) => s !== null) || onlyOfflineUnrankedAll;

  const overDecisionCap = memo.decisionCount > 60;
  if (overDecisionCap) {
    if (effectiveAllRanked) {
      const me = state.players.find((p) => p.id === myPlayerId);
      if (me && !me.ready) {
        memo.ticksSinceProgress = 0;
        return { type: "ready", ready: true };
      }
    }
  }

  const myHands = state.hands.filter((h) => h.playerId === myPlayerId);
  if (myHands.length === 0) return null;

  const board = state.communityCards;

  for (const h of myHands) getEstimate(memo, h, board);

  // Newbie quirk: small overrank bias on own pocket pairs (top-pair-no-kicker
  // looks better than it is). Applied to the cached estimate.
  const overrank = traits.quirks?.overrankOwnPairs ?? 0;
  if (overrank > 0) {
    for (const h of myHands) {
      if (h.cards.length === 2 && h.cards[0].rank === h.cards[1].rank) {
        const cur = memo.estimates.get(h.id) ?? 0.5;
        memo.estimates.set(h.id, Math.min(1, cur + overrank));
      }
    }
  }

  if (memo.handClassifiedPhase !== state.phase || memo.classifiedHands.size === 0) {
    memo.classifiedHands.clear();
    memo.handClassifiedPhase = state.phase;
    for (const h of myHands) {
      if (h.cards.length >= 2) {
        memo.classifiedHands.set(h.id, classifyHand(h.cards, board));
      }
    }
  }

  // === 1. PERCEPTION ===
  reconcileTrades(memo.belief, state, memo.prevAcquireRequests, myPlayerId);
  memo.prevAcquireRequests = state.acquireRequests.map((r) => ({ ...r }));
  perceiveState(memo.belief, state, myPlayerId);

  // === 1a. SOCIAL SIGNALS ===
  const socialAdj = processSocialSignals(memo.socialMemory, state, myPlayerId);
  for (const [hid, boost] of socialAdj.strengthBoosts) {
    const cur = memo.belief.handStrength.get(hid) ?? 0.5;
    memo.belief.handStrength.set(hid, Math.min(1, cur + boost));
  }

  const sig = rankingSig(state.ranking);
  memo.lastRankingSig = sig;

  const me = state.players.find((p) => p.id === myPlayerId);

  // Cooperative override for trading decisions.
  const coopTraits = { ...traits, agreeableness: 0.75, trustInTeammates: 0.75, stubbornness: 0.35 };

  // Resignation rises with rejected/vanished proposals and idle ticks.
  const resignationRaw =
    memo.myRejectedKeys.size * 0.28 +
    Math.min(8, memo.idleTicks) * 0.12 +
    Math.min(10, memo.decisionCount) * 0.05;
  const stubbornness = traits.stubbornness ?? 0.55;
  const resignation = Math.max(0, Math.min(1,
    resignationRaw * (1.2 - 0.4 * traits.conscientiousness - 0.3 * traits.neuroticism - 0.2 * stubbornness)
  ));

  // Effective stubbornness modulated by hand types + cedesEasily quirk.
  const cedesEasily = traits.quirks?.cedesEasily ?? 0;
  let effectiveStubbornness = Math.max(0, stubbornness - cedesEasily * 0.15);
  let coopEffectiveStubbornness = Math.max(0, coopTraits.stubbornness - cedesEasily * 0.15);
  let speculativeAdjustment = 0;
  for (const [, cls] of memo.classifiedHands) {
    if (cls.madeHandType && cls.madeHandType !== "high-card" && cls.madeHandType !== "pair") {
      effectiveStubbornness = Math.min(1, effectiveStubbornness + 0.1);
      coopEffectiveStubbornness = Math.min(1, coopEffectiveStubbornness + 0.1);
    }
    if (cls.isSpeculative) {
      effectiveStubbornness = Math.max(0, effectiveStubbornness - 0.12);
      coopEffectiveStubbornness = Math.max(0, coopEffectiveStubbornness - 0.12);
      speculativeAdjustment += 0.1;
    }
  }

  // Anchor candidates: own hands at strength extremes get extra weight when
  // placing into the matching anchor slot. Added to placement utility below.
  const leadsConsensus = traits.quirks?.leadsConsensus ?? 0;
  const anchorBonusForOwn = (handId: string, slot: number, totalSlots: number): number => {
    const h = myHands.find((x) => x.id === handId);
    if (!h) return 0;
    const s = memo.estimates.get(handId);
    if (s === undefined) return 0;
    return anchorBonus(s, slot, totalSlots, leadsConsensus);
  };
  // Skeptic quirk: extra reject weight on incoming proposals targeting rank 1.
  const suspectsTop = traits.quirks?.suspectsTop ?? 0;

  const alreadyReady = !!me?.ready;

  const incomingProposal = state.acquireRequests.some((r) => {
    const rh = state.hands.find((h) => h.id === r.recipientHandId);
    return rh && rh.playerId === myPlayerId;
  });
  const outgoingProposal = state.acquireRequests.some((r) => r.initiatorId === myPlayerId);

  if (effectiveAllRanked && !alreadyReady && !incomingProposal && !outgoingProposal &&
      (memo.ticksSinceProgress >= 3 || resignation >= 0.85)) {
    memo.ticksSinceProgress = 0;
    return { type: "ready", ready: true };
  }
  const myHandsPlaced = myHands.every((h) => state.ranking.indexOf(h.id) !== -1);
  const othersAllReady = state.players
    .filter((p) => p.id !== myPlayerId && p.connected)
    .every((p) => p.ready);
  if (!alreadyReady && !incomingProposal && !outgoingProposal && myHandsPlaced && othersAllReady && effectiveAllRanked && memo.ticksSinceProgress >= 1) {
    memo.ticksSinceProgress = 0;
    return { type: "ready", ready: true };
  }

  // === 1b. EXPRESSIVE EVENTS — ding / fuckoff before the normal pipeline ===
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
      memo.myRejectedKeys.add(k);
    }
  }
  memo.prevMyProposals = currentMyProposalKeys;

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
  memo.prevHandSlots.clear();
  for (let i = 0; i < state.ranking.length; i++) {
    const hid = state.ranking[i];
    if (hid) memo.prevHandSlots.set(hid, i);
  }

  const allRankedNow = state.ranking.every((s) => s !== null);
  const someoneNotReady = state.players.some((p) => p.connected && !p.ready);
  if (allRankedNow && someoneNotReady) memo.stallTicks++;
  else memo.stallTicks = 0;

  const alreadyDingedThisPhase = state.dingLog.some(
    (s) => s.playerId === myPlayerId && s.phase === state.phase
  );
  const alreadyFuckedOffThisPhase = state.fuckoffLog.some(
    (s) => s.playerId === myPlayerId && s.phase === state.phase
  );

  if (!alreadyDingedThisPhase && shouldSemanticDing(state, myPlayerId, memo.estimates, memo.socialMemory, traits)) {
    memo.idleTicks = 0;
    return { type: "ding" };
  }

  const semanticFuckoff = !alreadyFuckedOffThisPhase
    ? shouldSemanticFuckoff(state, myPlayerId, memo, memo.socialMemory, traits)
    : null;
  if (semanticFuckoff) {
    memo.idleTicks = 0;
    return { type: "fuckoff" };
  }

  // Legacy expressive fallbacks — small probability noise for personality flavor.
  const fuckoffTendency = traits.fuckoffTendency ?? 1.0;
  const dingTendency = traits.dingTendency ?? 1.0;
  if (!alreadyFuckedOffThisPhase && myProposalVanished) {
    const frustration = ((1 - traits.agreeableness) * 0.14 + traits.neuroticism * 0.08) * fuckoffTendency;
    if (Math.random() < frustration) {
      memo.idleTicks = 0;
      return { type: "fuckoff" };
    }
  }
  if (!alreadyDingedThisPhase && confidentChurn) {
    const complaint = (traits.extraversion * 0.10 + traits.helpfulness * 0.06) * dingTendency;
    if (Math.random() < complaint) {
      memo.idleTicks = 0;
      return { type: "ding" };
    }
  }
  if (!alreadyDingedThisPhase && memo.stallTicks >= 3) {
    const nudge = (traits.extraversion * 0.06 + (1 - traits.conscientiousness) * 0.03) * dingTendency;
    if (Math.random() < nudge) {
      memo.idleTicks = 0;
      return { type: "ding" };
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
    const myScore = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates);
    const totalHands = state.hands.length;
    const initIdxAfter = after.indexOf(p.initiatorHandId);
    const baseTrust = coopTraits.trustInTeammates;
    const proposerHand = state.hands.find((x) => x.id === p.initiatorHandId);
    const proposerBelief = proposerHand ? memo.belief.perTeammate.get(proposerHand.playerId) : undefined;
    const proposerSkill = proposerBelief?.skillPrior ?? 0.5;
    const trust = Math.max(0, Math.min(1, baseTrust + proposerSkill * 0.25));
    const overrides = new Map<string, number>();
    if (initIdxAfter !== -1 && totalHands > 1) {
      const proposerImplied = 1 - initIdxAfter / (totalHands - 1);
      const myView = memo.belief.handStrength.get(p.initiatorHandId) ?? 0.5;
      overrides.set(p.initiatorHandId, (1 - trust) * myView + trust * proposerImplied);
    }
    const trustedScore = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates, overrides);
    const blendedDelta = (1 - trust) * myScore.teamInversionDelta + trust * trustedScore.teamInversionDelta;

    let cfPenalty = 0;
    if (proposerHand && totalHands > 1 && initIdxAfter !== -1) {
      const proposerSelfBelief = proposerBelief?.hands.get(p.initiatorHandId);
      if (proposerSelfBelief) {
        const impliedSlot = initIdxAfter / (totalHands - 1);
        const theirOwnView = proposerSelfBelief.mean;
        const gap = theirOwnView - (1 - impliedSlot);
        if (gap < -0.30) {
          cfPenalty = Math.min(0.12, Math.abs(gap) * Math.max(0, 0.7 - proposerSkill));
        }
      }
    }

    const acceptScore: typeof myScore = {
      teamInversionDelta: blendedDelta,
      confidence: Math.max(0, myScore.confidence - cfPenalty * 0.5),
    };
    const initDefer = deferralWeight(memo.belief, p.initiatorHandId);
    const acceptBoost = coopTraits.agreeableness * 0.3
      + initDefer * 0.2 * coopTraits.trustInTeammates
      + resignation * 0.4
      + coopTraits.trustInTeammates * 0.5 * (1 - 0.25 * coopEffectiveStubbornness);

    let habitBonus = 0;
    if (proposerHand) {
      const proposerHabits = memo.belief.perTeammate.get(proposerHand.playerId)?.habits;
      if (proposerHabits && proposerHabits.phasesObserved >= 2) {
        habitBonus -= Math.abs(proposerHabits.overvaluationBias) * 0.25;
      }
    }
    const strongAcceptBonus = blendedDelta > 0.5 ? 0.8 : 0;
    if (blendedDelta > -0.1) {
      candidates.push({
        msg: { type: "acceptChipMove", initiatorHandId: p.initiatorHandId, recipientHandId: p.recipientHandId },
        score: acceptScore,
        utility: utilityFor(acceptScore, traits) + acceptBoost + habitBonus + strongAcceptBonus,
      });
    }

    const k = reqKey(p.initiatorHandId, p.recipientHandId);
    if (!memo.recentlyRejected.has(k)) {
      const conf = acceptScore.confidence;
      const rejectMargin = (0.7 - 0.3 * conf) * (1.15 - 0.3 * coopEffectiveStubbornness);
      // Skeptic quirk: extra reject weight when proposal targets our top slot.
      let topSlotPenalty = 0;
      if (suspectsTop > 0) {
        const recipientHand = state.hands.find((h) => h.id === p.recipientHandId);
        if (recipientHand) {
          const recSlot = state.ranking.indexOf(p.recipientHandId);
          const initSlot = after.indexOf(p.initiatorHandId);
          if ((recSlot === 0 || initSlot === 0)) topSlotPenalty = suspectsTop * 0.15;
        }
      }
      const rejectU = (-blendedDelta - rejectMargin) * (0.4 + 0.6 * conf)
        + (1 - coopTraits.agreeableness) * 0.25
        - coopTraits.trustInTeammates * 0.3
        + coopEffectiveStubbornness * 0.12
        + topSlotPenalty;
      candidates.push({
        msg: { type: "rejectChipMove", initiatorHandId: p.initiatorHandId, recipientHandId: p.recipientHandId },
        score: { teamInversionDelta: -blendedDelta, confidence: conf },
        utility: rejectU,
      });
    }
  }

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
        utility: stale ? 0.4 : 0.15,
      });
    }
  }
  for (const k of Array.from(memo.proposalAges.keys())) {
    if (!myActivePropKeys.has(k)) memo.proposalAges.delete(k);
  }

  // Snapshot of own placements (for spread penalty).
  const myPlacements: Array<{ slot: number; strength: number }> = [];
  for (const h of myHands) {
    const slot = state.ranking.indexOf(h.id);
    if (slot === -1) continue;
    const s = memo.estimates.get(h.id) ?? 0.5;
    myPlacements.push({ slot, strength: s });
  }

  const emptySlots: number[] = [];
  for (let i = 0; i < state.ranking.length; i++) if (state.ranking[i] === null) emptySlots.push(i);
  const myUnranked = myHands.filter((h) => state.ranking.indexOf(h.id) === -1);
  for (const h of myUnranked) {
    for (const slot of emptySlots) {
      const after = rankingAfterMove(state.ranking, h.id, slot);
      if (after === null) continue;
      const score = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates);
      const est = memo.estimates.get(h.id) ?? 0.5;
      const idealSlot = (1 - est) * (state.ranking.length - 1);
      const slotAlign = 1 - Math.abs(slot - idealSlot) / Math.max(1, state.ranking.length - 1);
      const posBonus = slotAlign * 0.3 * traits.skill;
      const anchor = anchorBonusForOwn(h.id, slot, state.ranking.length);
      const spread = spreadPenalty(myPlacements, slot, est);
      candidates.push({
        msg: { type: "move", handId: h.id, toIndex: slot },
        score,
        utility: utilityFor(score, traits) + posBonus + anchor - spread,
      });
    }
  }

  if (emptySlots.length > 0 && !overDecisionCap) {
    for (const h of myHands) {
      const from = state.ranking.indexOf(h.id);
      if (from === -1) continue;
      for (const slot of emptySlots) {
        const after = rankingAfterMove(state.ranking, h.id, slot);
        if (after === null) continue;
        const score = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates);
        if (score.teamInversionDelta > 0.08) {
          const est = memo.estimates.get(h.id) ?? 0.5;
          const idealSlot = (1 - est) * (state.ranking.length - 1);
          const slotAlign = 1 - Math.abs(slot - idealSlot) / Math.max(1, state.ranking.length - 1);
          const posBonus = slotAlign * 0.15 * traits.skill;
          const anchor = anchorBonusForOwn(h.id, slot, state.ranking.length);
          candidates.push({
            msg: { type: "move", handId: h.id, toIndex: slot },
            score,
            utility: utilityFor(score, traits) + posBonus + anchor,
          });
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
        if (score.teamInversionDelta > 0.08) {
          candidates.push({
            msg: { type: "swap", handIdA: a.h.id, handIdB: b.h.id },
            score,
            utility: utilityFor(score, traits),
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
      if (memo.myRejectedKeys.has(reqKey(h.id, otherId))) continue;
      const taken = state.acquireRequests.some(
        (r) => r.recipientHandId === otherId && r.initiatorId !== myPlayerId
      );
      if (taken) continue;

      const after = rankingAfterChipMove(state.ranking, h.id, otherId, kind);
      const score = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates);

      const defer = deferralWeight(memo.belief, otherId);
      const deferPenalty = defer * 0.5 * coopTraits.trustInTeammates;
      const extraversionBonus = (traits.extraversion - 0.5) * 0.2;

      const util = utilityFor(score, coopTraits, { teamOnlyBenefit: score.teamInversionDelta })
        - deferPenalty + extraversionBonus;

      if (score.teamInversionDelta > 1.0 || canPropose(memo, resignation, overDecisionCap, score.teamInversionDelta, state.hands.length, coopEffectiveStubbornness)) {
        candidates.push({
          msg: { type: "proposeChipMove", initiatorHandId: h.id, recipientHandId: otherId },
          score,
          utility: util + (score.teamInversionDelta > 1.0 ? 0.5 : 0),
        });
      }
    }
  }

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
      const defer = deferralWeight(memo.belief, theirH.id);
      const deferPenalty = defer * 0.5 * coopTraits.trustInTeammates;
      const extraversionBonus = (traits.extraversion - 0.5) * 0.2;
      const util = utilityFor(score, coopTraits, { teamOnlyBenefit: score.teamInversionDelta })
        - deferPenalty + extraversionBonus;
      if (score.teamInversionDelta > 1.0 || canPropose(memo, resignation, overDecisionCap, score.teamInversionDelta, state.hands.length, coopEffectiveStubbornness)) {
        candidates.push({
          msg: { type: "proposeChipMove", initiatorHandId: myH.id, recipientHandId: theirH.id },
          score,
          utility: util + (score.teamInversionDelta > 1.0 ? 0.5 : 0),
        });
      }
    }
  }

  if (effectiveAllRanked && !alreadyReady && !outgoingProposal && !incomingProposal) {
    const readyU = -0.15 + 0.3 * traits.decisiveness
      + resignation * 1.0
      - speculativeAdjustment * 0.6;
    candidates.push({
      msg: { type: "ready", ready: true },
      score: { teamInversionDelta: 0.05, confidence: 0.5 },
      utility: readyU,
    });
  }

  // === 3. SELECTION ===
  if (candidates.length === 0) {
    const dingP = alreadyDingedThisPhase
      ? 0
      : ((1 - traits.conscientiousness) * 0.03 + traits.extraversion * 0.05) * dingTendency;
    if (Math.random() < dingP) {
      memo.idleTicks++;
      return { type: "ding" };
    }
    memo.idleTicks++;
    return null;
  }

  candidates.sort((a, b) => b.utility - a.utility);

  const haveUnranked = myHands.some((h) => state.ranking.indexOf(h.id) === -1);
  const haveEmpty = state.ranking.some((s) => s === null);
  const mustRespond = proposalsToMe.length > 0;
  let pool = candidates;
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
      return mustRespond && (c.msg.type === "acceptChipMove" || c.msg.type === "rejectChipMove");
    });
    if (placeOnly.length > 0) pool = placeOnly;
  }
  const top = pool.slice(0, 3);

  if (!mustRespond && !(haveUnranked && haveEmpty) && top[0].utility <= 0 && top[0].msg.type !== "ready") {
    memo.idleTicks++;
    return null;
  }

  const gap = top[0].utility - (top[1]?.utility ?? top[0].utility);
  const difficulty = Math.min(1, gap < 0.1 ? 1 : gap < 0.5 ? 0.6 : gap < 1.5 ? 0.3 : 0.1);

  const honestMisread = Math.random() < Math.min(0.03, (1 - traits.skill) * 0.04);
  if (honestMisread && top.length >= 2) {
    memo.decisionCount++;
    memo.idleTicks = 0;
    commitAction(memo, top[1].msg);
    return top[1].msg;
  }

  const tempBase = (1 - traits.skill) * 0.4;
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
