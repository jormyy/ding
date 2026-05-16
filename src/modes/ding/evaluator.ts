/**
 * Ding's HandEvaluator — wraps pokersolver behind the GameMode contract so
 * the engine and AI never import pokersolver directly. Poker semantics live
 * here; non-poker modes won't supply an evaluator and the AI's poker-specific
 * candidate generators stay inactive.
 */

import { Hand as PokerHand } from "pokersolver";
import type { Card, Hand, Suit } from "../../lib/types";
import { POKER_SUITS, cardToPokersolverStr, normalizeSolverStrings } from "../../lib/utils";
import type {
  HandEvaluator,
  SolvedHand,
} from "../../lib/gameMode/types";

type RawSolved = ReturnType<typeof PokerHand.solve>;
const SUIT_BY_CODE: Record<Suit, typeof POKER_SUITS[number]> = {
  H: "h",
  D: "d",
  C: "c",
  S: "s",
};

function wrap(raw: RawSolved): SolvedHand {
  return {
    rank: (raw as unknown as { rank: number }).rank,
    name: ((raw as unknown as { name: string }).name) ?? "",
    raw,
  };
}

function unwrap(s: SolvedHand): RawSolved {
  return s.raw as RawSolved;
}

function solveOne(hole: Card[], boardStrs: string[]): RawSolved | null {
  if (hole.length < 1) return null;
  const strs = normalizeDuplicateCardsForSolver(hole, boardStrs);
  if (strs.length < 5) return null;
  return PokerHand.solve(strs);
}

export const dingEvaluator: HandEvaluator = {
  solveAll(hands: Hand[], board: Card[]): Map<string, SolvedHand | null> {
    const boardStrs = board.map(cardToPokersolverStr);
    const out = new Map<string, SolvedHand | null>();
    for (const h of hands) {
      const raw = solveOne(h.cards, boardStrs);
      out.set(h.id, raw ? wrap(raw) : null);
    }
    return out;
  },

  trueRanking(hands: Hand[], board: Card[]): string[] {
    const solved = this.solveAll(hands, board);
    const list = hands.map((h) => ({ id: h.id, solved: solved.get(h.id) }));
    // Hands without enough cards sort last (treated as weakest).
    list.sort((a, b) => {
      if (!a.solved && !b.solved) return 0;
      if (!a.solved) return 1;
      if (!b.solved) return -1;
      const winners = PokerHand.winners([unwrap(a.solved), unwrap(b.solved)]);
      if (winners.length === 2) return 0;
      return winners[0] === unwrap(a.solved) ? -1 : 1;
    });
    return list.map((x) => x.id);
  },

  trueRanks(
    trueRanking: string[],
    hands: Hand[],
    board: Card[]
  ): Record<string, number> {
    const solved = this.solveAll(hands, board);
    const ranks: Record<string, number> = {};
    let rank = 1;
    for (let i = 0; i < trueRanking.length; i++) {
      if (i === 0) {
        ranks[trueRanking[i]] = rank;
        continue;
      }
      const prev = solved.get(trueRanking[i - 1]);
      const curr = solved.get(trueRanking[i]);
      if (!prev || !curr) {
        rank++;
        ranks[trueRanking[i]] = rank;
        continue;
      }
      const winners = PokerHand.winners([unwrap(prev), unwrap(curr)]);
      if (winners.length !== 2) rank++;
      ranks[trueRanking[i]] = rank;
    }
    return ranks;
  },

  countInversions(
    claimedRanking: (string | null)[],
    trueRanking: string[],
    hands: Hand[],
    board: Card[]
  ): number {
    const claimed = claimedRanking.filter((id): id is string => id !== null);
    const solved = this.solveAll(hands, board);
    const truePos = new Map<string, number>();
    let pos = 0;
    for (let i = 0; i < trueRanking.length; i++) {
      if (i === 0) {
        truePos.set(trueRanking[i], pos);
        continue;
      }
      const prev = solved.get(trueRanking[i - 1]);
      const curr = solved.get(trueRanking[i]);
      if (!prev || !curr) {
        pos++;
        truePos.set(trueRanking[i], pos);
        continue;
      }
      const winners = PokerHand.winners([unwrap(prev), unwrap(curr)]);
      if (winners.length === 2) {
        truePos.set(trueRanking[i], pos);
      } else {
        pos++;
        truePos.set(trueRanking[i], pos);
      }
    }
    let inv = 0;
    for (let i = 0; i < claimed.length; i++) {
      for (let j = i + 1; j < claimed.length; j++) {
        const pi = truePos.get(claimed[i]);
        const pj = truePos.get(claimed[j]);
        if (pi === undefined || pj === undefined) continue;
        if (pi > pj) inv++;
      }
    }
    return inv;
  },

  describe(solved: SolvedHand): string {
    const raw = solved.raw as { descr?: string; name?: string };
    return raw.descr ?? raw.name ?? "";
  },
};

function normalizeDuplicateCardsForSolver(hole: Card[], boardStrs: string[]): string[] {
  const cards = hole.map(cardToPokersolverStr).concat(boardStrs);
  return normalizeSolverStrings(cards).sort((a, b) => {
    const rankDelta = a.slice(0, -1).localeCompare(b.slice(0, -1));
    if (rankDelta !== 0) return rankDelta;
    return POKER_SUITS.indexOf(suitCode(a)) - POKER_SUITS.indexOf(suitCode(b));
  });
}

function suitCode(card: string): typeof POKER_SUITS[number] {
  const code = card.slice(-1);
  return POKER_SUITS.includes(code as typeof POKER_SUITS[number])
    ? code as typeof POKER_SUITS[number]
    : SUIT_BY_CODE.S;
}
