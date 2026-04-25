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

function preflopStrength(hole: Card[]): number {
  // Returns a [0, 1] score derived from Chen-style preflop heuristics.
  if (hole.length !== 2) return 0.5;
  const [a, b] = hole;
  const hi = Math.max(RANK_VALUE[a.rank], RANK_VALUE[b.rank]);
  const lo = Math.min(RANK_VALUE[a.rank], RANK_VALUE[b.rank]);
  const suited = a.suit === b.suit;
  const pair = a.rank === b.rank;
  const gap = hi - lo; // 0 = pair (handled separately)

  let score: number;
  if (pair) {
    // Pairs: 22 ≈ 0.50, AA = 1.0
    score = 0.50 + ((hi - 2) / 12) * 0.50;
  } else {
    // High-card foundation
    score = (hi / 14) * 0.55 + (lo / 14) * 0.25;
    if (suited) score += 0.05;
    if (gap === 1) score += 0.04; // connector
    else if (gap === 2) score += 0.02;
    else if (gap >= 5) score -= 0.04;
    if (hi >= 12 && lo >= 10) score += 0.04; // broadway
  }

  return Math.max(0, Math.min(1, score));
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function estimateStrength(
  hole: Card[],
  board: Card[],
  fieldSize: number,
  nSims: number = 40
): number {
  if (hole.length === 0) return 0.5;

  // Preflop fast path — high-card pokersolver rank doesn't distinguish pocket
  // pairs from random trash well enough.
  if (board.length === 0) {
    return preflopStrength(hole);
  }

  if (fieldSize <= 0) return 0.5;

  const used = new Set<string>();
  for (const c of hole) used.add(cardKey(c));
  for (const c of board) used.add(cardKey(c));
  const remaining: Card[] = createDeck().filter((c) => !used.has(cardKey(c)));

  // How many extra board cards we still need to draw each sim.
  const boardToDraw = Math.max(0, 5 - board.length);
  // Cards needed per sim: remaining board + 2 per opponent
  const need = boardToDraw + fieldSize * 2;

  if (need > remaining.length) {
    // Not enough cards to simulate — degrade gracefully.
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
        totalBeats += 0.5; // tie
      } else if (winners[0] === mine) {
        totalBeats += 1;
      }
      totalCompared += 1;
    }
  }

  if (totalCompared === 0) return 0.5;
  return totalBeats / totalCompared;
}
