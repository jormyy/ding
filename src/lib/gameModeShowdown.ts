import type { Card, Hand, Rank, Suit } from "./types";
import { getGameModeDefinition, type ScoreRule } from "./gameModes";
import type { SolvedHand } from "./gameMode/types";
import { dingEvaluator } from "../modes/ding/evaluator";
import { Hand as PokerHand } from "pokersolver";
import { cardToPokersolverStr } from "./utils";

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
const RANKS: readonly Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const SUITS: readonly Suit[] = ["H", "D", "C", "S"];
const POKER_SUITS = ["h", "d", "c", "s"] as const;
const INVERTED_RANK: Record<Rank, Rank> = {
  A: "2",
  K: "3",
  Q: "4",
  J: "5",
  T: "6",
  "9": "7",
  "8": "8",
  "7": "9",
  "6": "T",
  "5": "J",
  "4": "Q",
  "3": "K",
  "2": "A",
};
type RawPokerSolved = ReturnType<typeof PokerHand.solve>;

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
  if (mode.score === "high" && mode.deal.boards?.scoring === "best") {
    return computeBestBoardHighShowdown(mode.id, mutableHands, mutableBoard);
  }
  const scoringBoard = mode.deal.scoreCommunityCards === undefined
    ? mutableBoard
    : mutableBoard.slice(0, mode.deal.scoreCommunityCards);
  const evaluatedHands = filterHandsForMode(mode, mutableHands);
  const evaluatedBoard = filterCardsForMode(mode, scoringBoard);

  if (
    mode.score === "high" &&
    (mode.wildCards || mode.rankTransform || mode.syntheticPair || mode.suitTransform || mode.identityResolution)
  ) {
    return computeConfiguredHighShowdown(mode, evaluatedHands, evaluatedBoard);
  }

  const highRanking = dingEvaluator.trueRanking(evaluatedHands, evaluatedBoard);
  const highRanks = dingEvaluator.trueRanks(highRanking, evaluatedHands, evaluatedBoard);
  const solved = dingEvaluator.solveAll(evaluatedHands, evaluatedBoard);

  if (mode.score === "high") {
    const trueRanking = applyMetaRankForces(mode, highRanking, evaluatedHands);
    return {
      trueRanking,
      trueRanks: ranksFromOrdered(trueRanking, (a, b) => {
        return metaForceBucket(mode, a, evaluatedHands) === metaForceBucket(mode, b, evaluatedHands) &&
          highRanks[a] === highRanks[b];
      }),
      madeHandNames: describeHighHands(evaluatedHands, solved),
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
        evaluatedHands.map((hand) => {
          const high = solved.get(hand.id);
          const description = high ? dingEvaluator.describe(high) : "Incomplete";
          return [hand.id, `Lowball: ${description}`];
        })
      ),
    };
  }

  const ruleScores = new Map<string, RuleScore>();
  for (const hand of mutableHands) {
    ruleScores.set(hand.id, scoreForRule(mode.score, hand, evaluatedBoard));
  }

  const trueRanking = evaluatedHands
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
      evaluatedHands.map((hand) => [hand.id, ruleScores.get(hand.id)!.label])
    ),
  };
}

function computeConfiguredHighShowdown(
  mode: ReturnType<typeof getGameModeDefinition>,
  hands: readonly Hand[],
  board: readonly Card[]
): ModeShowdown {
  const solvedByHand = new Map<string, RawPokerSolved | null>();
  for (const hand of hands) {
    solvedByHand.set(hand.id, solveConfiguredHighHand(mode, hand.cards, board));
  }

  const trueRanking = hands.map((hand) => hand.id).sort((a, b) => {
    const left = solvedByHand.get(a);
    const right = solvedByHand.get(b);
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    const winners = PokerHand.winners([left, right]);
    if (winners.length === 2) return 0;
    return winners[0] === left ? -1 : 1;
  });

  const label = mode.wildCards ? "Wild" : mode.identityResolution ? "Identity" : "Inverted";
  return {
    trueRanking,
    trueRanks: ranksFromOrdered(trueRanking, (a, b) => {
      const left = solvedByHand.get(a);
      const right = solvedByHand.get(b);
      if (!left || !right) return left === right;
      return PokerHand.winners([left, right]).length === 2;
    }),
    madeHandNames: Object.fromEntries(
      hands.map((hand) => {
        const solved = solvedByHand.get(hand.id);
        return [hand.id, solved ? `${label}: ${describeRaw(solved)}` : "Incomplete"];
      })
    ),
  };
}

function solveConfiguredHighHand(
  mode: ReturnType<typeof getGameModeDefinition>,
  hole: readonly Card[],
  board: readonly Card[]
): RawPokerSolved | null {
  let best: RawPokerSolved | null = null;
  for (const identityCards of possibleIdentityVariants(hole.concat(board))) {
    const solved = solveConfiguredHighCards(mode, identityCards, hole.length);
    if (!solved) continue;
    if (!best) {
      best = solved;
      continue;
    }
    const winners = PokerHand.winners([best, solved]);
    if (winners.length === 1 && winners[0] === solved) best = solved;
  }
  return best;
}

function solveConfiguredHighCards(
  mode: ReturnType<typeof getGameModeDefinition>,
  sourceCards: readonly Card[],
  holeLength: number
): RawPokerSolved | null {
  const cards = addSyntheticPairCards(mode, transformSuitsForMode(mode, sourceCards), holeLength);
  const wildIndexes = cards
    .map((card, index) => isWildCard(mode, card) ? index : -1)
    .filter((index) => index !== -1);
  let best: RawPokerSolved | null = null;
  if (wildIndexes.length > 2) {
    const assigned = wildIndexes.map((_, index) => bestEffortWildCandidate(index));
    const replaced = cards.map((card, index) => {
      const assignedIndex = wildIndexes.indexOf(index);
      return assignedIndex === -1 ? card : assigned[assignedIndex];
    });
    const strs = normalizeSolverStrings(replaced.map((card) => cardToModeSolverStr(mode, card)));
    return strs.length < 5 ? null : PokerHand.solve(strs);
  }

  const walk = (wildOffset: number, assigned: Card[]) => {
    if (wildOffset === wildIndexes.length) {
      const replaced = cards.map((card, index) => {
        const assignedIndex = wildIndexes.indexOf(index);
        return assignedIndex === -1 ? card : assigned[assignedIndex];
      });
      const strs = normalizeSolverStrings(replaced.map((card) => cardToModeSolverStr(mode, card)));
      if (strs.length < 5) return;
      const solved = PokerHand.solve(strs);
      if (!best) {
        best = solved;
        return;
      }
      const winners = PokerHand.winners([best, solved]);
      if (winners.length === 1 && winners[0] === solved) best = solved;
      return;
    }

    for (const candidate of standardCandidateCards()) {
      assigned.push(candidate);
      walk(wildOffset + 1, assigned);
      assigned.pop();
    }
  };

  walk(0, []);
  return best;
}

function possibleIdentityVariants(cards: readonly Card[]): Card[][] {
  const identityIndexes = cards
    .map((card, index) => (card.possibleIdentities?.length ?? 0) > 0 ? index : -1)
    .filter((index) => index !== -1)
    .slice(0, 8);
  if (identityIndexes.length === 0) return [cards.map(stripPossibleIdentities)];

  const variants: Card[][] = [];
  const walk = (offset: number, current: Card[]) => {
    if (offset === identityIndexes.length) {
      variants.push(current.map(stripPossibleIdentities));
      return;
    }
    const index = identityIndexes[offset];
    const identities = cards[index].possibleIdentities ?? [cards[index]];
    for (const identity of identities) {
      const next = current.slice();
      next[index] = identity;
      walk(offset + 1, next);
    }
  };

  walk(0, cards.slice());
  return variants;
}

function stripPossibleIdentities(card: Card): Card {
  const { possibleIdentities: _possibleIdentities, ...rest } = card;
  return { ...rest };
}

function isWildCard(mode: ReturnType<typeof getGameModeDefinition>, card: Card): boolean {
  const wild = mode.wildCards;
  if (!wild) return false;
  return Boolean(
    (card.meta && wild.metas?.includes(card.meta)) ||
    wild.ranks?.includes(card.rank) ||
    wild.suits?.includes(card.suit)
  );
}

function standardCandidateCards(): Card[] {
  const out: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) out.push({ rank, suit });
  }
  return out;
}

function bestEffortWildCandidate(index: number): Card {
  const ranks: readonly Rank[] = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  return { rank: ranks[index % ranks.length], suit: SUITS[index % SUITS.length] };
}

function cardToModeSolverStr(mode: ReturnType<typeof getGameModeDefinition>, card: Card): string {
  if (mode.rankTransform !== "inverted") return cardToPokersolverStr(card);
  return cardToPokersolverStr({ ...card, rank: INVERTED_RANK[card.rank] });
}

function transformSuitsForMode(mode: ReturnType<typeof getGameModeDefinition>, cards: readonly Card[]): Card[] {
  if (mode.suitTransform !== "color") return cards.slice();
  return cards.map((card) => ({
    ...card,
    suit: card.suit === "H" || card.suit === "D" ? "H" : "S",
  }));
}

function addSyntheticPairCards(
  mode: ReturnType<typeof getGameModeDefinition>,
  cards: readonly Card[],
  holeCount: number
): Card[] {
  if (!mode.syntheticPair) return cards.slice();
  const found = syntheticPairCard(mode.syntheticPair, cards, holeCount);
  return found ? cards.concat(found) : cards.slice();
}

function syntheticPairCard(kind: "adjacent" | "spread", cards: readonly Card[], holeCount: number): Card | null {
  const indexed = cards
    .map((card, index) => ({ card, originalIndex: index }))
    .sort((a, b) => RANK_VALUE[a.card.rank] - RANK_VALUE[b.card.rank]);
  for (let i = indexed.length - 1; i >= 0; i--) {
    for (let j = 0; j < indexed.length; j++) {
      if (i === j) continue;
      if (indexed[i].originalIndex >= holeCount && indexed[j].originalIndex >= holeCount) continue;
      const left = indexed[i].card;
      const right = indexed[j].card;
      const distance = Math.abs(RANK_VALUE[left.rank] - RANK_VALUE[right.rank]);
      if (kind === "adjacent" && distance === 1) return { ...left, suit: nextSuit(left.suit) };
      if (kind === "spread" && distance >= 8) return { ...left, suit: nextSuit(left.suit) };
    }
  }
  return null;
}

function nextSuit(suit: Suit): Suit {
  const index = SUITS.indexOf(suit);
  return SUITS[(index + 1) % SUITS.length];
}

function normalizeSolverStrings(cards: readonly string[]): string[] {
  const used = new Set<string>();
  const out: string[] = [];
  for (const raw of cards) {
    if (!used.has(raw)) {
      used.add(raw);
      out.push(raw);
      continue;
    }
    const rank = raw.slice(0, -1);
    const replacement = POKER_SUITS
      .map((suit) => `${rank}${suit}`)
      .find((candidate) => !used.has(candidate));
    if (!replacement) continue;
    used.add(replacement);
    out.push(replacement);
  }
  return out;
}

function describeRaw(raw: RawPokerSolved): string {
  const solved = raw as { descr?: string; name?: string };
  return solved.descr ?? solved.name ?? "";
}

function filterHandsForMode(
  mode: ReturnType<typeof getGameModeDefinition>,
  hands: readonly Hand[]
): Hand[] {
  if (!mode.excludedRanks) return hands.slice();
  return hands.map((hand) => ({
    ...hand,
    cards: filterCardsForMode(mode, hand.cards),
    cardCount: hand.cardCount,
  }));
}

function filterCardsForMode(
  mode: ReturnType<typeof getGameModeDefinition>,
  cards: readonly Card[]
): Card[] {
  const excludedRanks = mode.excludedRanks;
  const excludedMetas = mode.excludedMetas;
  if ((!excludedRanks || excludedRanks.length === 0) && (!excludedMetas || excludedMetas.length === 0)) {
    return cards.slice();
  }
  return cards.filter((card) => {
    if (excludedRanks?.includes(card.rank)) return false;
    if (card.meta && excludedMetas?.includes(card.meta)) return false;
    return true;
  });
}

function applyMetaRankForces(
  mode: ReturnType<typeof getGameModeDefinition>,
  ranking: readonly string[],
  hands: readonly Hand[]
): string[] {
  if (!mode.forceRankByMeta) return ranking.slice();
  return ranking.slice().sort((a, b) => {
    const bucketDelta = metaForceBucket(mode, a, hands) - metaForceBucket(mode, b, hands);
    if (bucketDelta !== 0) return bucketDelta;
    return ranking.indexOf(a) - ranking.indexOf(b);
  });
}

function metaForceBucket(
  mode: ReturnType<typeof getGameModeDefinition>,
  handId: string,
  hands: readonly Hand[]
): number {
  const hand = hands.find((candidate) => candidate.id === handId);
  if (!hand) return 1;
  if (mode.forceRankByMeta?.first && hand.cards.some((card) => card.meta === mode.forceRankByMeta?.first)) return 0;
  if (mode.forceRankByMeta?.last && hand.cards.some((card) => card.meta === mode.forceRankByMeta?.last)) return 2;
  return 1;
}

function computeBestBoardHighShowdown(
  modeId: string,
  hands: readonly Hand[],
  board: readonly Card[]
): ModeShowdown {
  const mode = getGameModeDefinition(modeId);
  const boards = scoringBoards(board, mode.deal.boards!);
  const solvedByHand = new Map<string, SolvedHand | null>();
  const boardIndexByHand = new Map<string, number | null>();

  for (const hand of hands) {
    let best: SolvedHand | null = null;
    let bestBoardIndex: number | null = null;
    boards.forEach((candidateBoard, boardIndex) => {
      const candidate = dingEvaluator.solveAll([hand], candidateBoard).get(hand.id) ?? null;
      if (!candidate) return;
      if (!best) {
        best = candidate;
        bestBoardIndex = boardIndex;
        return;
      }
      const winners = PokerHand.winners([rawSolved(best), rawSolved(candidate)]);
      if (winners.length === 1 && winners[0] === candidate.raw) {
        best = candidate;
        bestBoardIndex = boardIndex;
      }
    });
    solvedByHand.set(hand.id, best);
    boardIndexByHand.set(hand.id, bestBoardIndex);
  }

  const trueRanking = hands.map((hand) => hand.id).sort((a, b) => {
    const left = solvedByHand.get(a);
    const right = solvedByHand.get(b);
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    const winners = PokerHand.winners([rawSolved(left), rawSolved(right)]);
    if (winners.length === 2) return 0;
    return winners[0] === left.raw ? -1 : 1;
  });

  return {
    trueRanking,
    trueRanks: ranksFromOrdered(trueRanking, (a, b) => {
      const left = solvedByHand.get(a);
      const right = solvedByHand.get(b);
      if (!left || !right) return left === right;
      return PokerHand.winners([rawSolved(left), rawSolved(right)]).length === 2;
    }),
    madeHandNames: Object.fromEntries(
      hands.map((hand) => {
        const solved = solvedByHand.get(hand.id);
        const boardIndex = boardIndexByHand.get(hand.id);
        const boardLabel = boardIndex === null || boardIndex === undefined
          ? ""
          : ` (Board ${boardIndex + 1})`;
        return [hand.id, solved ? `${dingEvaluator.describe(solved)}${boardLabel}` : "Incomplete"];
      })
    ),
  };
}

function rawSolved(solved: SolvedHand): RawPokerSolved {
  return solved.raw as RawPokerSolved;
}

function scoringBoards(
  board: readonly Card[],
  config: NonNullable<ReturnType<typeof getGameModeDefinition>["deal"]["boards"]>
): Card[][] {
  if (config.cardIndexes) {
    return config.cardIndexes.map((indexes) => indexes.map((index) => board[index]).filter(Boolean));
  }

  const cardsPerBoard = config.cardsPerBoard ?? 0;
  const boardCount = config.count ?? 0;
  const boards: Card[][] = [];
  for (let boardIndex = 0; boardIndex < boardCount; boardIndex++) {
    const start = boardIndex * cardsPerBoard;
    boards.push(board.slice(start, start + cardsPerBoard));
  }
  return boards;
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
