import type { Card, Rank, Suit } from "./types";

export const RANKS: Rank[] = [
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
export const SUITS: Suit[] = ["H", "D", "C", "S"];

export function isFace(rank: Rank): boolean {
  return rank === "J" || rank === "Q" || rank === "K";
}

export function isRed(suit: Suit): boolean {
  return suit === "H" || suit === "D";
}

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

