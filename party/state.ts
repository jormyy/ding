import type * as Party from "partykit/server";
import type {
  Card,
  ChaosEvent,
  DealChoiceProgress,
  DisplayedCard,
  GameState,
  Hand,
  ModeInfo,
  Phase,
} from "../src/lib/types";
import type { QualifierId } from "../src/lib/gameMode";
import {
  visibleCommunityCardCount,
  visibleCommunityCardCountForSubstep,
  visibleCommunityCardDetail,
  visibleCommunityCardDetails,
  visibleCommunityCardIndexes,
  visibleHoleCardCount,
  visibleHoleCardDetail,
  visibleHoleCardIndexes,
  type HoleCardVisibilityDetail,
} from "../src/lib/gameMode";
import { applyModeInfoFeatures } from "./handlers/infoFeatures";

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
  /** Remaining shuffled deck during deal-choice mutations such as mulligans. */
  dealDeck: Card[];
  /** Burn cards from the initial deal, available to information modes. */
  burnCards: Card[];
  lastHandSummary?: { phase: Phase; ranking: (string | null)[]; names: string[] };
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
  /** Transient typed chaos-event messages waiting to be broadcast. */
  pendingChaosEvents: ChaosEvent[];

  // -------- Engine-internal phase-effect state (never broadcast) --------

  /**
   * Monotonic counter bumped on every phase-effect mutation. Used as part of
   * the MaskBroadcaster cache key so that mutations which leave the masked
   * payload byte-identical (e.g., opponent hole cards) still rebroadcast.
   */
  mutationVersion: number;
  /**
   * Mission-qualifier ID armed by a phase effect; the showdown evaluates it
   * and writes back to `qualifierResult` for broadcast.
   */
  pendingQualifier?: QualifierId;
  /**
   * Set true when the `optedTierPenalty` phase effect fires at reveal. The
   * post-showdown step in `lifecycle.ts` checks this (alongside `optedHandIds`)
   * before reordering the trueRanking.
   */
  pendingOptedTierPenalty?: boolean;

  /**
   * Per-feature extension namespace. Keyed by stable feature id; values are
   * opaque to the engine and only visible to clients via maskers. See
   * `src/lib/gameMode/modeExt.ts`.
   */
  modeExt: Record<string, unknown>;
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
    communityLayout: undefined,
    modeInfo: [],
    ranking: [],
    hands: [],
    dealChoices: {},
    revealIndex: 0,
    trueRanking: null,
    trueRanks: null,
    score: null,
    rankHistory: {},
    allCommunityCards: [],
    dealDeck: [],
    burnCards: [],
    acquireRequests: [],
    chatMessages: [],
    dingLog: [],
    fuckoffLog: [],
    pendingChaosEvents: [],
    gen: 0,
    mutationVersion: 0,
    modeExt: {},
  };
}

function maskHandsForPlayer(
  hands: Hand[],
  playerId: string,
  phase: Phase,
  modeId: string | undefined
): Hand[] {
  const visiblePublicCount = visibleHoleCardCount(modeId, phase);
  const visibleDetail = visibleHoleCardDetail(modeId, phase);
  const visibleIndexes = visibleHoleCardIndexes(modeId, phase);
  return hands.map((hand) => {
    const cardCount = hand.cardCount ?? hand.cards.length;
    const storedPublicCards = hand.publicCards ?? [];
    const dynamicPublicCards = visibleDetail === "full"
      ? selectVisibleHoleCards(hand.cards, visiblePublicCount, visibleIndexes)
      : [];
    const publicCards = dynamicPublicCards.length > storedPublicCards.length
      ? dynamicPublicCards
      : storedPublicCards;
    const publicCardHints = buildPublicCardHints(hand.cards, visiblePublicCount, visibleDetail, visibleIndexes);
    if (hand.playerId === playerId) return { ...hand, cardCount, publicCards, publicCardHints };
    if (hand.flipped && phase === "reveal") return { ...hand, cardCount, publicCards, publicCardHints };
    return { ...hand, cards: [], cardCount, publicCards, publicCardHints };
  });
}

function buildPublicCardHints(
  cards: Card[],
  count: number,
  detail: HoleCardVisibilityDetail,
  indexes?: readonly number[]
): DisplayedCard[] {
  if (detail === "full" || count <= 0) return [];
  return selectVisibleHoleCards(cards, count, indexes).map((card) => {
    switch (detail) {
      case "suit":
        return { suit: card.suit };
      case "rank":
        return { rank: card.rank };
      case "color":
        return { color: card.suit === "H" || card.suit === "D" ? "red" : "black" };
      default:
        return {};
    }
  });
}

function selectVisibleHoleCards(cards: Card[], count: number, indexes?: readonly number[]): Card[] {
  if (count <= 0) return [];
  if (indexes !== undefined) {
    return indexes.slice(0, count).flatMap((index) => cards[index] === undefined ? [] : [cards[index]]);
  }
  return cards.slice(0, count);
}

function maskDealChoicesForPlayer(
  dealChoices: Record<string, DealChoiceProgress>,
  hands: Hand[],
  playerId: string
): Record<string, DealChoiceProgress> {
  const ownerByHand = new Map(hands.map((hand) => [hand.id, hand.playerId]));
  const masked: Record<string, DealChoiceProgress> = {};
  for (const [handId, choice] of Object.entries(dealChoices)) {
    if (ownerByHand.get(handId) === playerId) {
      masked[handId] = choice;
    } else {
      // Strip every owner-only field. Anything else (table-visible tallies
      // such as tablePicksVotes, submitted flags, keepCards) is broadcast.
      const {
        selectedIndexes: _selected,
        privatePeekCards: _peek,
        sacrificedHoleIndex: _sac,
        ...rest
      } = choice;
      masked[handId] = { ...rest, selectedIndexes: null };
    }
  }
  return masked;
}

/**
 * Build a masked client-side view of the game state for a specific player.
 *
 * - Slices community cards to the correct count for the current phase.
 * - Strips opponent hole cards from all `Hand` objects except the viewer's own.
 * - In reveal phase, shows cards for hands that have already been flipped.
 */
export function buildClientState(state: ServerGameState, playerId: string): GameState {
  const indexes = visibleCommunityCardIndexes(state.modeId, state.phase);
  let revealed: Card[];
  if (indexes !== null) {
    revealed = new Array(state.allCommunityCards.length);
    for (const i of indexes) {
      if (i >= 0 && i < state.allCommunityCards.length) {
        revealed[i] = state.allCommunityCards[i];
      }
    }
  } else {
    const substepOverride = visibleCommunityCardCountForSubstep(state.modeId, state.phase, state.phaseSubstep);
    const count = substepOverride ?? visibleCommunityCardCount(state.modeId, state.phase);
    revealed = state.allCommunityCards.slice(0, count);
  }
  const communityCardsToShow = buildVisibleCommunityCards(
    revealed,
    visibleCommunityCardDetail(state.modeId, state.phase),
    visibleCommunityCardDetails(state.modeId, state.phase)
  );

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
    communityLayout: state.communityLayout,
    modeInfo: maskModeInfo(state.modeInfo && state.modeInfo.length > 0 ? state.modeInfo : applyModeInfoFeatures(state, state.phase), playerId),
    ranking: state.ranking,
    hands: maskHandsForPlayer(state.hands, playerId, state.phase, state.modeId),
    dealChoices: maskDealChoicesForPlayer(state.dealChoices ?? {}, state.hands, playerId),
    revealIndex: state.revealIndex,
    trueRanking: state.trueRanking,
    trueRanks: state.trueRanks,
    score: state.score,
    rankHistory: state.rankHistory,
    acquireRequests: state.acquireRequests,
    chatMessages: state.chatMessages,
    dingLog: state.dingLog,
    fuckoffLog: state.fuckoffLog,
    scoreRuleOverride: state.scoreRuleOverride,
    qualifierResult: state.qualifierResult,
    handHierarchyId: state.handHierarchyId,
    absorbedHandIds: state.absorbedHandIds,
    wildRankByEffect: state.wildRankByEffect,
    lockedHandIds: state.lockedHandIds,
    suitsStripped: state.suitsStripped,
    markedBoardWildIndex: state.markedBoardWildIndex,
    phaseSubstep: state.phaseSubstep,
    metaTargetCard: state.metaTargetCard,
    metaKind: state.metaKind,
    auctionPool: state.auctionPool,
    flopDraftPool: state.flopDraftPool,
    optedHandIds: state.optedHandIds,
  };
}

function maskModeInfo(modeInfo: readonly ModeInfo[], playerId: string): ModeInfo[] {
  return modeInfo.filter((info) => info.kind !== "announce" || info.audience !== "player" || info.recipientId === playerId);
}

function buildVisibleCommunityCards(
  cards: Card[],
  detail: HoleCardVisibilityDetail,
  detailsByIndex: Record<number, HoleCardVisibilityDetail>
): Card[] {
  if (detail === "full" && Object.keys(detailsByIndex).length === 0) return cards;
  return cards.map((card, index) => {
    switch (detailsByIndex[index] ?? detail) {
      case "suit":
        return { suit: card.suit } as Card;
      case "rank":
        return { rank: card.rank } as Card;
      case "color":
        return { color: card.suit === "H" || card.suit === "D" ? "red" : "black" } as unknown as Card;
      case "hidden":
        return {} as Card;
      default:
        return card;
    }
  });
}

/**
 * Per-player mask cache. Skipping `conn.send` when the masked output is
 * byte-identical to the previous broadcast removes the dominant cost in
 * chatty rooms (every action triggers a broadcast, but most actions don't
 * change every player's view).
 */
export class MaskBroadcaster {
  /**
   * Cache entry per player: the last-broadcast payload AND the
   * `mutationVersion` at which it was produced. We replay the payload when
   * the version hasn't advanced AND the rebuilt payload is byte-identical;
   * a version bump invalidates the byte-comparison short-circuit so phase-
   * effect mutations always reach non-owners even if their masked view looks
   * the same on the wire.
   */
  private cacheByPlayer: Map<string, { payload: string; version: number }> = new Map();

  /** Drop a player's cache entry on disconnect to keep the map bounded. */
  forget(playerId: string): void {
    this.cacheByPlayer.delete(playerId);
  }

  /** Reset the entire cache (e.g., after `playAgain` rebuilds state). */
  reset(): void {
    this.cacheByPlayer.clear();
  }

  broadcast(
    state: ServerGameState,
    connections: Map<string, Party.Connection>
  ): void {
    // Build connId → playerId once instead of state.players.find per connection.
    const playerByConn = new Map<string, string>();
    for (const p of state.players) playerByConn.set(p.connId, p.id);

    const version = state.mutationVersion;
    for (const [connId, conn] of connections) {
      const playerId = playerByConn.get(connId) ?? "";
      const clientState = buildClientState(state, playerId);
      const payload = JSON.stringify({ type: "state", state: clientState });
      const previous = this.cacheByPlayer.get(playerId);
      if (previous && previous.version === version && previous.payload === payload) continue;
      this.cacheByPlayer.set(playerId, { payload, version });
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
