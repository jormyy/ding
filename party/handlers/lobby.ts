import { MAX_PLAYERS } from "../../src/lib/constants";
import { shuffleDeck } from "../../src/lib/deckUtils";
import { clamp, findPlayerById } from "../../src/lib/utils";
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
    state.handsPerPlayer = clamp(msg.handsPerPlayer, 1, maxHands);
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
  installMetaTargetCard(state, mode);
  state.dealChoices = buildDealChoices(mode.deal, hands, state.allCommunityCards);
  state.auctionPool = buildAuctionPool(state, mode);
  state.flopDraftPool = undefined;
  state.optedHandIds = undefined;
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

/**
 * For meta-deck modes (cursed/blessed/marked/etc.), scan the dealt hands and
 * community board for the first card with a target meta and surface it as
 * `state.metaTargetCard`. Feeds the meta-legend info-chip so players know
 * which exact card is the round's wild/curse/hex.
 */
function installMetaTargetCard(
  state: import("../state").ServerGameState,
  mode: ReturnType<typeof getGameModeDefinition>,
): void {
  const wantedMeta = inferTargetMeta(mode);
  if (!wantedMeta) return;
  const allCards = [
    ...state.allCommunityCards,
    ...state.hands.flatMap((hand) => hand.cards),
    ...state.dealDeck,
    ...state.burnCards,
  ];
  const target = allCards.find((card) => card.meta === wantedMeta);
  if (!target) return;
  state.metaTargetCard = { rank: target.rank, suit: target.suit };
  state.metaKind = wantedMeta;
}

function inferTargetMeta(
  mode: ReturnType<typeof getGameModeDefinition>,
): import("../../src/lib/types").CardMeta | undefined {
  switch (mode.deal.deck) {
    case "cursed": return "cursed";
    case "blessed": return "blessed";
    case "tarot": return "tarot";
    case "jokers": return "joker";
    case "glitch": return "glitched";
    case "twoSuited": return "twoSuited";
    case "marked": return "marked";
    case "trickster": return "trickster";
  }
  if (mode.wildCards?.metas?.length) return mode.wildCards.metas[0];
  if (mode.forceRankByMeta?.first) return mode.forceRankByMeta.first;
  if (mode.forceRankByMeta?.last) return mode.forceRankByMeta.last;
  return undefined;
}

function buildDealChoices(
  deal: ReturnType<typeof getGameModeDefinition>["deal"],
  hands: { id: string }[],
  allCommunityCards: import("../../src/lib/types").Card[],
): Record<string, DealChoiceProgress> {
  const dealChoice = deal.dealChoice;
  const isExposeChoice = deal.publicCardSelection === "playerChoice";
  if (!dealChoice?.selectionPhase && !isExposeChoice) return {};
  const peekBoardCount = typeof dealChoice?.peekBoard === "number" ? dealChoice.peekBoard : 0;
  const choices: Record<string, DealChoiceProgress> = {};
  for (const hand of hands) {
    const baseKeep = isExposeChoice ? (deal.publicCards ?? 1) : dealChoice!.keepCards;
    choices[hand.id] = {
      keepCards: baseKeep,
      selectedIndexes: null,
      submitted: false,
      canMulligan: dealChoice?.mulligan,
      mulliganUsed: false,
      tradeUp: dealChoice?.tradeUp,
      inheritance: dealChoice?.inheritance,
      recruitStage: dealChoice?.recruit ? "keep" : undefined,
      privatePeekCards: peekBoardCount > 0 ? allCommunityCards.slice(0, peekBoardCount) : undefined,
    };
  }
  return choices;
}

function buildAuctionPool(
  state: import("../state").ServerGameState,
  mode: ReturnType<typeof getGameModeDefinition>,
): import("../../src/lib/types").GameState["auctionPool"] {
  if (!mode.deal.dealChoice?.auction) return undefined;
  // Cards dealt into hands by `dealCardsForMode` become the auction pool.
  // Strip them OUT of hands so the deal-choice UI sees a public pool to claim.
  const pooledCards: import("../../src/lib/types").Card[] = [];
  for (const hand of state.hands) {
    pooledCards.push(...hand.cards);
    hand.cards = [];
    hand.cardCount = 0;
    hand.publicCards = [];
  }
  // Auto-submit deal-choice progress for empty hands until claims happen; the
  // auction handler flips `submitted=true` for each hand once filled.
  // Per-pass queue: pass 1 = each player in seat order, pass 2 = same.
  // Total picks per player = handsPerPlayer * keepCards.
  const ids = state.players.map((p) => p.id);
  const passes = state.handsPerPlayer * mode.deal.dealChoice.keepCards;
  const queue: string[] = [];
  for (let pass = 0; pass < passes; pass++) {
    for (const id of ids) queue.push(id);
  }
  return {
    cards: pooledCards,
    remainingIndexes: pooledCards.map((_card, i) => i),
    claimQueue: queue,
    claimsPerPlayer: {},
  };
}

export const kick: Handler = (state, player, msg, ctx): HandlerResult => {
  if (msg.type !== "kick") return { kind: "ignore" };
  if (!player.isCreator || state.phase !== "lobby") return { kind: "ignore" };
  if (msg.playerId === player.id) return { kind: "ignore" };
  const target = findPlayerById(state.players, msg.playerId);
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
