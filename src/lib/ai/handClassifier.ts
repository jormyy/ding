// Bot hand-texture understanding: what kind of hand am I holding?
//
// pokersolver tells us the made 5-card hand, but bots need to understand
// draws, speculative holdings, and how hand strength evolves across phases.
// A human player thinks "I have top pair with a flush draw" — the bot should too.

import type { Card, Rank } from "../types";
import { Hand as PokerHand } from "pokersolver";
import { cardToPokersolverStr } from "../utils";

export type DrawType =
  | "flush-draw"
  | "open-ended-straight-draw"
  | "double-gutshot"
  | "gutshot-straight-draw"
  | "overcards";

export type ClassifiedHand = {
  handName: string;           // pokersolver human name (e.g. "Two Pair", "Flush")
  handRank: number;           // pokersolver rank for strength comparison
  madeHandType: string | null; // "high-card", "pair", "two-pair", "set", "straight", "flush", "full-house", "quads", "straight-flush"
  draws: DrawType[];          // active draws
  isSpeculative: boolean;     // hand improves substantially with more board cards
  isCoordinated: boolean;     // suited, connected, or paired — good starting texture
  strengthStability: number;  // 0–1: how much this hand's rank can change from board runouts
  highCardRank: number;       // 2–14 for the highest hole card (for tiebreaks)
};

const RANK_VALUE: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  T: 10, J: 11, Q: 12, K: 13, A: 14,
};

// Maps pokersolver rank to our simplified made-hand type.
// pokersolver ranks: 1=High Card, 2=Pair, 3=Two Pair, 4=Three of a Kind,
// 5=Straight, 6=Flush, 7=Full House, 8=Four of a Kind, 9=Straight Flush
const RANK_TO_TYPE: Record<number, string> = {
  1: "high-card",
  2: "pair",
  3: "two-pair",
  4: "three-of-a-kind",
  5: "straight",
  6: "flush",
  7: "full-house",
  8: "quads",
  9: "straight-flush",
};

function rankVal(r: Rank): number {
  return RANK_VALUE[r] ?? 0;
}

function uniqueRanks(cards: Card[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const c of cards) {
    const v = rankVal(c.rank);
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  out.sort((a, b) => a - b);
  return out;
}

function detectFlushDraw(cards: Card[]): boolean {
  for (const s of ["H", "D", "C", "S"] as const) {
    if (cards.filter((c) => c.suit === s).length === 4) return true;
  }
  return false;
}

function detectStraightDraws(cards: Card[]): {
  openEnded: boolean;
  gutshot: boolean;
  doubleGutshot: boolean;
} {
  const ranks = uniqueRanks(cards);
  if (ranks.length < 4) return { openEnded: false, gutshot: false, doubleGutshot: false };

  const hasAce = ranks.includes(14);
  const work = hasAce ? [...ranks, 1] : [...ranks];
  const rankSet = new Set(work);

  let openEnded = false;
  let gutshot = false;
  let gutCount = 0;

  // Check each 4-consecutive-rank run we hold.
  for (let r = 1; r <= 11; r++) {
    const run = [r, r + 1, r + 2, r + 3];
    if (!run.every((x) => rankSet.has(x))) continue;
    const hasBelow = rankSet.has(r - 1);
    const hasAbove = rankSet.has(r + 4);
    if (hasBelow && hasAbove) continue; // made 5-card straight
    if (!hasBelow && !hasAbove) {
      openEnded = true;
    } else {
      gutshot = true;
      gutCount++;
    }
  }

  // Also check broken runs with one gap (gutshot in the middle).
  for (let w = 1; w <= 10; w++) {
    const window = [w, w + 1, w + 2, w + 3, w + 4];
    const hits = window.filter((x) => rankSet.has(x));
    if (hits.length !== 4) continue;
    const missing = window.find((x) => !rankSet.has(x))!;
    if (missing > w && missing < w + 4) {
      gutshot = true;
      gutCount++;
    }
  }

  return { openEnded, gutshot, doubleGutshot: gutCount >= 2 };
}

function stabilityScore(handRank: number, cards: Card[], board: Card[]): number {
  // Made hands with high rank are stable. Draws are unstable.
  // Also stable: overpairs on a dry board. Unstable: bottom pair.
  if (handRank >= 7) return 0.9;  // full-house+ → very stable
  if (handRank === 6) return 0.85; // flush → very stable
  if (handRank === 5) return 0.75; // straight → quite stable
  if (handRank === 4) return 0.7;  // three of a kind → stable
  if (handRank === 3) return 0.55; // two pair → moderate
  if (handRank === 2) return 0.4;  // pair → volatile

  // High card: has draws? → very unstable. No draws? → somewhat stable.
  const allCards = [...cards, ...board];
  const flush = detectFlushDraw(allCards);
  const { openEnded, doubleGutshot } = detectStraightDraws(allCards);
  if (flush || openEnded || doubleGutshot) return 0.2;
  return 0.35;
}

function isCoordinated(cards: Card[]): boolean {
  if (cards.length === 0) return false;
  const suited = cards.every((c) => c.suit === cards[0].suit);
  if (suited && cards.length >= 2) return true;
  if (cards.length < 2) return false;
  const r1 = rankVal(cards[0].rank);
  const r2 = rankVal(cards[1].rank);
  const gap = Math.abs(r1 - r2);
  if (gap <= 2) return true;
  if (r1 === r2) return true;
  return false;
}

export function classifyHand(hole: Card[], board: Card[]): ClassifiedHand {
  if (hole.length === 0) {
    return {
      handName: "Unknown",
      handRank: 0,
      madeHandType: null,
      draws: [],
      isSpeculative: false,
      isCoordinated: false,
      strengthStability: 0.3,
      highCardRank: 7,
    };
  }

  if (hole.length < 2) {
    const hi = Math.max(...hole.map((c) => rankVal(c.rank)));
    return {
      handName: "Single card",
      handRank: 0,
      madeHandType: null,
      draws: [],
      isSpeculative: false,
      isCoordinated: false,
      strengthStability: 0.3,
      highCardRank: hi,
    };
  }

  const allCards = [...hole, ...board];
  let handName = "High Card";
  let handRank = 0;
  let madeHandType: string | null = "high-card";

  if (allCards.length >= 5) {
    const strs = allCards.map(cardToPokersolverStr);
    const ph = PokerHand.solve(strs);
    handName = ph.name;
    handRank = ph.rank;
    madeHandType = RANK_TO_TYPE[ph.rank] ?? "high-card";
  }

  // Detect draws (only meaningful when board has cards and no made hand above two-pair)
  const draws: DrawType[] = [];
  let isSpeculative = false;
  if (board.length > 0 && handRank <= 2) {
    if (detectFlushDraw(allCards)) {
      draws.push("flush-draw");
      isSpeculative = true;
    }
    const sd = detectStraightDraws(allCards);
    if (sd.doubleGutshot) {
      draws.push("double-gutshot");
      isSpeculative = true;
    }
    if (sd.openEnded) {
      draws.push("open-ended-straight-draw");
      isSpeculative = true;
    } else if (sd.gutshot) {
      draws.push("gutshot-straight-draw");
      isSpeculative = true;
    }
  }

  // Overcards: hole cards higher than every board card
  const highestBoard = board.length > 0
    ? Math.max(...board.map((c) => rankVal(c.rank)))
    : 0;
  if (handRank <= 1 && hole.every((c) => rankVal(c.rank) > highestBoard) && board.length >= 3) {
    draws.push("overcards");
    isSpeculative = true;
  }

  const stability = stabilityScore(handRank, hole, board);
  const coordinated = isCoordinated(hole);
  const hi = Math.max(...hole.map((c) => rankVal(c.rank)));

  return {
    handName,
    handRank,
    madeHandType,
    draws,
    isSpeculative,
    isCoordinated: coordinated,
    strengthStability: stability,
    highCardRank: hi,
  };
}
