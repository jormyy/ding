import type { Hand } from "../../src/lib/types";
import { MAX_PLAYERS, MAX_TOTAL_HANDS } from "../../src/lib/constants";
import { createDeck, dealCards, shuffleDeck } from "../../src/lib/deckUtils";
import type { ServerGameState } from "../state";
import type { Handler, HandlerCtx, HandlerResult } from "./types";

export const configure: Handler = (state, player, msg) => {
  if (msg.type !== "configure") return { kind: "ignore" };
  if (!player.isCreator || state.phase !== "lobby") return { kind: "ignore" };
  const playerCount = state.players.length;
  const maxHands = Math.floor(MAX_TOTAL_HANDS / playerCount);
  const n = Math.max(1, Math.min(maxHands, msg.handsPerPlayer));
  state.handsPerPlayer = n;
  return { kind: "broadcast" };
};

export const addBot: Handler = (state, player, _msg, ctx) => {
  if (!player.isCreator || state.phase !== "lobby") return { kind: "ignore" };
  if (state.players.length >= MAX_PLAYERS) return { kind: "ignore" };
  const newCount = state.players.length + 1;
  if (Math.floor(MAX_TOTAL_HANDS / newCount) < state.handsPerPlayer) return { kind: "ignore" };
  const botPlayer = ctx.botController.addBot();
  state.players.push(botPlayer);
  return { kind: "broadcast" };
};

export const start: Handler = (state, player) => {
  if (!player.isCreator || state.phase !== "lobby") return { kind: "ignore" };
  const connectedPlayers = state.players.filter((p) => p.connected);
  if (connectedPlayers.length < 2) return { kind: "ignore" };

  state.players = connectedPlayers;

  const deck = shuffleDeck(createDeck());
  const playerIds = state.players.map((p) => p.id);
  const { playerHands, communityCards } = dealCards(deck, playerIds, state.handsPerPlayer);

  const hands: Hand[] = [];
  for (const playerId of playerIds) {
    for (let h = 0; h < state.handsPerPlayer; h++) {
      hands.push({
        id: `${playerId}-${h}`,
        playerId,
        cards: playerHands[playerId][h],
        flipped: false,
      });
    }
  }

  state.hands = hands;
  state.ranking = Array(hands.length).fill(null);
  state.rankHistory = {};
  state.allCommunityCards = communityCards;
  state.communityCards = [];
  state.phase = "preflop";
  state.revealIndex = 0;
  state.trueRanking = null;
  state.trueRanks = null;
  state.score = null;

  for (const p of state.players) p.ready = false;

  return { kind: "broadcast" };
};

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
