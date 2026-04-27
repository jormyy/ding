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

/** Create a standard 52-card deck. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle — returns a new shuffled copy, does not mutate input. */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deal cards for a new game.
 *
 * - Deals 2 hole cards per hand, round-robin across players.
 * - Burns 1 card, deals flop (3), burns 1, deals turn (1), burns 1, deals river (1).
 * - Returns remaining deck for potential future use.
 */
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

  // Burn 1, deal flop (3), burn 1, deal turn (1), burn 1, deal river (1)
  deckIndex++; // burn before flop
  const flop = deck.slice(deckIndex, deckIndex + 3);
  deckIndex += 3;
  deckIndex++; // burn before turn
  const turn = deck[deckIndex++];
  deckIndex++; // burn before river
  const river = deck[deckIndex++];
  const communityCards: Card[] = [...flop, turn, river];

  return {
    playerHands,
    communityCards,
    remainingDeck: deck.slice(deckIndex),
  };
}
