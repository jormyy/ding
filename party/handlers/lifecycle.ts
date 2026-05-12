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
} from "../../src/lib/gameModeShowdown";
import type { Handler } from "./types";
import { inGamePhase } from "./types";
import { applyModePhaseEffects } from "./phaseEffects";

const CHAOS_ACTION_LOG_CAP = 100;

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
    }
    state.trueRanking = showdown.trueRanking;
    state.trueRanks = showdown.trueRanks;
    state.revealIndex = 0;
  } else {
    state.ranking = Array(state.hands.length).fill(null);
  }

  state.phase = nextPhase;
  state.phaseStartedAt = Date.now();

  for (const p of state.players) p.ready = false;

  return true;
}

function appendChaosEvents(state: ServerGameState, events: readonly ChaosEvent[]): void {
  if (events.length === 0) return;
  state.pendingChaosEvents.push(...events);
  for (const event of events) {
    state.botActionLog.push({
      id: `${Date.now()}-chaos-${state.botActionLog.length}`,
      ts: Date.now(),
      phaseElapsedMs: state.phaseStartedAt === null ? null : Date.now() - state.phaseStartedAt,
      phase: event.phase,
      playerId: "__system__",
      playerName: "Chaos",
      action: { type: "chaos-event", event: event.event, affected: event.affected },
      applied: true,
      communityCards: state.allCommunityCards.slice(),
      actorHoleCards: {},
      rankingBefore: state.ranking.slice(),
      rankingAfter: state.ranking.slice(),
      acquireRequestsBefore: [],
      acquireRequestsAfter: [],
    });
  }
  if (state.botActionLog.length > CHAOS_ACTION_LOG_CAP) {
    state.botActionLog.splice(0, state.botActionLog.length - CHAOS_ACTION_LOG_CAP);
  }
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
  }

  return { kind: "broadcast" };
};

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
  ctx.resetState(newState);

  return { kind: "broadcast" };
};
