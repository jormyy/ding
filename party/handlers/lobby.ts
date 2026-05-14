import { MAX_PLAYERS } from "../../src/lib/constants";
import { shuffleDeck } from "../../src/lib/deckUtils";
import {
  getGameModeDefinition,
  getMaxHandsPerPlayerForMode,
  isGameModeId,
  createDeckForMode,
  dealCardsForMode,
} from "../../src/lib/gameMode";
import type { Handler, HandlerResult } from "./types";
import type { DealChoiceProgress } from "../../src/lib/types";
import { applyModeInfoFeatures } from "./infoFeatures";

export const configure: Handler = (state, player, msg) => {
  if (msg.type !== "configure") return { kind: "ignore" };
  if (!player.isCreator || state.phase !== "lobby") return { kind: "ignore" };
  if (msg.modeId !== undefined && isGameModeId(msg.modeId)) {
    state.modeId = msg.modeId;
    const maxHands = getMaxHandsPerPlayerForMode(state.modeId, state.players.length);
    state.handsPerPlayer = Math.min(state.handsPerPlayer, maxHands);
  }
  if (msg.handsPerPlayer !== undefined) {
    const playerCount = state.players.length;
    const maxHands = getMaxHandsPerPlayerForMode(state.modeId, playerCount);
    state.handsPerPlayer = Math.max(1, Math.min(maxHands, msg.handsPerPlayer));
  }
  if (msg.gameTimerSeconds !== undefined) {
    state.gameTimerSeconds = Math.max(0, msg.gameTimerSeconds);
  }
  if (msg.roundTimerSeconds !== undefined) {
    state.roundTimerSeconds = Math.max(0, msg.roundTimerSeconds);
  }
  return { kind: "broadcast" };
};

export const addBot: Handler = (state, player, _msg, ctx) => {
  if (!player.isCreator || state.phase !== "lobby") return { kind: "ignore" };
  if (state.players.length >= MAX_PLAYERS) return { kind: "ignore" };
  const newCount = state.players.length + 1;
  if (getMaxHandsPerPlayerForMode(state.modeId, newCount) < state.handsPerPlayer) {
    return { kind: "ignore" };
  }
  const botPlayer = ctx.botController.addBot();
  state.players.push(botPlayer);
  return { kind: "broadcast" };
};

export const start: Handler = (state, player) => {
  if (!player.isCreator || state.phase !== "lobby") return { kind: "ignore" };
  const connectedPlayers = state.players.filter((p) => p.connected);
  if (connectedPlayers.length < 2) return { kind: "ignore" };

  state.players = connectedPlayers;

  const mode = getGameModeDefinition(state.modeId);
  state.modeId = mode.id;
  const maxHands = getMaxHandsPerPlayerForMode(mode.id, state.players.length);
  state.handsPerPlayer = Math.min(state.handsPerPlayer, maxHands);

  const deck = shuffleDeck(createDeckForMode(mode.id));
  const playerIds = state.players.map((p) => p.id);
  const { hands, communityCards, remainingDeck, burnCards } = dealCardsForMode(deck, playerIds, state.handsPerPlayer, mode.id);

  const now = Date.now();
  state.hands = hands;
  state.ranking = Array(hands.length).fill(null);
  state.rankHistory = {};
  state.allCommunityCards = communityCards;
  state.dealDeck = remainingDeck;
  state.burnCards = burnCards;
  state.communityCards = [];
  state.communityLayout = mode.deal.boardLayout ?? { kind: "linear", slots: mode.deal.communityCards };
  state.dealChoices = buildDealChoices(mode.deal, hands);
  state.phase = Object.keys(state.dealChoices).length > 0 ? "dealChoice" : "preflop";
  state.modeInfo = applyModeInfoFeatures(state, state.phase);
  state.revealIndex = 0;
  state.trueRanking = null;
  state.trueRanks = null;
  state.score = null;
  state.gameStartedAt = now;
  state.phaseStartedAt = now;

  for (const p of state.players) p.ready = false;

  return { kind: "broadcast" };
};

function buildDealChoices(
  deal: ReturnType<typeof getGameModeDefinition>["deal"],
  hands: { id: string }[]
): Record<string, DealChoiceProgress> {
  const dealChoice = deal.dealChoice;
  const isExposeChoice = deal.publicCardSelection === "playerChoice";
  if (!dealChoice?.selectionPhase && !isExposeChoice) return {};
  const choices: Record<string, DealChoiceProgress> = {};
  for (const hand of hands) {
    choices[hand.id] = {
      keepCards: isExposeChoice ? (deal.publicCards ?? 1) : dealChoice!.keepCards,
      selectedIndexes: null,
      submitted: false,
      canMulligan: dealChoice?.mulligan,
      mulliganUsed: false,
      tradeUp: dealChoice?.tradeUp,
      inheritance: dealChoice?.inheritance,
    };
  }
  return choices;
}

export const kick: Handler = (state, player, msg, ctx): HandlerResult => {
  if (msg.type !== "kick") return { kind: "ignore" };
  if (!player.isCreator || state.phase !== "lobby") return { kind: "ignore" };
  if (msg.playerId === player.id) return { kind: "ignore" };
  const target = state.players.find((p) => p.id === msg.playerId);
  if (!target) return { kind: "ignore" };
  ctx.kickedPids.add(target.id);
  if (!target.isBot) {
    const targetConn = ctx.connections.get(target.connId);
    if (targetConn) {
      targetConn.send(JSON.stringify({ type: "error", message: "Removed by host" }));
      targetConn.close();
    }
  }
  ctx.removePlayerFromLobby(target.id);
  return { kind: "broadcast" };
};

export const leave: Handler = (state, player, _msg, ctx): HandlerResult => {
  if (state.phase !== "lobby") return { kind: "ignore" };
  ctx.removePlayerFromLobby(player.id);
  return { kind: "broadcast-close-self" };
};
