/**
 * Cooperative-bot decision pipeline.
 *
 *   1. Perception → update BeliefState from public placements + trades.
 *   2. Evaluation → score candidate actions by team-EV (inversion reduction).
 *   3. Selection  → softmax over top actions, modulated by Traits.
 *
 * This is the main entry point for bot decision-making. Called once per bot
 * tick (either timer-driven in production, or synchronously in fast simulation mode).
 */

import type { AcquireRequest, ClientMessage, GameState, Hand } from "../types";
import { currentHandStrength } from "./handStrength";
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
import type { TraceSink, TraceCandidate } from "./trace";

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
  /** Proposal keys we had pending last tick (used to detect rejections). */
  prevMyProposals: Set<string>;
  /** Our own proposals that were rejected this phase (don't re-propose). */
  myRejectedKeys: Set<string>;
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
    prevMyProposals: new Set(),
    myRejectedKeys: new Set(),
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
  meta?: Record<string, unknown>;
};

function reqKey(a: string, b: string): string { return a + "|" + b; }
// ── Teammate placement helpers ──

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
  stubbornness: number,
  confidence: number
): boolean {
  if (overDecisionCap) return false;
  if (resignation >= 0.85) return false;
  const cap = Math.max(2, Math.ceil(tableSize * 0.4));
  if (memo.myProposalsThisPhase >= cap) return false;
  const proposeBar = Math.max(0.75, 0.45 + resignation * 1.2 + stubbornness * 0.3);
  const effectiveDelta = teamInversionDelta * confidence;
  return effectiveDelta > proposeBar;
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

function reasonFor(c: Candidate): string {
  switch (c.msg.type) {
    case "move": {
      const meta = c.meta as { isUnrankedPlacement?: boolean; anchor?: number; slot?: number; ownStrength?: number } | undefined;
      const slot = meta?.slot ?? -1;
      const own = meta?.ownStrength ?? 0.5;
      if ((slot === 0 && own >= 0.85) || ((meta?.anchor ?? 0) > 0)) return "anchor";
      return meta?.isUnrankedPlacement ? "place" : "improveSlot";
    }
    case "swap": return "swap";
    case "acceptChipMove": {
      const meta = c.meta as { blendedDelta?: number; acceptBoost?: number } | undefined;
      const bd = meta?.blendedDelta ?? 0;
      if (bd > 0.5) return "acceptHighEV";
      if (bd >= 0.05) return "accept";
      return "acceptNeutral";
    }
    case "rejectChipMove": {
      const meta = c.meta as { confidence?: number } | undefined;
      return (meta?.confidence ?? 1) < 0.4 ? "rejectLowConf" : "reject";
    }
    case "proposeChipMove": return "propose";
    case "cancelChipMove": return "cancel";
    case "ready": {
      return "readyAllSet";
    }
    case "ding": return "ding";
    case "fuckoff": return "fuckoff";
    case "flip": return "flip";
    default: return c.msg.type;
  }
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

/**
 * Anchor bonus: when our own hand is at the strength extremes, give a
 * placement bump for the matching slot. Top-1 and bottom slot are high-value
 * commitments per the strategy guide.
 *
 * Thresholds scale with the board prior: on a wet board where the average
 * hand is strong we need a higher absolute strength to anchor top, and vice
 * versa. We also relax the gate compared to the old hard 0.85/0.15 cutoffs,
 * which missed top pairs and high cards on small tables.
 */
function anchorBonus(
  ownStrength: number,
  targetSlot: number,
  totalSlots: number,
  leadsConsensus: number,
  boardPrior: number,
): number {
  if (totalSlots <= 1) return 0;
  const lead = 1 + leadsConsensus * 0.4;
  // Top anchor: strong hand relative to the board's average. Min floor of 0.65
  // so noise around boardPrior doesn't over-trigger; max cap of 0.85 for very
  // wet boards.
  const topThresh = Math.max(0.65, Math.min(0.85, boardPrior + 0.25));
  const bottomThresh = Math.min(0.30, Math.max(0.10, boardPrior - 0.25));
  if (ownStrength >= topThresh && targetSlot === 0) return 0.45 * lead;
  if (ownStrength >= topThresh && targetSlot === 1) return 0.38 * lead;
  if (ownStrength <= bottomThresh && targetSlot === totalSlots - 1) return 0.20 * lead;
  return 0;
}

function isAnchorMoveCandidate(c: Candidate): boolean {
  if (c.msg.type !== "move") return false;
  const meta = c.meta as { anchor?: number } | undefined;
  return (meta?.anchor ?? 0) > 0;
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
  opts?: { trace?: TraceSink }
): ClientMessage | null {
  const trace = opts?.trace;

  if (memo.estimatesPhase !== state.phase) {
    if (state.phase === "reveal" && state.trueRanking) {
      updateSkillFromReveal(memo.belief, state, myPlayerId);
    }
    if (trace) {
      const beliefs: Array<{ handId: string; mean: number; confidence: number }> = [];
      for (const h of state.hands) {
        if (h.playerId === myPlayerId) continue;
        const mean = memo.belief.handStrength.get(h.id);
        if (mean === undefined) continue;
        beliefs.push({
          handId: h.id,
          mean,
          confidence: memo.belief.handConfidence.get(h.id) ?? 0,
        });
      }
      trace({ type: "phaseBoundary", phase: state.phase, myPlayerId, beliefs });
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

  // Trace emitter: builds and pushes a DecisionTrace via the optional sink.
  // Captures `resignation` and the current candidates list lazily via closure.
  let traceResignation = 0;
  let traceCandidatesRef: Candidate[] = [];
  const emitDecision = (
    picked: ClientMessage,
    reason: string,
    pickedIndex: number,
    pickedMeta?: Record<string, unknown>,
  ): void => {
    if (!trace) return;
    const sorted = [...traceCandidatesRef].sort((a, b) => b.utility - a.utility).slice(0, 5);
    const candidates: TraceCandidate[] = sorted.map((c) => ({
      msgType: c.msg.type,
      utility: c.utility,
      teamInversionDelta: c.score.teamInversionDelta,
      confidence: c.score.confidence,
      meta: c.meta,
    }));
    const beliefSnapshot: Array<{ handId: string; mean: number; confidence: number }> = [];
    for (const h of state.hands) {
      if (h.playerId === myPlayerId) continue;
      const mean = memo.belief.handStrength.get(h.id);
      if (mean === undefined) continue;
      beliefSnapshot.push({
        handId: h.id,
        mean,
        confidence: memo.belief.handConfidence.get(h.id) ?? 0,
      });
    }
    const myHandsInfo = (state.hands.filter((h) => h.playerId === myPlayerId)).map((h) => ({
      handId: h.id,
      ownStrength: memo.estimates.get(h.id) ?? 0.5,
      slot: state.ranking.indexOf(h.id),
    }));
    trace({
      type: "decision",
      phase: state.phase,
      myPlayerId,
      decisionCount: memo.decisionCount,
      resignation: traceResignation,
      candidates,
      pickedIndex,
      picked,
      reason,
      myHands: myHandsInfo,
      ranking: state.ranking.slice(),
      beliefSnapshot,
      acquireRequests: state.acquireRequests.map((r) => ({ ...r })),
      pickedMeta,
    });
  };

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
        const msg: ClientMessage = { type: "ready", ready: true };
        emitDecision(msg, "readyOverDecisionCap", 0);
        return msg;
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

  const me = state.players.find((p) => p.id === myPlayerId);

  // Resignation rises with rejected/vanished proposals and idle ticks.
  const resignationRaw =
    memo.myRejectedKeys.size * 0.28 +
    Math.min(8, memo.idleTicks) * 0.12 +
    Math.min(10, memo.decisionCount) * 0.05;
  const stubbornness = traits.stubbornness ?? 0.55;
  const resignation = Math.max(0, Math.min(1,
    resignationRaw * (1.2 - 0.4 * traits.conscientiousness - 0.3 * traits.neuroticism - 0.2 * stubbornness)
  ));
  traceResignation = resignation;

  // Effective stubbornness modulated by hand types + cedesEasily quirk.
  const cedesEasily = traits.quirks?.cedesEasily ?? 0;
  let effectiveStubbornness = Math.max(0, stubbornness - cedesEasily * 0.15);
  let speculativeAdjustment = 0;
  for (const [, cls] of memo.classifiedHands) {
    if (cls.madeHandType && cls.madeHandType !== "high-card" && cls.madeHandType !== "pair") {
      effectiveStubbornness = Math.min(1, effectiveStubbornness + 0.1);
    }
    if (cls.isSpeculative) {
      effectiveStubbornness = Math.max(0, effectiveStubbornness - 0.12);
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
    return anchorBonus(s, slot, totalSlots, leadsConsensus, memo.belief.boardPrior);
  };
  // Skeptic quirk: extra reject weight on incoming proposals targeting rank 1.
  const suspectsTop = traits.quirks?.suspectsTop ?? 0;

  const alreadyReady = !!me?.ready;

  const incomingProposal = state.acquireRequests.some((r) => {
    const rh = state.hands.find((h) => h.id === r.recipientHandId);
    return rh && rh.playerId === myPlayerId;
  });
  const outgoingProposal = state.acquireRequests.some((r) => r.initiatorId === myPlayerId);

  const myHandsPlaced = myHands.every((h) => state.ranking.indexOf(h.id) !== -1);
  const othersAllReady = state.players
    .filter((p) => p.id !== myPlayerId && p.connected)
    .every((p) => p.ready);
  const readyDelay = state.phase === "river" ? 8 : state.phase === "turn" ? 5 : 3;
  const readyDelayMet = memo.ticksSinceProgress >= readyDelay;
  const teammatesWaiting = myHandsPlaced && othersAllReady && memo.ticksSinceProgress >= 1;
  const ownAnchorUnsettled = myHands.some((h) => {
    const slot = state.ranking.indexOf(h.id);
    if (slot === -1 || state.ranking.length <= 2) return false;
    const s = memo.estimates.get(h.id) ?? 0.5;
    if (s >= 0.85) return slot > 1;
    if (s <= 0.15) return slot < state.ranking.length - 2;
    return false;
  });

  // Track vanished proposals so the bot can stop re-proposing the same pair.
  const currentMyProposalKeys = new Set<string>();
  for (const r of state.acquireRequests) {
    if (r.initiatorId === myPlayerId) {
      currentMyProposalKeys.add(reqKey(r.initiatorHandId, r.recipientHandId));
    }
  }
  for (const k of memo.prevMyProposals) {
    if (!currentMyProposalKeys.has(k)) {
      memo.myRejectedKeys.add(k);
    }
  }
  memo.prevMyProposals = currentMyProposalKeys;

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
    const baseTrust = traits.trustInTeammates;
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
    // Accept boost — small bias toward "say yes" derived from real personality.
    // Used to be a forced-cooperative override (a=0.75, t=0.75, s=0.35) which
    // pushed even zero-EV proposals over the line. Now it scales with the bot's
    // actual agreeableness and trust, so a Skeptic with a=0.35 and t=0.4 gives
    // ~0.30 of free push, while a Helper with a=0.85 and t=0.85 gives ~0.65.
    const acceptBoost = traits.agreeableness * 0.3
      + initDefer * 0.2 * traits.trustInTeammates
      + resignation * 0.3
      + traits.trustInTeammates * 0.2 * (1 - 0.25 * effectiveStubbornness);

    let habitBonus = 0;
    if (proposerHand) {
      const proposerHabits = memo.belief.perTeammate.get(proposerHand.playerId)?.habits;
      if (proposerHabits && proposerHabits.phasesObserved >= 2) {
        habitBonus -= Math.abs(proposerHabits.overvaluationBias) * 0.25;
      }
    }
    const strongAcceptBonus = blendedDelta > 0.5 ? 0.8 : 0;
    // Confidence-gated reject when blended delta is clearly bad. Independent
    // of the candidate-pool path so a low-stubbornness bot doesn't accept
    // zero-EV proposals just because acceptBoost > |blendedDelta|.
    const confidentRejectGate = blendedDelta * acceptScore.confidence < -0.2;
    if (blendedDelta > 0.05 && !confidentRejectGate) {
      candidates.push({
        msg: { type: "acceptChipMove", initiatorHandId: p.initiatorHandId, recipientHandId: p.recipientHandId },
        score: acceptScore,
        utility: utilityFor(acceptScore, traits) + acceptBoost + habitBonus + strongAcceptBonus,
        meta: {
          blendedDelta,
          acceptBoost,
          habitBonus,
          strongAcceptBonus,
          cfPenalty,
          myInversionDelta: myScore.teamInversionDelta,
          trustedInversionDelta: trustedScore.teamInversionDelta,
          trust,
          initiatorHandId: p.initiatorHandId,
          recipientHandId: p.recipientHandId,
          kind: p.kind,
        },
      });
    }

    const k = reqKey(p.initiatorHandId, p.recipientHandId);
    if (!memo.recentlyRejected.has(k)) {
      const conf = acceptScore.confidence;
      const rejectMargin = (0.7 - 0.3 * conf) * (1.15 - 0.3 * effectiveStubbornness);
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
        + (1 - traits.agreeableness) * 0.25
        - traits.trustInTeammates * 0.3
        + effectiveStubbornness * 0.12
        + topSlotPenalty;
      candidates.push({
        msg: { type: "rejectChipMove", initiatorHandId: p.initiatorHandId, recipientHandId: p.recipientHandId },
        score: { teamInversionDelta: -blendedDelta, confidence: conf },
        utility: rejectU,
        meta: {
          blendedDelta,
          rejectMargin,
          confidence: conf,
          topSlotPenalty,
          initiatorHandId: p.initiatorHandId,
          recipientHandId: p.recipientHandId,
          kind: p.kind,
        },
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
  const myUnrankedEsts = myUnranked.map((h) => memo.estimates.get(h.id) ?? 0.5);
  const minEst = myUnrankedEsts.length > 0 ? Math.min(...myUnrankedEsts) : 0.5;
  const maxEst = myUnrankedEsts.length > 0 ? Math.max(...myUnrankedEsts) : 0.5;
  const ownPlacementPool = myUnranked.length > 1
    ? myUnranked.filter((h) => (memo.estimates.get(h.id) ?? 0.5) === maxEst)
    : myUnranked;
  for (const h of ownPlacementPool) {
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
      // Place strongest first per the strategy guide: "Anchor your own premium
      // hands. Place them high with confidence and build the rest of the board
      // around it." While multiple own hands are unranked, candidates are
      // restricted to the strongest tier; this bonus breaks slot ties inside
      // that pool.
      const isWeakest = est === minEst && myUnranked.length > 1;
      const isStrongest = est === maxEst && myUnranked.length > 1;
      const priorityBonus = isStrongest ? 0.4 : 0;
      candidates.push({
        msg: { type: "move", handId: h.id, toIndex: slot },
        score,
        utility: utilityFor(score, traits) + posBonus + anchor - spread + priorityBonus,
        meta: {
          handId: h.id,
          slot,
          ownStrength: est,
          isUnrankedPlacement: true,
          isWeakest,
          isStrongest,
          anchor,
          priorityBonus,
        },
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
        const est = memo.estimates.get(h.id) ?? 0.5;
        const idealSlot = (1 - est) * (state.ranking.length - 1);
        const slotAlign = 1 - Math.abs(slot - idealSlot) / Math.max(1, state.ranking.length - 1);
        const posBonus = slotAlign * 0.15 * traits.skill;
        const anchor = anchorBonusForOwn(h.id, slot, state.ranking.length);
        if (score.teamInversionDelta > 0.08 || anchor > 0) {
          candidates.push({
            msg: { type: "move", handId: h.id, toIndex: slot },
            score,
            utility: utilityFor(score, traits) + posBonus + anchor,
            meta: {
              handId: h.id,
              slot,
              ownStrength: est,
              isUnrankedPlacement: false,
              anchor,
            },
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
      const deferPenalty = defer * 0.5 * traits.trustInTeammates;
      const extraversionBonus = (traits.extraversion - 0.5) * 0.2;

      const util = utilityFor(score, traits, { teamOnlyBenefit: score.teamInversionDelta })
        - deferPenalty + extraversionBonus;

      if (score.teamInversionDelta * score.confidence > 1.0 || canPropose(memo, resignation, overDecisionCap, score.teamInversionDelta, state.hands.length, effectiveStubbornness, score.confidence)) {
        candidates.push({
          msg: { type: "proposeChipMove", initiatorHandId: h.id, recipientHandId: otherId },
          score,
          utility: util + (score.teamInversionDelta * score.confidence > 1.0 ? 0.5 : 0),
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
      const deferPenalty = defer * 0.5 * traits.trustInTeammates;
      const extraversionBonus = (traits.extraversion - 0.5) * 0.2;
      const util = utilityFor(score, traits, { teamOnlyBenefit: score.teamInversionDelta })
        - deferPenalty + extraversionBonus;
      if (score.teamInversionDelta * score.confidence > 1.0 || canPropose(memo, resignation, overDecisionCap, score.teamInversionDelta, state.hands.length, effectiveStubbornness, score.confidence)) {
        candidates.push({
          msg: { type: "proposeChipMove", initiatorHandId: myH.id, recipientHandId: theirH.id },
          score,
          utility: util + (score.teamInversionDelta * score.confidence > 1.0 ? 0.5 : 0),
        });
      }
    }
  }

  if (
    effectiveAllRanked &&
    !alreadyReady &&
    !outgoingProposal &&
    !incomingProposal &&
    !ownAnchorUnsettled &&
    (readyDelayMet || teammatesWaiting)
  ) {
    const readyU = -0.15 + 0.3 * traits.decisiveness
      - speculativeAdjustment * 0.6
      + (teammatesWaiting ? 0.2 : 0);
    candidates.push({
      msg: { type: "ready", ready: true },
      score: { teamInversionDelta: 0.05, confidence: 0.5 },
      utility: readyU,
      meta: {
        resignation,
        decisionCount: memo.decisionCount,
        effectiveAllRanked: true,
        readyDelayMet,
        teammatesWaiting,
        ownAnchorUnsettled,
      },
    });
  }

  // === 3. SELECTION ===
  traceCandidatesRef = candidates;
  if (candidates.length === 0) {
    memo.idleTicks++;
    return null;
  }

  candidates.sort((a, b) => b.utility - a.utility);

  const haveUnranked = myHands.some((h) => state.ranking.indexOf(h.id) === -1);
  const haveEmpty = state.ranking.some((s) => s === null);
  const mustRespond = proposalsToMe.length > 0;
  let pool = candidates;
  const anchorMoves = !mustRespond ? candidates.filter(isAnchorMoveCandidate) : [];
  const stalePropToMe = mustRespond && memo.prevAcquireRequests.some((p) => {
    const rh = state.hands.find((h) => h.id === p.recipientHandId);
    return rh && rh.playerId === myPlayerId && state.acquireRequests.some(
      (cur) => cur.initiatorHandId === p.initiatorHandId && cur.recipientHandId === p.recipientHandId
    );
  });
  if (anchorMoves.length > 0) {
    pool = anchorMoves;
  } else if (stalePropToMe) {
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

  // Honest misread: bot picks the second-best action when the gap to first is
  // small. Humans don't randomly pick suboptimally regardless of context — so
  // we restrict to genuine ties and scale the probability by (1 - skill) so
  // higher-skill bots almost never misread tight calls.
  const honestMisreadGate = top.length >= 2 && gap < 0.15;
  const honestMisread = honestMisreadGate &&
    Math.random() < Math.min(0.04, (1 - traits.skill) * 0.06);
  if (honestMisread) {
    memo.decisionCount++;
    memo.idleTicks = 0;
    commitAction(memo, top[1].msg);
    emitDecision(top[1].msg, "honestMisread", 1, top[1].meta);
    return top[1].msg;
  }

  const tempBase = (1 - traits.skill) * 0.4;
  const temperature = tempBase * difficulty + 0.05;
  const scores = top.map((c) => c.utility);
  const pick = softmaxPick(top, scores, temperature);

  memo.decisionCount++;
  memo.idleTicks = 0;
  commitAction(memo, pick.msg);
  const pickedIdx = top.indexOf(pick);
  emitDecision(pick.msg, reasonFor(pick), pickedIdx === -1 ? 0 : pickedIdx, pick.meta);

  if (pick.msg.type === "rejectChipMove") {
    memo.recentlyRejected.add(reqKey(pick.msg.initiatorHandId, pick.msg.recipientHandId));
  }

  return pick.msg;
}
