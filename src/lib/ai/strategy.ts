import type { Card, ClientMessage, GameState, Hand } from "../types";
import { estimateStrength } from "./handStrength";
import type { Personality } from "./personality";

export type BotMemo = {
  estimates: Map<string, number>;
  estimatesPhase: string;       // phase when estimates were computed
  lastActionPhase: string;       // phase we last took an action in
  idleTicks: number;             // consecutive ticks with no action in current phase
  decisionCount: number;         // total decisions in current phase (soft cap)
  recentlyRejected: Set<string>; // initiatorHandId|recipientHandId pairs we rejected
};

export function newBotMemo(): BotMemo {
  return {
    estimates: new Map(),
    estimatesPhase: "",
    lastActionPhase: "",
    idleTicks: 0,
    decisionCount: 0,
    recentlyRejected: new Set(),
  };
}

function desiredSlotFor(estimate: number, totalHands: number): number {
  if (totalHands <= 1) return 0;
  // 0 = best (top), totalHands-1 = worst (bottom)
  const idx = Math.round((1 - estimate) * (totalHands - 1));
  return Math.max(0, Math.min(totalHands - 1, idx));
}

function getEstimate(
  memo: BotMemo,
  hand: Hand,
  board: Card[],
  fieldSize: number,
  nSims: number
): number {
  const cached = memo.estimates.get(hand.id);
  if (cached !== undefined) return cached;
  const est = estimateStrength(hand.cards, board, fieldSize, nSims);
  memo.estimates.set(hand.id, est);
  return est;
}

function reqKey(initiatorHandId: string, recipientHandId: string): string {
  return initiatorHandId + "|" + recipientHandId;
}

export function decideAction(
  state: GameState,
  myPlayerId: string,
  personality: Personality,
  memo: BotMemo,
  opts?: { nSims?: number }
): ClientMessage | null {
  const nSims = opts?.nSims ?? 40;

  // Phase change — invalidate memo
  if (memo.estimatesPhase !== state.phase) {
    memo.estimates.clear();
    memo.estimatesPhase = state.phase;
    memo.idleTicks = 0;
    memo.decisionCount = 0;
    memo.recentlyRejected.clear();
    memo.lastActionPhase = state.phase;
  }

  const myHands = state.hands.filter((h) => h.playerId === myPlayerId);
  if (myHands.length === 0) return null;

  // Reveal — flip my hand (or help disconnected owners)
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

    if (owner.id === myPlayerId) {
      return { type: "flip", handId: handToFlipId };
    }
    if (!owner.connected) {
      // Help out: lowest-id bot that is currently in players[] takes it.
      // We don't know which players are bots from masked state, but this
      // bot will simply compete — whoever fires first wins; server is
      // idempotent on the revealIndex check.
      const connectedIds = state.players
        .filter((p) => p.connected)
        .map((p) => p.id)
        .sort();
      if (connectedIds[0] === myPlayerId) {
        return { type: "flip", handId: handToFlipId };
      }
    }
    return null;
  }

  if (state.phase === "lobby") return null;

  const gamePhases = ["preflop", "flop", "turn", "river"];
  if (!gamePhases.includes(state.phase)) return null;

  if (memo.decisionCount > 40) {
    // Hard stop — ready up if possible, otherwise do nothing.
    if (state.ranking.every((s) => s !== null)) {
      const me = state.players.find((p) => p.id === myPlayerId);
      if (me && !me.ready) return { type: "ready", ready: true };
    }
    return null;
  }

  const board = state.communityCards;
  const fieldSize = Math.max(1, state.hands.length - myHands.length);
  const totalHands = state.hands.length;

  // Prime estimates for my hands
  for (const h of myHands) {
    getEstimate(memo, h, board, fieldSize, nSims);
  }

  const me = state.players.find((p) => p.id === myPlayerId);

  // === 1. Respond to pending proposals aimed at me ===
  const proposalsToMe = state.acquireRequests.filter((r) => {
    const rh = state.hands.find((h) => h.id === r.recipientHandId);
    return rh && rh.playerId === myPlayerId;
  });

  for (const p of proposalsToMe) {
    const recipientHand = state.hands.find((h) => h.id === p.recipientHandId)!;
    const myEst = getEstimate(memo, recipientHand, board, fieldSize, nSims);
    const myDesired = desiredSlotFor(myEst, totalHands);
    const idxRecipient = state.ranking.indexOf(p.recipientHandId);
    const idxInitiator = state.ranking.indexOf(p.initiatorHandId);

    let currentSlot: number | null = idxRecipient === -1 ? null : idxRecipient;
    let afterSlot: number | null;

    if (p.kind === "acquire") {
      // initiator unranked, recipient ranked. After accept: recipient unranked.
      afterSlot = null;
    } else if (p.kind === "offer") {
      // initiator ranked, recipient unranked. After accept: recipient takes initiator slot.
      afterSlot = idxInitiator;
    } else {
      // swap
      afterSlot = idxInitiator;
    }

    // Unranked = no chip, can't score → strictly worse than any ranked slot.
    const unrankedPenalty = totalHands;
    const currentError = currentSlot === null
      ? unrankedPenalty
      : Math.abs(currentSlot - myDesired);
    const afterError = afterSlot === null
      ? unrankedPenalty
      : Math.abs(afterSlot - myDesired);

    // Accept any strict improvement; stubbornness just adds occasional
    // drama by rejecting even some good trades.
    if (afterError < currentError) {
      if (Math.random() > personality.stubbornness * 0.4) {
        memo.decisionCount++;
        memo.idleTicks = 0;
        return {
          type: "acceptChipMove",
          initiatorHandId: p.initiatorHandId,
          recipientHandId: p.recipientHandId,
        };
      }
    }
    // Reject once; remember so we don't spam
    const k = reqKey(p.initiatorHandId, p.recipientHandId);
    if (!memo.recentlyRejected.has(k)) {
      memo.recentlyRejected.add(k);
      memo.decisionCount++;
      memo.idleTicks = 0;
      return {
        type: "rejectChipMove",
        initiatorHandId: p.initiatorHandId,
        recipientHandId: p.recipientHandId,
      };
    }
  }

  // === 2. Cancel my own stale proposals ===
  const myProposals = state.acquireRequests.filter((r) => r.initiatorId === myPlayerId);
  for (const p of myProposals) {
    const initiatorHand = state.hands.find((h) => h.id === p.initiatorHandId);
    if (!initiatorHand || initiatorHand.playerId !== myPlayerId) continue;
    const est = getEstimate(memo, initiatorHand, board, fieldSize, nSims);
    const desired = desiredSlotFor(est, totalHands);
    const idxInit = state.ranking.indexOf(p.initiatorHandId);
    const idxRec = state.ranking.indexOf(p.recipientHandId);

    // If the proposal no longer improves my placement, cancel.
    const unrankedPenalty = totalHands;
    let currentErr: number, afterErr: number;
    if (p.kind === "acquire") {
      currentErr = unrankedPenalty; // my hand currently unranked
      afterErr = idxRec === -1 ? unrankedPenalty : Math.abs(idxRec - desired);
    } else if (p.kind === "offer") {
      currentErr = idxInit === -1 ? unrankedPenalty : Math.abs(idxInit - desired);
      afterErr = unrankedPenalty;
    } else {
      currentErr = idxInit === -1 ? unrankedPenalty : Math.abs(idxInit - desired);
      afterErr = idxRec === -1 ? unrankedPenalty : Math.abs(idxRec - desired);
    }
    if (afterErr >= currentErr) {
      memo.decisionCount++;
      memo.idleTicks = 0;
      return {
        type: "cancelChipMove",
        initiatorHandId: p.initiatorHandId,
        recipientHandId: p.recipientHandId,
      };
    }
  }

  // === 3. Place an unranked hand into the empty slot closest to its desired slot ===
  const myUnranked = myHands.filter((h) => state.ranking.indexOf(h.id) === -1);
  const emptySlots: number[] = [];
  for (let i = 0; i < state.ranking.length; i++) {
    if (state.ranking[i] === null) emptySlots.push(i);
  }

  if (myUnranked.length > 0 && emptySlots.length > 0) {
    // Sort my unranked hands by "how picky they are" — strongest/weakest first.
    // Take the one with the most extreme estimate (clearer desired slot).
    const sorted = [...myUnranked].sort((a, b) => {
      const ea = memo.estimates.get(a.id) ?? 0.5;
      const eb = memo.estimates.get(b.id) ?? 0.5;
      return Math.abs(eb - 0.5) - Math.abs(ea - 0.5);
    });
    const h = sorted[0];
    const est = memo.estimates.get(h.id) ?? 0.5;
    const desired = desiredSlotFor(est, totalHands);
    let best = emptySlots[0];
    let bestDist = Math.abs(best - desired);
    for (const s of emptySlots) {
      const d = Math.abs(s - desired);
      if (d < bestDist) {
        best = s;
        bestDist = d;
      }
    }
    memo.decisionCount++;
    memo.idleTicks = 0;
    return { type: "move", handId: h.id, toIndex: best };
  }

  // === 4. Fix a misplaced pair of own ranked hands ===
  const myRanked = myHands
    .map((h) => ({ h, idx: state.ranking.indexOf(h.id) }))
    .filter((x) => x.idx !== -1);

  for (let i = 0; i < myRanked.length; i++) {
    for (let j = i + 1; j < myRanked.length; j++) {
      const a = myRanked[i], b = myRanked[j];
      const ea = memo.estimates.get(a.h.id) ?? 0.5;
      const eb = memo.estimates.get(b.h.id) ?? 0.5;
      // Lower idx = better slot. If a is in lower idx but b is stronger, swap.
      if ((a.idx < b.idx && eb > ea + 0.1) || (a.idx > b.idx && ea > eb + 0.1)) {
        memo.decisionCount++;
        memo.idleTicks = 0;
        return { type: "swap", handIdA: a.h.id, handIdB: b.h.id };
      }
    }
  }

  // === 5. Propose a chip move to a teammate's hand ===
  // Only once per tick with aggression probability.
  if (Math.random() < personality.aggression * 0.6) {
    // For each of my ranked hands, see if there's another slot I'd rather be in.
    const candidates: Array<{ mine: Hand; myIdx: number; targetIdx: number; targetHandId: string; gap: number }> = [];
    for (const h of myHands) {
      const est = memo.estimates.get(h.id) ?? 0.5;
      const desired = desiredSlotFor(est, totalHands);
      const myIdx = state.ranking.indexOf(h.id);
      const currentErr = myIdx === -1 ? (totalHands - 1) : Math.abs(myIdx - desired);
      // Look at all other-player ranked slots
      for (let s = 0; s < state.ranking.length; s++) {
        const otherHandId = state.ranking[s];
        if (!otherHandId) continue;
        const otherHand = state.hands.find((x) => x.id === otherHandId);
        if (!otherHand || otherHand.playerId === myPlayerId) continue;
        const targetErr = Math.abs(s - desired);
        const gap = currentErr - targetErr;
        if (gap > 0.6) {
          // Skip if an active proposal already exists on this pair from me
          const already = state.acquireRequests.some(
            (r) =>
              r.initiatorId === myPlayerId &&
              r.initiatorHandId === h.id &&
              r.recipientHandId === otherHandId
          );
          if (already) continue;
          // Skip if the recipient slot already has a pending proposal from someone else
          const taken = state.acquireRequests.some(
            (r) => r.recipientHandId === otherHandId && r.initiatorId !== myPlayerId
          );
          if (taken) continue;
          candidates.push({
            mine: h,
            myIdx,
            targetIdx: s,
            targetHandId: otherHandId,
            gap,
          });
        }
      }
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.gap - a.gap);
      const pick = candidates[0];
      memo.decisionCount++;
      memo.idleTicks = 0;
      return {
        type: "proposeChipMove",
        initiatorHandId: pick.mine.id,
        recipientHandId: pick.targetHandId,
      };
    }
  }

  // === 6. Ready up ===
  const allRanked = state.ranking.every((s) => s !== null);
  const noPendingForMe = proposalsToMe.length === 0;
  const alreadyReady = !!me?.ready;

  if (allRanked && noPendingForMe && !alreadyReady) {
    // If my estimates haven't shifted meaningfully (they were cached this phase), ready up.
    if (memo.idleTicks >= 1) {
      memo.decisionCount++;
      memo.idleTicks = 0;
      return { type: "ready", ready: true };
    }
  }

  // Force ready after ~6 idle ticks to prevent stalls.
  if (allRanked && !alreadyReady && memo.idleTicks >= 6) {
    memo.decisionCount++;
    memo.idleTicks = 0;
    return { type: "ready", ready: true };
  }

  // === 7. Idle ding ===
  if (Math.random() < personality.chaos * 0.05) {
    memo.idleTicks++;
    return { type: "ding" };
  }

  memo.idleTicks++;
  return null;
}
