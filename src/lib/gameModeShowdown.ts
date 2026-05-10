import type { Card, Hand, Rank, Suit } from "./types";
import { getGameModeDefinition, type ScoreRule } from "./gameModes";
import type { SolvedHand } from "./gameMode/types";
import { dingEvaluator } from "../modes/ding/evaluator";

const RANK_VALUE: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const RED_SUITS = new Set<Suit>(["H", "D"]);
const BLACK_SUITS = new Set<Suit>(["C", "S"]);

export interface ModeShowdown {
  trueRanking: string[];
  trueRanks: Record<string, number>;
  madeHandNames: Record<string, string>;
}

interface RuleScore {
  values: number[];
  label: string;
}

export function computeShowdownForMode(
  modeId: string | undefined,
  hands: readonly Hand[],
  board: readonly Card[]
): ModeShowdown {
  const mode = getGameModeDefinition(modeId);
  const mutableHands = hands.slice();
  const mutableBoard = board.slice();
  const highRanking = dingEvaluator.trueRanking(mutableHands, mutableBoard);
  const highRanks = dingEvaluator.trueRanks(highRanking, mutableHands, mutableBoard);
  const solved = dingEvaluator.solveAll(mutableHands, mutableBoard);

  if (mode.score === "high") {
    return {
      trueRanking: highRanking,
      trueRanks: highRanks,
      madeHandNames: describeHighHands(mutableHands, solved),
    };
  }

  if (mode.score === "lowball") {
    const trueRanking = highRanking.slice().sort((a, b) => {
      const highRankDelta = (highRanks[b] ?? 0) - (highRanks[a] ?? 0);
      if (highRankDelta !== 0) return highRankDelta;
      return highRanking.indexOf(a) - highRanking.indexOf(b);
    });
    return {
      trueRanking,
      trueRanks: ranksFromOrdered(trueRanking, (a, b) => highRanks[a] === highRanks[b]),
      madeHandNames: Object.fromEntries(
        mutableHands.map((hand) => {
          const high = solved.get(hand.id);
          const description = high ? dingEvaluator.describe(high) : "Incomplete";
          return [hand.id, `Lowball: ${description}`];
        })
      ),
    };
  }

  const ruleScores = new Map<string, RuleScore>();
  for (const hand of mutableHands) {
    ruleScores.set(hand.id, scoreForRule(mode.score, hand, mutableBoard));
  }

  const trueRanking = mutableHands
    .map((hand) => hand.id)
    .sort((a, b) => {
      const primary = compareScore(ruleScores.get(b)!, ruleScores.get(a)!);
      if (primary !== 0) return primary;
      const highRankDelta = (highRanks[a] ?? 0) - (highRanks[b] ?? 0);
      if (highRankDelta !== 0) return highRankDelta;
      return highRanking.indexOf(a) - highRanking.indexOf(b);
    });

  return {
    trueRanking,
    trueRanks: ranksFromOrdered(trueRanking, (a, b) => {
      return compareScore(ruleScores.get(a)!, ruleScores.get(b)!) === 0 && highRanks[a] === highRanks[b];
    }),
    madeHandNames: Object.fromEntries(
      mutableHands.map((hand) => [hand.id, ruleScores.get(hand.id)!.label])
    ),
  };
}

export function countInversionsForRanks(
  claimedRanking: readonly (string | null)[],
  trueRanks: Record<string, number> | null
): number {
  if (!trueRanks) return 0;
  const claimed = claimedRanking.filter((id): id is string => id !== null);
  let inversions = 0;
  for (let i = 0; i < claimed.length; i++) {
    for (let j = i + 1; j < claimed.length; j++) {
      const left = trueRanks[claimed[i]];
      const right = trueRanks[claimed[j]];
      if (left === undefined || right === undefined) continue;
      if (left > right) inversions++;
    }
  }
  return inversions;
}

function describeHighHands(
  hands: readonly Hand[],
  solved: Map<string, SolvedHand | null>
): Record<string, string> {
  return Object.fromEntries(
    hands.map((hand) => {
      const high = solved.get(hand.id);
      return [hand.id, high ? dingEvaluator.describe(high) : "Incomplete"];
    })
  );
}

function ranksFromOrdered(
  ordered: readonly string[],
  sameRank: (a: string, b: string) => boolean
): Record<string, number> {
  const ranks: Record<string, number> = {};
  let rank = 1;
  for (let i = 0; i < ordered.length; i++) {
    if (i > 0 && !sameRank(ordered[i - 1], ordered[i])) rank++;
    ranks[ordered[i]] = rank;
  }
  return ranks;
}

function compareScore(a: RuleScore, b: RuleScore): number {
  const length = Math.max(a.values.length, b.values.length);
  for (let i = 0; i < length; i++) {
    const delta = (a.values[i] ?? 0) - (b.values[i] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

function scoreForRule(rule: ScoreRule, hand: Hand, board: readonly Card[]): RuleScore {
  const cards = hand.cards.concat(board);
  switch (rule) {
    case "flush":
      return flushScore(cards);
    case "straight":
      return straightScore(cards);
    case "pairs":
      return pairScore(cards);
    case "red":
      return colorScore(cards, RED_SUITS, "red");
    case "black":
      return colorScore(cards, BLACK_SUITS, "black");
    case "high":
    case "lowball":
      return { values: [0], label: "" };
  }
}

function flushScore(cards: readonly Card[]): RuleScore {
  const bySuit = new Map<Suit, number[]>();
  for (const card of cards) {
    const ranks = bySuit.get(card.suit) ?? [];
    ranks.push(RANK_VALUE[card.rank]);
    bySuit.set(card.suit, ranks);
  }
  let bestSuit: Suit = "S";
  let bestRanks: number[] = [];
  for (const [suit, ranks] of bySuit) {
    ranks.sort((a, b) => b - a);
    if (
      ranks.length > bestRanks.length ||
      (ranks.length === bestRanks.length && sum(ranks) > sum(bestRanks))
    ) {
      bestSuit = suit;
      bestRanks = ranks;
    }
  }
  return {
    values: [bestRanks.length, sum(bestRanks), ...bestRanks],
    label: `${bestRanks.length}-card ${suitName(bestSuit)} cluster`,
  };
}

function straightScore(cards: readonly Card[]): RuleScore {
  const ranks = new Set(cards.map((card) => RANK_VALUE[card.rank]));
  if (ranks.has(14)) ranks.add(1);
  const sorted = Array.from(ranks).sort((a, b) => a - b);
  let bestLength = 0;
  let currentLength = 0;
  let bestTop = 0;
  let previous = Number.NEGATIVE_INFINITY;
  for (const rank of sorted) {
    currentLength = rank === previous + 1 ? currentLength + 1 : 1;
    if (currentLength > bestLength || (currentLength === bestLength && rank > bestTop)) {
      bestLength = currentLength;
      bestTop = rank;
    }
    previous = rank;
  }
  return {
    values: [bestLength, bestTop],
    label: `${bestLength}-card run, ${rankName(bestTop)} high`,
  };
}

function pairScore(cards: readonly Card[]): RuleScore {
  const counts = new Map<number, number>();
  for (const card of cards) {
    const rank = RANK_VALUE[card.rank];
    counts.set(rank, (counts.get(rank) ?? 0) + 1);
  }
  const groups = Array.from(counts.entries()).sort((a, b) => {
    const countDelta = b[1] - a[1];
    return countDelta !== 0 ? countDelta : b[0] - a[0];
  });
  const bestCount = groups[0]?.[1] ?? 0;
  const multiGroups = groups.filter(([, count]) => count >= 2);
  const groupedRankSum = multiGroups.reduce((total, [rank, count]) => total + rank * count, 0);
  return {
    values: [bestCount, multiGroups.length, groupedRankSum, ...groups.flatMap(([rank, count]) => [count, rank])],
    label:
      multiGroups.length === 0
        ? "No pair pressure"
        : `${bestCount}-of-kind lead across ${multiGroups.length} group${multiGroups.length === 1 ? "" : "s"}`,
  };
}

function colorScore(cards: readonly Card[], suits: ReadonlySet<Suit>, name: string): RuleScore {
  const matchingRanks = cards
    .filter((card) => suits.has(card.suit))
    .map((card) => RANK_VALUE[card.rank])
    .sort((a, b) => b - a);
  return {
    values: [matchingRanks.length, sum(matchingRanks), ...matchingRanks],
    label: `${matchingRanks.length} ${name} card${matchingRanks.length === 1 ? "" : "s"}`,
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function suitName(suit: Suit): string {
  switch (suit) {
    case "H":
      return "heart";
    case "D":
      return "diamond";
    case "C":
      return "club";
    case "S":
      return "spade";
  }
}

function rankName(value: number): string {
  if (value === 14 || value === 1) return "A";
  if (value === 13) return "K";
  if (value === 12) return "Q";
  if (value === 11) return "J";
  if (value === 10) return "T";
  return String(value);
}
