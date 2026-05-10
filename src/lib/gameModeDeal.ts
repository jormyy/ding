import type { Card, Hand, Rank } from "./types";
import { createDeck } from "./deckUtils";
import { getGameModeDefinition } from "./gameModes";

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

export interface ModeDealResult {
  hands: Hand[];
  communityCards: Card[];
  remainingDeck: Card[];
}

export function createDeckForMode(modeId: string | undefined): Card[] {
  const mode = getGameModeDefinition(modeId);
  const deck = createDeck();
  if (mode.deal.deck !== "short") return deck;
  return deck.filter((card) => RANK_VALUE[card.rank] >= 6);
}

export function dealCardsForMode(
  deck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number,
  modeId: string | undefined
): ModeDealResult {
  const mode = getGameModeDefinition(modeId);
  let deckIndex = 0;
  const dealtHands: Record<string, Card[][]> = {};

  for (const playerId of playerIds) {
    dealtHands[playerId] = [];
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      dealtHands[playerId].push([]);
    }
  }

  for (let card = 0; card < mode.deal.holeCards; card++) {
    for (const playerId of playerIds) {
      for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
        const next = deck[deckIndex++];
        if (next) dealtHands[playerId][handIndex].push(next);
      }
    }
  }

  const hands: Hand[] = [];
  const publicCount = mode.deal.publicCards ?? 0;
  for (const playerId of playerIds) {
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      const dealt = dealtHands[playerId][handIndex] ?? [];
      const cards = keepBestCards(dealt, mode.deal.keepCards);
      hands.push({
        id: `${playerId}-${handIndex}`,
        playerId,
        cards,
        cardCount: cards.length,
        publicCards: cards.slice(0, publicCount),
        flipped: false,
      });
    }
  }

  const communityCards: Card[] = [];
  const drawCommunity = (count: number) => {
    for (let i = 0; i < count && communityCards.length < mode.deal.communityCards; i++) {
      const next = deck[deckIndex++];
      if (next) communityCards.push(next);
    }
  };

  if (mode.deal.communityCards > 0) {
    deckIndex++; // burn before first board packet
    drawCommunity(Math.min(3, mode.deal.communityCards));
  }
  if (communityCards.length < mode.deal.communityCards) {
    deckIndex++; // burn before turn packet
    drawCommunity(1);
  }
  if (communityCards.length < mode.deal.communityCards) {
    deckIndex++; // burn before river packet
    drawCommunity(mode.deal.communityCards - communityCards.length);
  }

  return {
    hands,
    communityCards,
    remainingDeck: deck.slice(deckIndex),
  };
}

function keepBestCards(cards: readonly Card[], keepCards: number | undefined): Card[] {
  if (keepCards === undefined || keepCards >= cards.length) return cards.slice();
  if (keepCards <= 0) return [];

  let best: Card[] = cards.slice(0, keepCards);
  let bestScore = scoreStartingCards(best);
  for (const combo of combinations(cards, keepCards)) {
    const score = scoreStartingCards(combo);
    if (score > bestScore) {
      best = combo;
      bestScore = score;
    }
  }
  return best;
}

function combinations(cards: readonly Card[], size: number): Card[][] {
  const out: Card[][] = [];
  const walk = (start: number, selected: Card[]) => {
    if (selected.length === size) {
      out.push(selected.slice());
      return;
    }
    for (let i = start; i <= cards.length - (size - selected.length); i++) {
      selected.push(cards[i]);
      walk(i + 1, selected);
      selected.pop();
    }
  };
  walk(0, []);
  return out;
}

function scoreStartingCards(cards: readonly Card[]): number {
  if (cards.length === 0) return 0;
  const ranks = cards.map((card) => RANK_VALUE[card.rank]).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const rank of ranks) counts.set(rank, (counts.get(rank) ?? 0) + 1);
  const multiplicity = Math.max(...counts.values());
  const pairBoost = multiplicity > 1 ? 100 * multiplicity : 0;
  const suitedBoost = cards.length > 1 && cards.every((card) => card.suit === cards[0].suit) ? 4 : 0;
  const connectedBoost =
    ranks.length > 1 && ranks[0] - ranks[ranks.length - 1] <= ranks.length ? 3 : 0;
  return pairBoost + suitedBoost + connectedBoost + ranks.reduce((sum, rank, idx) => {
    return sum + rank / Math.pow(20, idx);
  }, 0);
}
