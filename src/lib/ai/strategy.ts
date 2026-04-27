/**
 * Cooperative-bot decision pipeline.
 *
 *   1. Perception → update BeliefState from public placements + trades.
 *   2. Evaluation → score candidate actions by team-EV (inversion reduction).
 *   3. Selection  → softmax over top actions, modulated by Traits + Mood.
 *
 * This is the main entry point for bot decision-making. Called once per bot
 * tick (either timer-driven in production, or synchronously in fast-sim mode).
 */

import type { AcquireRequest, ClientMessage, GameState, Hand } from "../types";
import { estimateStrength } from "./handStrength";
import { classifyHand, type ClassifiedHand } from "./handClassifier";
import type { Traits } from "./personality";
import {
  newBeliefState,
  perceiveState,
  reconcileTrades,
  updateSkillFromReveal,
  onPhaseBoundary as beliefOnPhaseBoundary,
  type BeliefState,
  type TeammateHabits,
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

/**
 * Per-bot persistent memory across ticks.
 *
 * Each bot has its own memo that survives across ticks within a phase.
 * It caches estimates, belief state, mood, and various bookkeeping counters
 * used by the decision pipeline.
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
  /** Current emotional state (focus, confidence, concern). */
  mood: Mood;
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
    phaseDeferTicks: 0,
    classifiedHands: new Map(),
    handClassifiedPhase: "",
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

/**
 * Should this bot propose a trade?
 *
 * Gates voluntary trade proposals. Returns false if:
 * - We've hit the per-phase decision cap (prevents churn).
 * - Resignation is too high (bot has given up on trading).
 * - We've already proposed too many times this phase.
 * - The expected improvement doesn't clear the personality-adjusted bar.
 *
 * Stubbornness and resignation both raise the threshold.
 */
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
  // Stubborn: needs larger expected improvement to bother proposing.
  // At stubbornness=1.0, bar is ~0.55; at 0.0, bar is ~0.3.
  const proposeBar = 0.3 + resignation * 1.0 + stubbornness * 0.25;
  return teamInversionDelta > proposeBar;
}

/**
 * Get a cached strength estimate for a hand, computing if necessary.
 * Estimates are memoized per phase in `memo.estimates`.
 */
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
  const adjusted = adjustEstimateWithClassifier(hand.id, est, memo);
  memo.estimates.set(hand.id, adjusted);
  return adjusted;
}

/**
 * Adjust a raw Monte Carlo estimate based on hand texture classification.
 *
 * - Made hands (two-pair+): pull estimate toward extremes (boost strong,
 *   reduce weak) — the bot should trust its own made hand.
 * - Speculative draws (flush/straight draws): compress toward 0.5 — the hand
 *   could improve dramatically, so be less confident.
 * - Overcards: slight boost — potential to improve on future streets.
 */
function adjustEstimateWithClassifier(
  handId: string,
  rawEst: number,
  memo: BotMemo
): number {
  const cls = memo.classifiedHands.get(handId);
  if (!cls) return rawEst;
  // Made hands (two-pair+) → more confident in estimate direction
  if (cls.madeHandType && !["high-card", "pair"].includes(cls.madeHandType)) {
    // Pull estimate toward extremes: strong hands > 0.5 get boosted, weak < 0.5 reduced
    if (rawEst > 0.5) return Math.min(1, rawEst + 0.08 * (rawEst - 0.5) * 2);
    if (rawEst < 0.5) return Math.max(0, rawEst - 0.08 * (0.5 - rawEst) * 2);
  }
  // Speculative draws → compress toward 0.5 (less confident)
  if (cls.isSpeculative) {
    const pull = (rawEst - 0.5) * 0.25;
    return rawEst - pull;
  }
  // Overcards → slight boost (potential to improve)
  if (cls.draws.includes("overcards")) {
    return Math.min(1, rawEst + 0.05);
  }
  return rawEst;
}

/**
 * Softmax selection over scored items.
 * Higher temperature → more randomness. Lower temperature → more deterministic.
 * Temperature is clamped to a minimum of 0.05 to avoid division by zero.
 */
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

/**
 * Convert an action score into a scalar utility for selection.
 *
 * Weighs team inversion reduction by confidence, plus small bonuses for
 * cooperative behavior (helpfulness) and self-benefit.
 */
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
 * Main bot decision entry point.
 *
 * Runs the full perception → evaluation → selection pipeline and returns
 * a `ClientMessage` to dispatch, or `null` if the bot chooses to do nothing
 * this tick.
 *
 * Special cases:
 * - **Lobby**: always returns null (bots don't act in lobby).
 * - **Reveal**: returns `flip` when it's this bot's turn to flip.
 * - **Game phases**: evaluates placements, swaps, trades, and ready.
 *
 * @param state       Current masked game state (same view a human sees).
 * @param myPlayerId  This bot's player ID.
 * @param traits      Personality traits (skill, stubbornness, etc.).
 * @param memo        Persistent bot memory (estimates, belief, mood, counters).
 * @param opts        Optional overrides (e.g. `nSims` for testing).
 */
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
    memo.phaseDeferTicks = 0;
    memo.classifiedHands.clear();
    memo.handClassifiedPhase = "";
    beliefOnPhaseBoundary(memo.belief);
    moodOnPhaseBoundary(memo.mood);
  }

  if (state.phase === "reveal") {
    if (state.score !== null) return null;
    const totalHands = state.hands.length;
    if (state.revealIndex >= totalHands) return null;
    const currentRevealIdx = state.ranking.length - 1 - state.revealIndex;
    const handToFlipId = state.ranking[currentRevealIdx];
    // Null slot (unranked offline hand) — any connected player can advance past it.
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
  // so higher-skill teammates place first. Their placements give the rest
  // of the table a stronger anchor than racing to fill blindly. Cap at 3
  // ticks so we never deadlock if a high-skill bot is offline.
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

  // Soft cap: once we've spent a lot of decisions in this phase, prefer to
  // settle. We still allow mandatory work (placements, responding to incoming
  // proposals) — just suppress voluntary churn (new proposals/swaps).
  const overDecisionCap = memo.decisionCount > 60;
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

  // Classify my own hands — understanding texture (draws, made hands, speculative)
  // improves trade evaluation, readiness timing, and slot defense.
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

  // Cooperative override for trading decisions: in a team game, bots should
  // default to trusting and agreeable when evaluating trades, regardless of
  // their base personality. Their quirks still show in timing, expressive
  // behavior, and readiness.
  const coopTraits = { ...traitsM, agreeableness: 0.75, trustInTeammates: 0.75, stubbornness: 0.35 };

  // Resignation: rises with rejected/vanished proposals and idle ticks.
  // Low-conscientiousness / low-neuroticism bots give up faster; Worriers
  // hold out longer. Stubbornness directly slows the curve. In [0, 1].
  const resignationRaw =
    memo.myRejectedKeys.size * 0.28 +
    Math.min(8, memo.idleTicks) * 0.12 +
    Math.min(10, memo.decisionCount) * 0.05;
  const stubbornness = traitsM.stubbornness ?? 0.55;
  const resignation = Math.max(0, Math.min(1,
    resignationRaw * (1.2 - 0.4 * traitsM.conscientiousness - 0.3 * traitsM.neuroticism - 0.2 * stubbornness)
  ));

  // Effective stubbornness modulated by my own hand types. A made hand
  // (e.g. set, flush) → defend the slot more. A speculative hand (draw) →
  // be more flexible, cede more easily if the team wants to rearrange.
  let effectiveStubbornness = stubbornness;
  let coopEffectiveStubbornness = coopTraits.stubbornness;
  let speculativeAdjustment = 0;
  for (const [hid, cls] of memo.classifiedHands) {
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

  const alreadyReady = !!me?.ready;

  // If a proposal targets ME, do NOT ready — answer first. Otherwise we close
  // the phase and the proposer never gets a response.
  const incomingProposal = state.acquireRequests.some((r) => {
    const rh = state.hands.find((h) => h.id === r.recipientHandId);
    return rh && rh.playerId === myPlayerId;
  });
  // Also don't ready if I have outgoing proposals waiting — give teammates time
  // to respond before locking the phase.
  const outgoingProposal = state.acquireRequests.some((r) => r.initiatorId === myPlayerId);

  // Hard stall breaker — before any expressive returns so ding loops can't block it.
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

  // Expressive events — only when there are no strong actions to take.
  // Lowered probabilities so bots focus on playing well rather than spamming chat.
  if (myProposalVanished) {
    const frustration = (1 - traitsM.agreeableness) * 0.22
      + traitsM.neuroticism * 0.12
      + memo.mood.concern * 0.12;
    if (Math.random() < frustration) {
      memo.idleTicks = 0;
      return { type: "fuckoff" };
    }
  }
  if (confidentChurn) {
    const complaint = traitsM.extraversion * 0.18 + traitsM.helpfulness * 0.10
      + memo.mood.concern * 0.08;
    if (Math.random() < complaint) {
      memo.idleTicks = 0;
      return { type: "ding" };
    }
  }
  if (memo.stallTicks >= 3) {
    const nudge = traitsM.extraversion * 0.12 + (1 - traitsM.conscientiousness) * 0.06;
    if (Math.random() < nudge) {
      memo.idleTicks = 0;
      return { type: "ding" };
    }
  }
  if (memo.mood.concern > 0.6 && traitsM.agreeableness < 0.45) {
    if (Math.random() < 0.04 * traitsM.extraversion) {
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
    const baseTrust = coopTraits.trustInTeammates;
    // High-skill proposers are more credible regardless of our base trust level.
    const proposerHand = state.hands.find((x) => x.id === p.initiatorHandId);
    const proposerBelief = proposerHand ? memo.belief.perTeammate.get(proposerHand.playerId) : undefined;
    const proposerSkill = proposerBelief?.skillPrior ?? 0.5;
    const trust = Math.min(1, baseTrust + proposerSkill * 0.25);
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

    // Counterfactual reasoning: the proposer is claiming their hand belongs at
    // the post-move slot. Does that claim match what we've inferred about their
    // hand from their own placement history? If they consistently placed it at
    // a very different slot, this proposal is suspicious — don't trust it.
    let cfPenalty = 0;
    if (proposerHand && totalHands > 1 && initIdxAfter !== -1) {
      const proposerBelief = memo.belief.perTeammate.get(proposerHand.playerId);
      const proposerSelfBelief = proposerBelief?.hands.get(p.initiatorHandId);
      if (proposerSelfBelief) {
        const impliedSlot = initIdxAfter / (totalHands - 1);
        const theirOwnView = proposerSelfBelief.mean;
        // gap = how far their proposed slot is from what their own placements
        // would imply about their hand. Positive = proposing hand is stronger
        // than placement history suggests → suspicious.
        const gap = theirOwnView - (1 - impliedSlot);
        // Raised threshold: board changes legitimately shift hand values, so only
        // penalize large discrepancies. Also only penalize low-skill proposers;
        // high-skill teammates likely have good reasons for updating their view.
        if (gap < -0.30) {
          const proposerSkill = proposerBelief?.skillPrior ?? 0.5;
          cfPenalty = Math.min(0.12, Math.abs(gap) * Math.max(0, 0.7 - proposerSkill));
        }
      }
    }

    const acceptScore: typeof myScore = {
      teamInversionDelta: blendedDelta,
      confidence: Math.max(0, myScore.confidence - cfPenalty * 0.5),
    };
    const initDefer = deferralWeight(memo.belief, signals, p.initiatorHandId);
    // Stubbornness shrinks the auto-accept floor: a stubborn bot with a sharp
    // posterior on its own slot doesn't cave just because someone asked.
    const acceptBoost = coopTraits.agreeableness * 0.3
      + initDefer * 0.2 * coopTraits.trustInTeammates
      + resignation * 0.4
      + coopTraits.trustInTeammates * 0.5 * (1 - 0.25 * coopEffectiveStubbornness);

    // Opponent habit modulation — proposers with a track record of good
    // trades earn more trust; habitual rejectors / overvaluers get less.
    let habitBonus = 0;
    if (proposerHand) {
      const proposerHabits = memo.belief.perTeammate.get(proposerHand.playerId)?.habits;
      if (proposerHabits) {
        const total = proposerHabits.proposalsAccepted + proposerHabits.proposalsRejected;
        if (total > 2) {
          const acceptanceRate = proposerHabits.proposalsAccepted / total;
          habitBonus = (acceptanceRate - 0.5) * 0.2;
        }
        // Overvaluation bias: if they consistently overvalue hands (positive bias),
        // their claim that their hand belongs at a high slot is less credible.
        if (proposerHabits.phasesObserved >= 2) {
          habitBonus -= Math.abs(proposerHabits.overvaluationBias) * 0.25;
        }
      }
    }
    // Hard gate: don't even consider accepting if the trade clearly hurts the
    // team ranking (-0.1 means it creates ~1 inversion). Below this, the
    // acceptBoost should never overcome the negative delta.
    // Strong-accept bonus: if the trade is obviously good (>0.5 inversions fixed),
    // personality quirks shouldn't block it.
    const strongAcceptBonus = blendedDelta > 0.5 ? 0.8 : 0;
    if (blendedDelta > -0.1) {
      candidates.push({
        msg: { type: "acceptChipMove", initiatorHandId: p.initiatorHandId, recipientHandId: p.recipientHandId },
        score: acceptScore,
        utility: utilityFor(acceptScore, traitsM) + acceptBoost + habitBonus + strongAcceptBonus,
      });
    }

    const k = reqKey(p.initiatorHandId, p.recipientHandId);
    if (!memo.recentlyRejected.has(k)) {
      // Confidence-aware reject margin: when my posterior is sharp, reject on
      // smaller deltas (defend the slot); when fuzzy, demand larger evidence
      // before saying no. Stubbornness pulls the margin further down.
      const conf = acceptScore.confidence;
      const rejectMargin = (0.7 - 0.3 * conf) * (1.15 - 0.3 * coopEffectiveStubbornness);
      const rejectU = (-blendedDelta - rejectMargin) * (0.4 + 0.6 * conf)
        + (1 - coopTraits.agreeableness) * 0.25
        - coopTraits.trustInTeammates * 0.3
        + coopEffectiveStubbornness * 0.12;
      candidates.push({
        msg: { type: "rejectChipMove", initiatorHandId: p.initiatorHandId, recipientHandId: p.recipientHandId },
        score: { teamInversionDelta: -blendedDelta, confidence: conf },
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
      // Position match: a hand with strength est should land near slot
      // (1 - est) * (N - 1). Bonus rewards choosing the right neighbourhood.
      const est = memo.estimates.get(h.id) ?? 0.5;
      const idealSlot = (1 - est) * (state.ranking.length - 1);
      const slotAlign = 1 - Math.abs(slot - idealSlot) / Math.max(1, state.ranking.length - 1);
      const posBonus = slotAlign * 0.3 * traitsM.skill;
      candidates.push({
        msg: { type: "move", handId: h.id, toIndex: slot },
        score,
        utility: utilityFor(score, traitsM) + posBonus,
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
          if (score.teamInversionDelta > 0.08) {
            const est = memo.estimates.get(h.id) ?? 0.5;
            const idealSlot = (1 - est) * (state.ranking.length - 1);
            const slotAlign = 1 - Math.abs(slot - idealSlot) / Math.max(1, state.ranking.length - 1);
            const posBonus = slotAlign * 0.15 * traitsM.skill;
            candidates.push({
              msg: { type: "move", handId: h.id, toIndex: slot },
              score,
              utility: utilityFor(score, traitsM) + posBonus,
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
        if (score.teamInversionDelta > 0.08) {
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
      const deferPenalty = defer * 0.5 * coopTraits.trustInTeammates;
      const extraversionBonus = (traitsM.extraversion - 0.5) * 0.2;

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
      const deferPenalty = defer * 0.5 * coopTraits.trustInTeammates;
      const extraversionBonus = (traitsM.extraversion - 0.5) * 0.2;
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
    // Speculative hands (flush/straight draws) — don't commit yet. The hand's
    // true rank will change with the river card, so readying too early locks
    // us into a slot we might regret.
    const readyU = -0.15 + 0.3 * traitsM.decisiveness + 0.1 * memo.mood.focus
      - 0.3 * memo.mood.concern
      + resignation * 1.0 // give up → just lock in what we've got
      - speculativeAdjustment * 0.6; // drawing hands should wait
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
