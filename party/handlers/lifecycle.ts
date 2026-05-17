import type { ChaosEvent, Phase } from "../../src/lib/types";
import { ALL_PHASES as PHASE_ORDER } from "../../src/lib/phases";
import { findHandById, findPlayerById } from "../../src/lib/utils";
import {
  type ServerGameState,
  createInitialState,
} from "../state";
import {
  computeShowdownForMode,
  countInversionsForRanks,
  getGameModeDefinition,
} from "../../src/lib/gameMode";
import type { Handler } from "./types";
import { inGamePhase } from "./types";
import { applyModePhaseEffects } from "./phaseEffects";
import { applyModeInfoFeatures } from "./infoFeatures";

/**
 * If all connected players are ready, advance the phase. Returns true if the
 * phase was advanced.
 *
 * Called from the `ready` handler (normal path) and from server-side round
 * timer enforcement (auto-ready on expiry).
 */
export function advancePhaseIfAllReady(state: ServerGameState): boolean {
  const allReady = state.players.every((p) => !p.connected || p.ready);
  if (!allReady) return false;

  for (const hand of state.hands) {
    const idx = state.ranking.indexOf(hand.id);
    if (!state.rankHistory[hand.id]) state.rankHistory[hand.id] = [];
    state.rankHistory[hand.id].push(idx === -1 ? null : idx + 1);
  }

  const currentIndex = PHASE_ORDER.indexOf(state.phase as Phase);
  const nextPhase = PHASE_ORDER[currentIndex + 1];
  state.acquireRequests = [];

  // draftFromFlop: when entering the flop in a flop-draft mode, expose 6
  // cards instead of 3 and hold the phase advance until every seat drafts.
  // We open the pool here BEFORE running phase effects so the chaos chip
  // fires alongside the draft UI; the pool blocks any further advancement
  // until cleared (see `flopDraftPending` substep gating below).
  installFlopDraftPoolIfNeeded(state, nextPhase);

  const chaosEvents = applyModePhaseEffects(state, nextPhase);
  appendChaosEvents(state, chaosEvents);

  if (nextPhase === "reveal") {
    // Collapse identities BEFORE running the showdown so the label-builder
    // sees the final card identities (pandemonium snapshot bug). Previously
    // labels referenced pre-collapse possibleIdentities and could disagree
    // with the post-collapse hand names players saw on reveal.
    for (const hand of state.hands) {
      hand.cards = collapsePossibleIdentities(hand.cards);
      hand.publicCards = collapsePossibleIdentities(hand.publicCards ?? []);
    }
    state.allCommunityCards = collapsePossibleIdentities(state.allCommunityCards);

    const showdown = computeShowdownForMode(state.modeId, state.hands, state.allCommunityCards, {
      scoreRuleOverride: state.scoreRuleOverride,
      pendingQualifier: state.pendingQualifier,
      handHierarchyId: state.handHierarchyId,
    });
    for (const hand of state.hands) {
      hand.madeHandName = showdown.madeHandNames[hand.id];
    }
    state.trueRanking = showdown.trueRanking;
    state.trueRanks = showdown.trueRanks;
    state.qualifierResult = showdown.qualifierResult;
    state.revealIndex = 0;
    applyOptedTierPenalty(state);
  } else {
    state.ranking = Array(state.hands.length).fill(null);
  }

  state.phase = nextPhase;
  state.modeInfo = applyModeInfoFeatures(state, nextPhase);
  state.phaseStartedAt = Date.now();

  for (const p of state.players) p.ready = false;

  return true;
}

function installFlopDraftPoolIfNeeded(state: ServerGameState, nextPhase: Phase): void {
  if (nextPhase !== "flop") return;
  const mode = getGameModeDefinition(state.modeId);
  const fires = mode.phaseEffects?.flop?.includes("draftFromFlop");
  if (!fires) return;
  // Need 6 cards face-up; the standard deal only produces 5 community cards.
  // Pull one more from `dealDeck` if available; otherwise use what we have.
  while (state.allCommunityCards.length < 6 && state.dealDeck.length > 0) {
    const next = state.dealDeck.shift();
    if (next) state.allCommunityCards.push(next);
  }
  const cards = state.allCommunityCards.slice(0, 6);
  state.flopDraftPool = {
    cards,
    remainingIndexes: cards.map((_card, i) => i),
    draftedBy: {},
  };
  state.phaseSubstep = "flopDraftPending";
  state.mutationVersion++;
}

function applyOptedTierPenalty(state: ServerGameState): void {
  if (!state.pendingOptedTierPenalty) return;
  const opted = state.optedHandIds;
  if (!opted || opted.length === 0) return;
  if (!state.trueRanking || state.trueRanking.length < 2) return;
  const ranking = state.trueRanking.slice();
  for (const handId of opted) {
    const idx = ranking.indexOf(handId);
    if (idx < 0 || idx >= ranking.length - 1) continue;
    [ranking[idx], ranking[idx + 1]] = [ranking[idx + 1], ranking[idx]];
  }
  state.trueRanking = ranking;
  const trueRanks: Record<string, number> = {};
  ranking.forEach((id, i) => { trueRanks[id] = i + 1; });
  state.trueRanks = trueRanks;
}

function collapsePossibleIdentities<T extends { possibleIdentities?: unknown }>(cards: readonly T[]): T[] {
  return cards.map((card) => {
    const had = Array.isArray((card as { possibleIdentities?: unknown[] }).possibleIdentities)
      && ((card as { possibleIdentities?: unknown[] }).possibleIdentities ?? []).length > 0;
    const { possibleIdentities: _possibleIdentities, ...rest } = card;
    return (had ? { ...rest, justCollapsed: true } : rest) as T;
  });
}

function appendChaosEvents(state: ServerGameState, events: readonly ChaosEvent[]): void {
  if (events.length === 0) return;
  state.pendingChaosEvents.push(...events);
}

export const ready: Handler = (state, player, msg) => {
  if (msg.type !== "ready") return { kind: "ignore" };
  if (!inGamePhase(state)) return { kind: "ignore" };

  if (msg.ready) {
    const unrankedHands = state.hands.filter((h) => !state.ranking.includes(h.id));
    const onlyOfflineUnranked = unrankedHands.every((h) => {
      const owner = findPlayerById(state.players, h.playerId);
      return owner ? !owner.connected : true;
    });
    if (!onlyOfflineUnranked) return { kind: "ignore" };
  }

  player.ready = msg.ready;

  advancePhaseIfAllReady(state);

  return { kind: "broadcast" };
};

export const flip: Handler = (state, player, msg) => {
  if (msg.type !== "flip") return { kind: "ignore" };
  if (state.phase !== "reveal") return { kind: "ignore" };
  if (state.score !== null) return { kind: "ignore" };

  const totalHands = state.hands.length;
  if (state.revealIndex >= totalHands) return { kind: "ignore" };

  const currentRevealIdx = state.ranking.length - 1 - state.revealIndex;
  const handToFlipId = state.ranking[currentRevealIdx];

  // Skip unranked (null) slots — e.g. offline players who never placed.
  if (!handToFlipId) {
    state.revealIndex++;
    if (state.revealIndex >= totalHands) {
      state.score = countInversionsForRanks(state.ranking, state.trueRanks);
      state.lastHandSummary = buildCompletedHandSummary(state);
    }
    return { kind: "broadcast" };
  }

  const handToFlip = findHandById(state.hands, handToFlipId);
  if (!handToFlip) return { kind: "ignore" };

  const owner = findPlayerById(state.players, handToFlip.playerId);
  if (owner?.connected && handToFlip.playerId !== player.id) return { kind: "ignore" };

  handToFlip.flipped = true;
  state.revealIndex++;

  if (state.revealIndex === totalHands) {
    state.score = countInversionsForRanks(state.ranking, state.trueRanks);
    state.lastHandSummary = buildCompletedHandSummary(state);
  }

  return { kind: "broadcast" };
};

function buildCompletedHandSummary(state: ServerGameState): ServerGameState["lastHandSummary"] {
  return {
    phase: "reveal",
    ranking: state.ranking.slice(),
    names: state.ranking.flatMap((handId) => {
      if (!handId) return [];
      const hand = findHandById(state.hands, handId);
      return [hand?.madeHandName ?? handId];
    }),
  };
}

export const playAgain: Handler = (state, player, _msg, ctx) => {
  if (state.phase !== "reveal") return { kind: "ignore" };
  if (!player.isCreator) return { kind: "ignore" };

  const players = state.players.map((p) => ({ ...p, ready: false }));
  const chat = state.chatMessages;
  const newState = createInitialState();
  newState.players = players;
  newState.chatMessages = chat;
  newState.modeId = state.modeId ?? "ding";
  newState.gameTimerSeconds = state.gameTimerSeconds;
  newState.roundTimerSeconds = state.roundTimerSeconds;
  newState.lastHandSummary = state.lastHandSummary;
  ctx.resetState(newState);

  return { kind: "broadcast" };
};

export const endGame: Handler = (state, player, _msg, ctx) => {
  if (state.phase === "lobby") return { kind: "ignore" };
  if (!player.isCreator) return { kind: "ignore" };

  const players = state.players.map((p) => ({ ...p, ready: false }));
  const chat = state.chatMessages;
  const newState = createInitialState();
  newState.players = players;
  newState.chatMessages = chat;
  newState.modeId = state.modeId ?? "ding";
  newState.gameTimerSeconds = state.gameTimerSeconds;
  newState.roundTimerSeconds = state.roundTimerSeconds;
  newState.lastHandSummary = state.lastHandSummary;
  ctx.resetState(newState);

  return { kind: "broadcast" };
};
