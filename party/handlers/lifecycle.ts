import type { Phase } from "../../src/lib/types";
import { PHASE_ORDER } from "../../src/lib/constants";
import { createInitialState } from "../state";
import { computeTrueRanking, computeTrueRanks, countInversions } from "../scoring";
import { solveHands, solvedHandName } from "../solver";
import type { Handler } from "./types";
import { inGamePhase } from "./types";

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

  const allReady = state.players.every((p) => !p.connected || p.ready);
  if (allReady) {
    for (const hand of state.hands) {
      const idx = state.ranking.indexOf(hand.id);
      if (!state.rankHistory[hand.id]) state.rankHistory[hand.id] = [];
      state.rankHistory[hand.id].push(idx === -1 ? null : idx + 1);
    }

    const currentIndex = PHASE_ORDER.indexOf(state.phase as Phase);
    const nextPhase = PHASE_ORDER[currentIndex + 1];
    state.acquireRequests = [];

    if (nextPhase === "reveal") {
      const solvedMap = solveHands(state.hands, state.allCommunityCards);
      for (const hand of state.hands) {
        const solved = solvedMap.get(hand.id);
        if (solved) hand.madeHandName = solvedHandName(solved);
      }
      state.trueRanking = computeTrueRanking(state.hands, state.allCommunityCards);
      state.trueRanks = computeTrueRanks(
        state.trueRanking,
        state.hands,
        state.allCommunityCards
      );
      state.revealIndex = 0;
    } else {
      state.ranking = Array(state.hands.length).fill(null);
    }

    state.phase = nextPhase;
    state.phaseStartedAt = Date.now();

    for (const p of state.players) p.ready = false;
  }

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
      state.score = countInversions(
        state.ranking,
        state.trueRanking!,
        state.hands,
        state.allCommunityCards
      );
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
    state.score = countInversions(
      state.ranking,
      state.trueRanking!,
      state.hands,
      state.allCommunityCards
    );
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
  newState.gameTimerSeconds = state.gameTimerSeconds;
  newState.roundTimerSeconds = state.roundTimerSeconds;
  ctx.resetState(newState);

  return { kind: "broadcast" };
};
