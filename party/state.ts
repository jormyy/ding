import type * as Party from "partykit/server";
import type {
  Card,
  GameState,
  Hand,
  Phase,
  Player,
} from "../src/lib/types";
import { COMMUNITY_CARDS_FOR_PHASE } from "../src/lib/constants";

/**
 * Server-side game state. Extends the client-visible `GameState` with
 * unmasked card data that must never be sent to clients.
 *
 * `allCommunityCards` holds all 5 community cards; `communityCards` on the
 * base type is sliced per-phase for broadcast.
 */
export interface ServerGameState extends GameState {
  /** All 5 community cards (unmasked). Sliced for broadcast via `buildClientState`. */
  allCommunityCards: Card[];
}

/** Create a fresh empty server state for a new room. */
export function createInitialState(): ServerGameState {
  return {
    phase: "lobby",
    players: [],
    handsPerPlayer: 1,
    communityCards: [],
    ranking: [],
    hands: [],
    revealIndex: 0,
    trueRanking: null,
    trueRanks: null,
    score: null,
    rankHistory: {},
    allCommunityCards: [],
    acquireRequests: [],
    chatMessages: [],
    dingLog: [],
    fuckoffLog: [],
  };
}

function maskHandsForPlayer(
  hands: Hand[],
  playerId: string,
  phase: Phase
): Hand[] {
  return hands.map((hand) => {
    if (hand.playerId === playerId) return hand;
    if (hand.flipped && phase === "reveal") return hand;
    return { ...hand, cards: [] };
  });
}

/**
 * Build a masked client-side view of the game state for a specific player.
 *
 * - Slices community cards to the correct count for the current phase.
 * - Strips opponent hole cards from all `Hand` objects except the viewer's own.
 * - In reveal phase, shows cards for hands that have already been flipped.
 */
export function buildClientState(state: ServerGameState, playerId: string): GameState {
  const count = COMMUNITY_CARDS_FOR_PHASE[state.phase];
  const communityCardsToShow = state.allCommunityCards.slice(0, count);

  return {
    phase: state.phase,
    players: state.players,
    handsPerPlayer: state.handsPerPlayer,
    communityCards: communityCardsToShow,
    ranking: state.ranking,
    hands: maskHandsForPlayer(state.hands, playerId, state.phase),
    revealIndex: state.revealIndex,
    trueRanking: state.trueRanking,
    trueRanks: state.trueRanks,
    score: state.score,
    rankHistory: state.rankHistory,
    acquireRequests: state.acquireRequests,
    chatMessages: state.chatMessages,
    dingLog: state.dingLog,
    fuckoffLog: state.fuckoffLog,
  };
}

/**
 * Broadcast the current (masked) game state to every connected client.
 * Each connection receives a personalized view with opponent cards hidden.
 */
export function broadcastStateTo(
  room: Party.Room,
  state: ServerGameState,
  connections: Map<string, Party.Connection>
) {
  for (const [connId, conn] of Array.from(connections.entries())) {
    const player = state.players.find((p) => p.connId === connId);
    const clientState = buildClientState(state, player?.id ?? "");
    const msg = { type: "state", state: clientState };
    conn.send(JSON.stringify(msg));
  }
}

/**
 * Debug assertion: verify the ranking array has no duplicates and matches
 * the total hand count. Logs errors to the console if invariants are violated.
 */
export function assertRankingInvariant(state: ServerGameState) {
  const claimed = state.ranking.filter((r): r is string => r !== null);
  const unique = new Set(claimed);
  if (unique.size !== claimed.length) {
    // eslint-disable-next-line no-console
    console.error("[ding] ranking has duplicate hand ids", claimed);
  }
  if (state.hands.length > 0 && state.ranking.length !== state.hands.length) {
    // eslint-disable-next-line no-console
    console.error(
      "[ding] ranking length mismatch",
      state.ranking.length,
      state.hands.length
    );
  }
}
