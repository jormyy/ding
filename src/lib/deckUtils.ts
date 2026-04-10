import type { Card, Rank, Suit } from "./types";

const RANKS: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
  "A",
];
const SUITS: Suit[] = ["H", "D", "C", "S"];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(
  deck: Card[],
  playerIds: string[],
  handsPerPlayer: number
): {
  playerHands: Record<string, Card[][]>;
  communityCards: Card[];
  remainingDeck: Card[];
} {
  let deckIndex = 0;
  const playerHands: Record<string, Card[][]> = {};

  for (const playerId of playerIds) {
    playerHands[playerId] = [];
    for (let h = 0; h < handsPerPlayer; h++) {
      playerHands[playerId].push([]);
    }
  }

  // Deal 2 cards per hand
  for (let card = 0; card < 2; card++) {
    for (const playerId of playerIds) {
      for (let h = 0; h < handsPerPlayer; h++) {
        playerHands[playerId][h].push(deck[deckIndex++]);
      }
    }
  }

  // 5 community cards
  const communityCards: Card[] = deck.slice(deckIndex, deckIndex + 5);
  deckIndex += 5;

  return {
    playerHands,
    communityCards,
    remainingDeck: deck.slice(deckIndex),
  };
}
