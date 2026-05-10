import type { BotActionAudit, BotActionLogEntry, Card, Phase } from "../src/lib/types";
import { currentHandStrength, preflopTierStrength } from "../src/lib/ai/handStrength";
import type { ServerGameState } from "./state";

const RANKING_PHASES: Phase[] = ["preflop", "flop", "turn", "river"];

type AuditContext = {
  entries: BotActionLogEntry[];
  index: number;
};

function verdict(explanation: string): BotActionAudit {
  return { verdict: "deviation", explanation };
}

function ok(explanation: string): BotActionAudit {
  return { verdict: "plausible", explanation };
}

function cardKey(c: Card): string {
  return c.rank + c.suit;
}

function cardsText(cards: Card[]): string {
  return cards.map(cardKey).join(" ");
}

function actorCards(entry: BotActionLogEntry, handId: string): Card[] {
  return entry.actorHoleCards[handId] ?? [];
}

function ownStrength(entry: BotActionLogEntry, handId: string): number | null {
  const cards = actorCards(entry, handId);
  if (cards.length !== 2) return null;
  return entry.phase === "preflop"
    ? preflopTierStrength(cards)
    : currentHandStrength(cards, entry.communityCards);
}

function expectedSlot(strength: number, slots: number): number {
  return Math.round((1 - strength) * Math.max(1, slots - 1));
}

function trueInversions(
  ranking: (string | null)[],
  trueRanks: Record<string, number>
): number {
  let count = 0;
  for (let i = 0; i < ranking.length; i++) {
    const a = ranking[i];
    if (!a) continue;
    for (let j = i + 1; j < ranking.length; j++) {
      const b = ranking[j];
      if (!b) continue;
      const ar = trueRanks[a];
      const br = trueRanks[b];
      if (ar === undefined || br === undefined || ar === br) continue;
      if (ar > br) count++;
    }
  }
  return count;
}

function firstBotActionInPhase(ctx: AuditContext, entry: BotActionLogEntry): boolean {
  return !ctx.entries.slice(0, ctx.index).some((prior) => prior.phase === entry.phase);
}

function previousAppliedMoveForHand(
  ctx: AuditContext,
  entry: BotActionLogEntry,
  handId: string
): BotActionLogEntry | null {
  for (let i = ctx.index - 1; i >= 0; i--) {
    const prior = ctx.entries[i];
    if (prior.phase !== entry.phase || !prior.applied) continue;
    if (prior.action.type === "move" && prior.action.handId === handId) return prior;
  }
  return null;
}

function nextAppliedMoveForHand(
  ctx: AuditContext,
  entry: BotActionLogEntry,
  handId: string
): BotActionLogEntry | null {
  for (let i = ctx.index + 1; i < ctx.entries.length; i++) {
    const next = ctx.entries[i];
    if (next.phase !== entry.phase) break;
    if (!next.applied) continue;
    if (next.action.type === "move" && next.action.handId === handId) return next;
  }
  return null;
}

function previousReadyForPlayer(ctx: AuditContext, entry: BotActionLogEntry): BotActionLogEntry | null {
  for (let i = ctx.index - 1; i >= 0; i--) {
    const prior = ctx.entries[i];
    if (prior.phase !== entry.phase) break;
    if (prior.playerId === entry.playerId && prior.action.type === "ready" && prior.action.ready) return prior;
  }
  return null;
}

function previousAppliedPlacementForHand(
  ctx: AuditContext,
  _entry: BotActionLogEntry,
  handId: string
): BotActionLogEntry | null {
  for (let i = ctx.index - 1; i >= 0; i--) {
    const prior = ctx.entries[i];
    if (!RANKING_PHASES.includes(prior.phase)) continue;
    if (!prior.applied) continue;
    if (prior.action.type === "move" && prior.action.handId === handId) return prior;
  }
  return null;
}

function phaseHasLaterMoveByPlayer(ctx: AuditContext, entry: BotActionLogEntry): boolean {
  for (let i = ctx.index + 1; i < ctx.entries.length; i++) {
    const next = ctx.entries[i];
    if (next.phase !== entry.phase) break;
    if (next.playerId !== entry.playerId || !next.applied) continue;
    if (next.action.type === "move" || next.action.type === "swap" || next.action.type === "proposeChipMove") {
      return true;
    }
  }
  return false;
}

function auditTiming(entry: BotActionLogEntry, ctx: AuditContext): BotActionAudit | null {
  if (!RANKING_PHASES.includes(entry.phase)) return null;
  if (entry.action.type === "move" && firstBotActionInPhase(ctx, entry)) {
    const emptyBoard = entry.rankingBefore.every((slot) => slot === null);
    if (emptyBoard && entry.phaseElapsedMs !== null && entry.phaseElapsedMs < 800) {
      return verdict("Bot opened an empty ranking phase too quickly; competent players wait a beat for teammate signals.");
    }
  }
  if (entry.action.type === "ready" && entry.action.ready) {
    if (entry.phaseElapsedMs !== null && entry.phaseElapsedMs < 1500) {
      return verdict("Bot readied almost immediately; timing suggests it did not wait-and-watch or review the board.");
    }
    if (phaseHasLaterMoveByPlayer(ctx, entry)) {
      return verdict("Bot marked ready before it was actually done adjusting its board.");
    }
  }
  return null;
}

function auditMove(entry: BotActionLogEntry, state: ServerGameState, ctx: AuditContext): BotActionAudit {
  const action = entry.action;
  if (action.type !== "move") return ok("Non-placement action reviewed by another audit rule.");

  const hand = state.hands.find((h) => h.id === action.handId);
  if (!hand || hand.playerId !== entry.playerId) {
    return verdict("Bot tried to move a chip it did not own.");
  }

  const strength = ownStrength(entry, hand.id);
  if (strength === null) {
    return verdict("Bot moved one of its hands without hole-card evidence in the audit log.");
  }

  const totalSlots = entry.rankingBefore.length;
  const ideal = expectedSlot(strength, totalSlots);
  const drift = Math.abs(action.toIndex - ideal);
  const n = Math.max(1, totalSlots - 1);
  const cards = cardsText(actorCards(entry, hand.id));

  if (entry.phase === "preflop") {
    if (strength >= 0.8 && action.toIndex > Math.max(1, Math.ceil(n * 0.25))) {
      return verdict(`Premium preflop hand ${cards} was not anchored near the top.`);
    }
    if (strength <= 0.08 && action.toIndex < Math.floor(n * 0.65)) {
      return verdict(`Bottom-tier preflop hand ${cards} was not communicated as a bottom anchor.`);
    }
    if (drift > Math.max(2, Math.ceil(n * 0.40))) {
      return verdict(`Preflop placement of ${cards} was too far from the official tier slot.`);
    }
  } else {
    if (strength >= 0.72 && action.toIndex > Math.max(1, Math.ceil(n * 0.35))) {
      return verdict(`Strong made hand ${cards} was not placed high enough for the visible board.`);
    }
    if (strength <= 0.25 && action.toIndex < Math.floor(n * 0.45)) {
      return verdict(`Weak/no-made hand ${cards} was pushed too high instead of communicating actual current strength.`);
    }
    if (drift > Math.max(2, Math.ceil(n * 0.50))) {
      return verdict(`Placement of ${cards} was far from its current made-hand strength on this board.`);
    }
  }

  const priorMove = previousAppliedMoveForHand(ctx, entry, hand.id);
  if (priorMove?.action.type === "move") {
    const previousSlot = priorMove.action.toIndex;
    if (previousSlot !== action.toIndex) {
      const movedDown = action.toIndex > previousSlot;
      const movedUp = action.toIndex < previousSlot;
      if ((strength >= 0.65 && movedDown) || (strength <= 0.30 && movedUp)) {
        return verdict("Bot churned its own placed chip in the wrong direction for its known hand strength.");
      }
      if (Math.abs(action.toIndex - previousSlot) > 1 && entry.phase !== "river") {
        return verdict("Bot made a large same-phase reshuffle without new board information.");
      }
    }
  }

  const nextMove = nextAppliedMoveForHand(ctx, entry, hand.id);
  if (nextMove?.action.type === "move" && nextMove.action.toIndex !== action.toIndex) {
    return verdict("Bot placement was not stable; it later moved the same chip again in this phase.");
  }

  const priorPhaseMove = previousAppliedPlacementForHand(ctx, entry, hand.id);
  if (priorPhaseMove?.action.type === "move" && priorPhaseMove.phase !== entry.phase) {
    const priorSlot = priorPhaseMove.action.toIndex;
    const slotJump = Math.abs(action.toIndex - priorSlot);
    const clearlyChanged = strength >= 0.62 || strength <= 0.25;
    if (slotJump > 1 && !clearlyChanged) {
      return verdict("Bot broke cross-phase order preservation without a clear made-hand reason.");
    }
  }

  if (state.trueRanks && entry.phase === "river") {
    const trueRank = state.trueRanks[hand.id];
    if (trueRank !== undefined) {
      const trueSlot = trueRank - 1;
      const truthDrift = Math.abs(action.toIndex - trueSlot);
      if (truthDrift > Math.max(2, Math.ceil(totalSlots * 0.30))) {
        return verdict("River placement was far from the completed-board result for the bot's own known hand.");
      }
    }
  }

  return ok(`Placement of ${cards} is consistent with visible hand strength, phase timing, and order stability.`);
}

function auditReady(entry: BotActionLogEntry, ctx: AuditContext): BotActionAudit {
  if (entry.action.type !== "ready") return ok("Non-ready action reviewed by another audit rule.");
  if (!entry.action.ready) return ok("Unready action is allowed when the board changes.");

  if (entry.rankingBefore.some((slot) => slot === null)) {
    return verdict("Bot readied while the board still had empty slots.");
  }

  if (previousReadyForPlayer(ctx, entry)) {
    return verdict("Bot sent duplicate ready actions in the same phase.");
  }

  const phaseEntries = ctx.entries.filter((e, i) =>
    i < ctx.index && e.phase === entry.phase && e.playerId === entry.playerId && e.applied
  );
  const reviewedSomething = phaseEntries.some((e) =>
    e.action.type === "move" ||
    e.action.type === "swap" ||
    e.action.type === "acceptChipMove" ||
    e.action.type === "rejectChipMove"
  );
  if (!reviewedSomething) {
    return verdict("Bot readied without any logged placement, trade response, or review action in this phase.");
  }

  return ok("Ready timing is plausible: board complete, no later adjustments, and the bot acted/reviewed first.");
}

function auditTrade(entry: BotActionLogEntry, state: ServerGameState): BotActionAudit {
  const action = entry.action;
  if (
    action.type !== "proposeChipMove" &&
    action.type !== "acceptChipMove" &&
    action.type !== "rejectChipMove" &&
    action.type !== "cancelChipMove"
  ) {
    return ok("Non-trade action reviewed by another audit rule.");
  }

  const initiatorSlot = "initiatorHandId" in action
    ? entry.rankingBefore.indexOf(action.initiatorHandId)
    : -1;
  const recipientSlot = "recipientHandId" in action
    ? entry.rankingBefore.indexOf(action.recipientHandId)
    : -1;
  const totalSlots = Math.max(1, entry.rankingBefore.length - 1);
  const slotGap = initiatorSlot === -1 || recipientSlot === -1
    ? 0
    : Math.abs(initiatorSlot - recipientSlot) / totalSlots;

  if (action.type === "proposeChipMove") {
    const initiatorStrength = ownStrength(entry, action.initiatorHandId);
    const expected = initiatorStrength === null ? null : expectedSlot(initiatorStrength, entry.rankingBefore.length);
    const afterSlot = entry.rankingAfter.indexOf(action.initiatorHandId);
    if (slotGap > 0.45) {
      return verdict("Acquire request was too lopsided to look like a proportionate team signal.");
    }
    if (expected !== null && afterSlot !== -1 && Math.abs(afterSlot - expected) > Math.max(2, Math.ceil(totalSlots * 0.40))) {
      return verdict("Acquire request would move the bot's known hand far from its visible strength.");
    }
    if (entry.phaseElapsedMs !== null && entry.phaseElapsedMs < 1200) {
      return verdict("Bot proposed a trade before giving teammates time to place or signal.");
    }
    return ok("Trade proposal is proportionate, timed after observation, and tied to a plausible board improvement.");
  }

  if (action.type === "acceptChipMove") {
    const before = state.trueRanks ? trueInversions(entry.rankingBefore, state.trueRanks) : null;
    const after = state.trueRanks ? trueInversions(entry.rankingAfter, state.trueRanks) : null;
    if (slotGap > 0.50) {
      return verdict("Bot accepted a wildly lopsided chip move.");
    }
    if (before !== null && after !== null && after > before + 1) {
      return verdict("Bot accepted a trade that materially worsened the final known board.");
    }
    return ok("Trade acceptance is proportionate and does not create an obvious board-quality regression.");
  }

  if (action.type === "rejectChipMove") {
    const pendingBefore = entry.acquireRequestsBefore.some((request) =>
      request.initiatorHandId === action.initiatorHandId &&
      request.recipientHandId === action.recipientHandId
    );
    if (!pendingBefore) {
      return verdict("Bot rejected a trade that was not pending in the server state.");
    }
    if (slotGap <= 0.20 && state.trueRanks) {
      const before = trueInversions(entry.rankingBefore, state.trueRanks);
      const after = trueInversions(entry.rankingAfter, state.trueRanks);
      if (after < before) {
        return verdict("Bot rejected a close, board-improving trade without a plausible reason.");
      }
    }
    return ok("Trade rejection is plausible: no outrageous missed improvement is evident.");
  }

  return ok("Trade cancellation is plausible for stale or non-improving proposals.");
}

function auditFlip(entry: BotActionLogEntry): BotActionAudit {
  if (entry.action.type !== "flip") return ok("Non-flip action reviewed by another audit rule.");
  return ok("Reveal action follows the server-enforced worst-to-best flip flow.");
}

export function auditBotAction(
  entry: BotActionLogEntry,
  state: ServerGameState,
  ctx: AuditContext
): BotActionAudit {
  if (!entry.applied) {
    return verdict("Harness dispatched an action that the server ignored.");
  }

  const timingIssue = auditTiming(entry, ctx);
  if (timingIssue) return timingIssue;

  switch (entry.action.type) {
    case "move":
      return auditMove(entry, state, ctx);
    case "ready":
      return auditReady(entry, ctx);
    case "proposeChipMove":
    case "acceptChipMove":
    case "rejectChipMove":
    case "cancelChipMove":
      return auditTrade(entry, state);
    case "flip":
      return auditFlip(entry);
    case "swap":
      return ok("Own-hand swap is plausible when it passes server validation and subsequent stability checks.");
    default:
      return ok("Action has no obvious guide violation.");
  }
}

export function auditBotActionLog(state: ServerGameState): void {
  const entries = state.botActionLog.map((entry) => ({ ...entry }));
  state.botActionLog = entries.map((entry, index) => ({
    ...entry,
    audit: auditBotAction(entry, state, { entries, index }),
  }));
}
