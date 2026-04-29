import type { Card, Rank } from "../types";
import { cardToPokersolverStr } from "../utils";
import { createDeck } from "../deckUtils";

import { Hand as PokerHand } from "pokersolver";

const RANK_VALUE: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  T: 10, J: 11, Q: 12, K: 13, A: 14,
};

function cardKey(c: Card): string {
  return c.rank + c.suit;
}

/**
 * Tier-based preflop scoring per the strategy guide.
 *
 * Tier 1  (pairs):     0.80–1.00 — every pair beats every non-pair.
 * Tier 2  (A-high):    0.60–0.78
 * Tier 3  (K-high):    0.45–0.58
 * Tier 4  (Q-high):    0.32–0.43
 * Tier 5  (J-high):    0.22–0.30
 * Tier 6  (4..10-hi):  0.10–0.20
 * Bottom  (32/23):     0.05
 *
 * Suits/connectors/gaps are deliberately ignored — this is a coordination
 * convention shared with humans following the same guide.
 */
export function preflopTierStrength(hole: Card[]): number {
  if (hole.length !== 2) return 0.5;
  const a = RANK_VALUE[hole[0].rank];
  const b = RANK_VALUE[hole[1].rank];
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);

  if (hi === lo) {
    // Pairs: 22=0.80, AA=1.00.
    return 0.80 + ((hi - 2) / 12) * 0.20;
  }

  if (hi === 14) {
    // Ace-high: AK=0.78, A2=0.60.
    return 0.60 + ((lo - 2) / 11) * 0.18;
  }
  if (hi === 13) {
    // King-high: KQ=0.58, K2=0.45.
    return 0.45 + ((lo - 2) / 10) * 0.13;
  }
  if (hi === 12) {
    // Queen-high: QJ=0.43, Q2=0.32.
    return 0.32 + ((lo - 2) / 9) * 0.11;
  }
  if (hi === 11) {
    // Jack-high: JT=0.30, J2=0.22.
    return 0.22 + ((lo - 2) / 8) * 0.08;
  }
  if (hi >= 4 && hi <= 10) {
    // T-high through 4-high: 0.10–0.20.
    return 0.10 + ((hi - 4) / 6) * 0.06 + ((lo - 2) / 8) * 0.04;
  }
  // 32 / 23 — explicit bottom anchor.
  return 0.05;
}

// pokersolver rank: 1=High Card, 2=Pair, 3=Two Pair, 4=Three of a Kind,
// 5=Straight, 6=Flush, 7=Full House, 8=Quads, 9=Straight Flush.

/**
 * "Rank what you have, not what you could have."
 *
 * Returns a strength score for the bot's actual current made hand on the
 * cards visible so far — never crediting future-card draw equity. A flush
 * draw on the flop with no pair returns the low-end "high card" score, not
 * the equity it'd have at showdown.
 */
export function currentHandStrength(hole: Card[], board: Card[]): number {
  if (hole.length < 2) return 0.10;

  // Preflop: tier-based score (no made hand to read).
  if (board.length === 0) return preflopTierStrength(hole);

  const all = [...hole, ...board];
  const ph = PokerHand.solve(all.map(cardToPokersolverStr));
  const rank = ph.rank;

  if (rank === 9) {
    // Straight flush / royal flush. Royal = top straight, treat marginally higher.
    const isRoyal = /royal/i.test(ph.name ?? "");
    return isRoyal ? 1.00 : 0.97;
  }
  if (rank === 8) return 0.93; // quads
  if (rank === 7) return 0.88; // full house
  if (rank === 6) return 0.80; // flush
  if (rank === 5) return 0.72; // straight
  if (rank === 4) return 0.62; // three of a kind

  if (rank === 3) {
    // Two pair: bonus for top-two.
    const topBoard = Math.max(...board.map((c) => RANK_VALUE[c.rank]));
    const holeRanks = hole.map((c) => RANK_VALUE[c.rank]);
    const topTwo = holeRanks.every((r) => r >= topBoard);
    return topTwo ? 0.55 : 0.52;
  }

  if (rank === 2) {
    // Pair: overpair > top-pair > middle > under.
    const boardRanks = board.map((c) => RANK_VALUE[c.rank]);
    const topBoard = Math.max(...boardRanks);
    const holeRanks = hole.map((c) => RANK_VALUE[c.rank]);
    // Find the pair rank.
    const ranks = [...hole, ...board].map((c) => RANK_VALUE[c.rank]);
    const counts = new Map<number, number>();
    for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
    let pairRank = 0;
    for (const [r, n] of counts) {
      if (n >= 2 && r > pairRank) pairRank = r;
    }
    if (pairRank === 0) return 0.35;
    const isPocketPair = holeRanks[0] === holeRanks[1];
    if (isPocketPair && pairRank > topBoard) return 0.45; // overpair
    if (pairRank === topBoard) return 0.40;               // top pair
    if (pairRank > Math.min(...boardRanks)) return 0.37;  // middle pair
    return 0.35;                                          // under pair
  }

  // High card: scale by hole-card kicker, A=top.
  const hiHole = Math.max(RANK_VALUE[hole[0].rank], RANK_VALUE[hole[1].rank]);
  return 0.10 + ((hiHole - 2) / 12) * 0.15;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Monte-Carlo win-rate against random opponents.
 *
 * Used by `range.ts` and for inferring unknown teammates' hand strength —
 * NOT for the bot's own made-hand score (use `currentHandStrength` for that).
 *
 * - Preflop: returns the tier score (no rollouts needed).
 * - Postflop: random rollouts to showdown via pokersolver.
 */
export function estimateStrength(
  hole: Card[],
  board: Card[],
  fieldSize: number,
  nSims: number = 40
): number {
  if (hole.length === 0) return 0.5;

  if (board.length === 0) {
    return preflopTierStrength(hole);
  }

  if (fieldSize <= 0) return 0.5;

  const used = new Set<string>();
  for (const c of hole) used.add(cardKey(c));
  for (const c of board) used.add(cardKey(c));
  const remaining: Card[] = createDeck().filter((c) => !used.has(cardKey(c)));

  const boardToDraw = Math.max(0, 5 - board.length);
  const need = boardToDraw + fieldSize * 2;

  if (need > remaining.length) {
    return 0.5;
  }

  const myHoleStrs = hole.map(cardToPokersolverStr);
  const baseBoardStrs = board.map(cardToPokersolverStr);

  let totalBeats = 0;
  let totalCompared = 0;

  for (let s = 0; s < nSims; s++) {
    shuffleInPlace(remaining);

    const drawBoard = remaining.slice(0, boardToDraw).map(cardToPokersolverStr);
    const fullBoard = baseBoardStrs.concat(drawBoard);

    const mine = PokerHand.solve(myHoleStrs.concat(fullBoard));

    let offset = boardToDraw;
    for (let o = 0; o < fieldSize; o++) {
      const oppHole = [
        cardToPokersolverStr(remaining[offset]),
        cardToPokersolverStr(remaining[offset + 1]),
      ];
      offset += 2;
      const opp = PokerHand.solve(oppHole.concat(fullBoard));
      const winners = PokerHand.winners([mine, opp]);
      if (winners.length === 2) {
        totalBeats += 0.5;
      } else if (winners[0] === mine) {
        totalBeats += 1;
      }
      totalCompared += 1;
    }
  }

  if (totalCompared === 0) return 0.5;
  return totalBeats / totalCompared;
}
