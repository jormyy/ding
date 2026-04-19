// Cooperative-bot pipeline.
//
//   1. Perception → update BeliefState from public placements.
//   2. Evaluation → score candidate actions by team-EV (inversion reduction).
//   3. Selection  → softmax over top actions, modulated by Traits + Mood.

import type { ClientMessage, GameState, Hand } from "../types";
import { estimateStrength } from "./handStrength";
import type { Traits } from "./personality";
import {
  newBeliefState,
  perceiveState,
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
  lastActionPhase: string;
  idleTicks: number;
  decisionCount: number;
  recentlyRejected: Set<string>;
  belief: BeliefState;
  mood: Mood;
  lastRankingSig: string;
};

export function newBotMemo(): BotMemo {
  return {
    estimates: new Map(),
    estimatesPhase: "",
    lastActionPhase: "",
    idleTicks: 0,
    decisionCount: 0,
    recentlyRejected: new Set(),
    belief: newBeliefState(),
    mood: newMood(),
    lastRankingSig: "",
  };
}

type Candidate = {
  msg: ClientMessage;
  score: ActionScore;
  utility: number;
};

function reqKey(a: string, b: string): string { return a + "|" + b; }
function rankingSig(r: (string | null)[]): string { return r.map((x) => x ?? "_").join(","); }

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
    memo.estimates.clear();
    memo.estimatesPhase = state.phase;
    memo.idleTicks = 0;
    memo.decisionCount = 0;
    memo.recentlyRejected.clear();
    memo.lastActionPhase = state.phase;
    beliefOnPhaseBoundary(memo.belief, state.phase);
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

  if (memo.decisionCount > 40) {
    if (state.ranking.every((s) => s !== null)) {
      const me = state.players.find((p) => p.id === myPlayerId);
      if (me && !me.ready) return { type: "ready", ready: true };
    }
    return null;
  }

  const myHands = state.hands.filter((h) => h.playerId === myPlayerId);
  if (myHands.length === 0) return null;

  const board = state.communityCards;
  const fieldSize = Math.max(1, state.hands.length - myHands.length);

  for (const h of myHands) getEstimate(memo, h, board, fieldSize, nSims);

  // === 1. PERCEPTION ===
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

  // === 2. EVALUATION ===
  const candidates: Candidate[] = [];

  const proposalsToMe = state.acquireRequests.filter((r) => {
    const rh = state.hands.find((h) => h.id === r.recipientHandId);
    return rh && rh.playerId === myPlayerId;
  });

  for (const p of proposalsToMe) {
    const after = rankingAfterChipMove(state.ranking, p.initiatorHandId, p.recipientHandId, p.kind);
    const score = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates);
    const initDefer = deferralWeight(memo.belief, signals, p.initiatorHandId);
    const acceptBoost = traitsM.agreeableness * 0.3 + initDefer * 0.2 * traitsM.trustInTeammates;
    candidates.push({
      msg: { type: "acceptChipMove", initiatorHandId: p.initiatorHandId, recipientHandId: p.recipientHandId },
      score,
      utility: utilityFor(score, traitsM) + acceptBoost,
    });

    const k = reqKey(p.initiatorHandId, p.recipientHandId);
    if (!memo.recentlyRejected.has(k)) {
      const rejectU = -score.teamInversionDelta * (0.4 + 0.6 * score.confidence)
        + (1 - traitsM.agreeableness) * 0.25;
      candidates.push({
        msg: { type: "rejectChipMove", initiatorHandId: p.initiatorHandId, recipientHandId: p.recipientHandId },
        score: { teamInversionDelta: -score.teamInversionDelta, confidence: score.confidence },
        utility: rejectU,
      });
    }
  }

  for (const p of state.acquireRequests.filter((r) => r.initiatorId === myPlayerId)) {
    const after = rankingAfterChipMove(state.ranking, p.initiatorHandId, p.recipientHandId, p.kind);
    const score = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates);
    if (score.teamInversionDelta <= 0.05) {
      candidates.push({
        msg: { type: "cancelChipMove", initiatorHandId: p.initiatorHandId, recipientHandId: p.recipientHandId },
        score: { teamInversionDelta: 0.1, confidence: score.confidence },
        utility: 0.15,
      });
    }
  }

  const emptySlots: number[] = [];
  for (let i = 0; i < state.ranking.length; i++) if (state.ranking[i] === null) emptySlots.push(i);
  const myUnranked = myHands.filter((h) => state.ranking.indexOf(h.id) === -1);
  for (const h of myUnranked) {
    for (const slot of emptySlots) {
      const after = rankingAfterMove(state.ranking, h.id, slot);
      const score = scoreAction(state, after, myPlayerId, memo.belief, memo.estimates);
      candidates.push({
        msg: { type: "move", handId: h.id, toIndex: slot },
        score,
        utility: utilityFor(score, traitsM),
      });
    }
  }

  if (emptySlots.length > 0) {
    for (const h of myHands) {
      const from = state.ranking.indexOf(h.id);
      if (from === -1) continue;
      for (const slot of emptySlots) {
        const after = rankingAfterMove(state.ranking, h.id, slot);
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

      if (score.teamInversionDelta > 0.3) {
        candidates.push({
          msg: { type: "proposeChipMove", initiatorHandId: h.id, recipientHandId: otherId },
          score,
          utility: util,
        });
      }
    }
  }

  const allRanked = state.ranking.every((s) => s !== null);
  const alreadyReady = !!me?.ready;
  if (allRanked && proposalsToMe.length === 0 && !alreadyReady) {
    const readyU = 0.2 + 0.4 * traitsM.decisiveness + 0.2 * memo.mood.focus
      - 0.3 * memo.mood.concern;
    candidates.push({
      msg: { type: "ready", ready: true },
      score: { teamInversionDelta: 0.05, confidence: 0.5 },
      utility: readyU,
    });
  }

  if (allRanked && !alreadyReady && memo.idleTicks >= 6) {
    return { type: "ready", ready: true };
  }

  // === 3. SELECTION ===
  if (candidates.length === 0) {
    if (Math.random() < (1 - traitsM.conscientiousness) * 0.04) {
      memo.idleTicks++;
      return { type: "ding" };
    }
    memo.idleTicks++;
    return null;
  }

  candidates.sort((a, b) => b.utility - a.utility);
  const top = candidates.slice(0, 3);

  if (top[0].utility <= 0 && top[0].msg.type !== "ready") {
    memo.idleTicks++;
    return null;
  }

  const difficulty = Math.min(
    1,
    (top[0].utility - (top[top.length - 1]?.utility ?? 0)) < 0.1 ? 1 : 0.4
  );
  const honestMisread = Math.random() < (1 - traitsM.skill) * 0.08;
  if (honestMisread && top.length >= 2) {
    memo.decisionCount++;
    memo.idleTicks = 0;
    return top[1].msg;
  }

  const temperature = (1 - traitsM.skill) * 0.5 + memo.mood.concern * 0.4 + difficulty * 0.1;
  const scores = top.map((c) => c.utility);
  const pick = softmaxPick(top, scores, temperature);

  memo.decisionCount++;
  memo.idleTicks = 0;

  if (pick.msg.type === "rejectChipMove") {
    memo.recentlyRejected.add(reqKey(pick.msg.initiatorHandId, pick.msg.recipientHandId));
  }

  // nSims is referenced above via getEstimate; silence unused-warning for cases
  // where every estimate was already cached.
  void nSims;

  return pick.msg;
}
