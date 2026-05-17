import type { Card, Hand, Rank, Suit } from "../types";
import { RANK_VALUE } from "../rankValue";
import { incrementMapCount } from "../utils";
import type { QualifierId } from "./types";

/**
 * Qualifier registry — pure predicates evaluated at reveal. A qualifier
 * inspects the ranking, hands, and board and decides whether the round's
 * outcome stands. Failure does NOT void the ranking — the showdown still
 * returns the computed ranking — it surfaces a VOIDED badge so the table
 * sees the reason and the round can be replayed or excluded from scoring
 * downstream as the host wishes.
 */
interface QualifierContext {
  ranking: readonly string[];
  hands: readonly Hand[];
  board: readonly Card[];
}

export interface QualifierResult {
  ok: boolean;
  reason?: string;
}

export type Qualifier = (ctx: QualifierContext) => QualifierResult;

const FACE_RANKS = new Set<Rank>(["J", "Q", "K"]);
const RED_SUITS = new Set<Suit>(["H", "D"]);

function topHand(ctx: QualifierContext): Hand | undefined {
  const id = ctx.ranking[0];
  return ctx.hands.find((hand) => hand.id === id);
}

function fail(reason: string): QualifierResult {
  return { ok: false, reason };
}

const ok: QualifierResult = { ok: true };

/** True iff the 7-card pool contains 5 cards of the same suit. */
function hasFlush(cards: readonly Card[]): boolean {
  const bySuit = new Map<Suit, number>();
  for (const card of cards) incrementMapCount(bySuit, card.suit);
  for (const count of bySuit.values()) if (count >= 5) return true;
  return false;
}

/** True iff the cards contain at least one pair. */
function hasPair(cards: readonly Card[]): boolean {
  const counts = new Map<Rank, number>();
  for (const card of cards) {
    const next = (counts.get(card.rank) ?? 0) + 1;
    if (next >= 2) return true;
    counts.set(card.rank, next);
  }
  return false;
}

/** Returns max rank value minus min rank value across all hole cards in play. */
function holeRankSpread(hands: readonly Hand[]): number {
  let min = Infinity;
  let max = -Infinity;
  for (const hand of hands) {
    for (const card of hand.cards) {
      const v = RANK_VALUE[card.rank];
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return max - min;
}

const TIGHT_SPREAD_MAX = 4;
const WIDE_SPREAD_MIN = 9;

export const QUALIFIERS: Record<QualifierId, Qualifier> = {
  requireTopHandIsFlush: (ctx) => {
    const hand = topHand(ctx);
    if (!hand) return ok;
    return hasFlush(hand.cards.concat(ctx.board)) ? ok : fail("Top hand did not make a flush");
  },

  requireAllHandsPaired: (ctx) => {
    for (const hand of ctx.hands) {
      if (!hasPair(hand.cards.concat(ctx.board))) {
        return fail(`Hand ${hand.id} did not pair`);
      }
    }
    return ok;
  },

  requireTopHandNoFaceCards: (ctx) => {
    const hand = topHand(ctx);
    if (!hand) return ok;
    if (hand.cards.some((card) => FACE_RANKS.has(card.rank))) {
      return fail("Top hand contained a face card");
    }
    return ok;
  },

  requireAllHandsHaveFace: (ctx) => {
    for (const hand of ctx.hands) {
      if (!hand.cards.some((card) => FACE_RANKS.has(card.rank))) {
        return fail(`Hand ${hand.id} had no face card`);
      }
    }
    return ok;
  },

  requireTopHandRainbow: (ctx) => {
    const hand = topHand(ctx);
    if (!hand) return ok;
    const suits = new Set(hand.cards.map((card) => card.suit));
    return suits.size === hand.cards.length ? ok : fail("Top hand was not rainbow");
  },

  requireAdjacentTie: (ctx) => {
    if (ctx.ranking.length < 2) return ok;
    // Adjacent here means seat-adjacent: hand-1 and hand-2 must share a rank tier.
    // We approximate "tie" as: the two top-ranked hands' top-rank values match.
    const [aId, bId] = ctx.ranking;
    const a = ctx.hands.find((hand) => hand.id === aId);
    const b = ctx.hands.find((hand) => hand.id === bId);
    if (!a || !b) return ok;
    const aTop = Math.max(...a.cards.map((card) => RANK_VALUE[card.rank]));
    const bTop = Math.max(...b.cards.map((card) => RANK_VALUE[card.rank]));
    return aTop === bTop ? ok : fail("Top two hands did not tie");
  },

  requireTightSpread: (ctx) => {
    const spread = holeRankSpread(ctx.hands);
    return spread <= TIGHT_SPREAD_MAX
      ? ok
      : fail(`Hole-card spread ${spread} exceeded ${TIGHT_SPREAD_MAX}`);
  },

  requireWideSpread: (ctx) => {
    const spread = holeRankSpread(ctx.hands);
    return spread >= WIDE_SPREAD_MIN
      ? ok
      : fail(`Hole-card spread ${spread} below ${WIDE_SPREAD_MIN}`);
  },

  requireRedRiver: (ctx) => {
    const river = ctx.board[4] ?? ctx.board[ctx.board.length - 1];
    if (!river) return ok;
    return RED_SUITS.has(river.suit) ? ok : fail("River was not red");
  },

  requirePocketSourceTop: (ctx) => {
    const hand = topHand(ctx);
    if (!hand) return ok;
    // Approximation: at least one hole card's rank must equal the highest rank in the
    // top hand's 7-card pool. Without solver-internal best-5 information we cannot
    // confirm pocket sourcing precisely; this catches the common case.
    const pool = hand.cards.concat(ctx.board);
    if (pool.length === 0) return ok;
    const maxRank = Math.max(...pool.map((card) => RANK_VALUE[card.rank]));
    const matches = hand.cards.some((card) => RANK_VALUE[card.rank] === maxRank);
    return matches ? ok : fail("Top hand's strongest card came from the board");
  },

  requirePairToQualify: (ctx) => {
    const hand = topHand(ctx);
    if (!hand) return ok;
    return hasPair(hand.cards.concat(ctx.board)) ? ok : fail("Top hand had no pair");
  },

  excludePairTier: (ctx) => {
    const hand = topHand(ctx);
    if (!hand) return ok;
    // Top hand must beat pair tier — i.e. the pool must support more than a single pair.
    // Approximation: there must be EITHER two distinct paired ranks, OR a flush, OR a straight.
    const pool = hand.cards.concat(ctx.board);
    const counts = new Map<Rank, number>();
    for (const card of pool) incrementMapCount(counts, card.rank);
    const pairs = [...counts.values()].filter((n) => n >= 2).length;
    if (pairs >= 2 || [...counts.values()].some((n) => n >= 3)) return ok;
    if (hasFlush(pool)) return ok;
    // Straight check
    const sorted = [...counts.keys()].map((r) => RANK_VALUE[r]).sort((a, b) => a - b);
    if (sorted.includes(14)) sorted.unshift(1);
    let run = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        run++;
        if (run >= 5) return ok;
      } else if (sorted[i] !== sorted[i - 1]) {
        run = 1;
      }
    }
    return fail("Top hand was only a single pair (or weaker)");
  },
};
