import type { Phase } from "../../src/lib/types";
import type { ChaosEvent } from "../../src/lib/types";
import { PHASE_ORDER } from "../../src/lib/constants";
import {
  type ServerGameState,
  createInitialState,
} from "../state";
import {
  computeShowdownForMode,
  countInversionsForRanks,
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
  const chaosEvents = applyModePhaseEffects(state, nextPhase);
  appendChaosEvents(state, chaosEvents);

  if (nextPhase === "reveal") {
    const showdown = computeShowdownForMode(state.modeId, state.hands, state.allCommunityCards);
    for (const hand of state.hands) {
      hand.madeHandName = showdown.madeHandNames[hand.id];
      hand.cards = collapsePossibleIdentities(hand.cards);
      hand.publicCards = collapsePossibleIdentities(hand.publicCards ?? []);
    }
    state.allCommunityCards = collapsePossibleIdentities(state.allCommunityCards);
    state.trueRanking = showdown.trueRanking;
    state.trueRanks = showdown.trueRanks;
    state.revealIndex = 0;
  } else {
    state.ranking = Array(state.hands.length).fill(null);
  }

  state.phase = nextPhase;
  state.modeInfo = applyModeInfoFeatures(state, nextPhase);
  state.phaseStartedAt = Date.now();

  for (const p of state.players) p.ready = false;

  return true;
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
      const owner = state.players.find((p) => p.id === h.playerId);
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

  const handToFlip = state.hands.find((h) => h.id === handToFlipId);
  if (!handToFlip) return { kind: "ignore" };

  const owner = state.players.find((p) => p.id === handToFlip.playerId);
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
      const hand = state.hands.find((candidate) => candidate.id === handId);
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
