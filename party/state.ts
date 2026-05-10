import type * as Party from "partykit/server";
import type {
  BotActionLogEntry,
  Card,
  GameState,
  Hand,
  Phase,
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
  /**
   * Monotonic generation counter — bumped by the action dispatcher whenever
   * an applied action might have changed any client-visible slice. Used by:
   *
   *   - the bot action fingerprint (replaces JSON.stringify), and
   *   - any future mask cache that wants a single int as its invalidation key.
   *
   * Treat this as engine-internal: do not include it in client broadcasts
   * (it lives only on the server-side extension).
   */
  gen: number;
}

/** Create a fresh empty server state for a new room. */
export function createInitialState(): ServerGameState {
  return {
    modeId: "ding",
    phase: "lobby",
    players: [],
    handsPerPlayer: 1,
    gameTimerSeconds: 0,
    roundTimerSeconds: 0,
    phaseStartedAt: null,
    gameStartedAt: null,
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
    botActionLog: [],
    gen: 0,
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

function maskBotActionLogForPlayer(
  entries: BotActionLogEntry[],
  playerId: string,
  phase: Phase
): BotActionLogEntry[] {
  const showAllHoleCards = phase === "reveal";
  return entries.map((entry) => {
    if (showAllHoleCards || entry.playerId === playerId) return entry;
    const actorHoleCards: Record<string, Card[]> = {};
    for (const handId of Object.keys(entry.actorHoleCards)) {
      actorHoleCards[handId] = [];
    }
    return { ...entry, actorHoleCards };
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
    modeId: state.modeId ?? "ding",
    phase: state.phase,
    players: state.players,
    handsPerPlayer: state.handsPerPlayer,
    gameTimerSeconds: state.gameTimerSeconds,
    roundTimerSeconds: state.roundTimerSeconds,
    phaseStartedAt: state.phaseStartedAt,
    gameStartedAt: state.gameStartedAt,
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
    botActionLog: maskBotActionLogForPlayer(state.botActionLog, playerId, state.phase),
  };
}

/**
 * Per-player mask cache. Skipping `conn.send` when the masked output is
 * byte-identical to the previous broadcast removes the dominant cost in
 * chatty rooms (every action triggers a broadcast, but most actions don't
 * change every player's view).
 */
export class MaskBroadcaster {
  private lastJsonByPlayer: Map<string, string> = new Map();

  /** Drop a player's cache entry on disconnect to keep the map bounded. */
  forget(playerId: string): void {
    this.lastJsonByPlayer.delete(playerId);
  }

  /** Reset the entire cache (e.g., after `playAgain` rebuilds state). */
  reset(): void {
    this.lastJsonByPlayer.clear();
  }

  broadcast(
    state: ServerGameState,
    connections: Map<string, Party.Connection>
  ): void {
    // Build connId → playerId once instead of state.players.find per connection.
    const playerByConn = new Map<string, string>();
    for (const p of state.players) playerByConn.set(p.connId, p.id);

    for (const [connId, conn] of connections) {
      const playerId = playerByConn.get(connId) ?? "";
      const clientState = buildClientState(state, playerId);
      const payload = JSON.stringify({ type: "state", state: clientState });
      const previous = this.lastJsonByPlayer.get(playerId);
      if (previous === payload) continue;
      this.lastJsonByPlayer.set(playerId, payload);
      conn.send(payload);
    }
  }
}

const defaultBroadcaster = new MaskBroadcaster();

/**
 * Broadcast the masked game state to every connected client through the
 * default `MaskBroadcaster` so byte-identical re-broadcasts are skipped.
 */
export function broadcastStateTo(
  _room: Party.Room,
  state: ServerGameState,
  connections: Map<string, Party.Connection>
) {
  defaultBroadcaster.broadcast(state, connections);
}

/** Drop a single player's cache entry from the default broadcaster. */
export function forgetPlayerInBroadcaster(playerId: string): void {
  defaultBroadcaster.forget(playerId);
}

