/**
 * Shared helpers for phase-effect handlers. Card-shaping primitives live here
 * so individual effect files can stay focused on the mechanic, not on rank
 * arithmetic / hand traversal boilerplate.
 */
import type { Card, Rank } from "../../src/lib/types";
import { RANKS, SUITS, isFace, isRed } from "../../src/lib/deckUtils";
import type { ServerGameState } from "../state";

export { RANKS, SUITS, isFace, isRed };

export const INVERTED_RANK: Record<Rank, Rank> = {
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

export function copyCard(card: Card): Card {
  return { ...card };
}

/** River card lookup with a graceful fallback to the last board card if the
 *  classic index-4 position is empty (e.g. mid-turn during phase substeps). */
export function getRiverCard(state: ServerGameState): Card | undefined {
  return state.allCommunityCards[4] ?? state.allCommunityCards[state.allCommunityCards.length - 1];
}

/** Deep-copies every hole card across every hand into one flat array — used
 *  by the rotate/shuffle/mix effects that redistribute hole cards en masse. */
export function copyAllHoleCards(state: ServerGameState): Card[] {
  return state.hands.flatMap((hand) => hand.cards.map(copyCard));
}

export function rotateCards<T>(items: readonly T[], offset: number): T[] {
  if (items.length === 0) return [];
  const normalized = offset % items.length;
  return items.slice(normalized).concat(items.slice(0, normalized));
}

export function incrementCardRank(card: Card): Card {
  const index = RANKS.indexOf(card.rank);
  return { ...card, rank: RANKS[Math.min(RANKS.length - 1, index + 1)] };
}

export function rotateCardSuit(card: Card): Card {
  const index = SUITS.indexOf(card.suit);
  return { ...card, suit: SUITS[(index + 1) % SUITS.length] };
}

export function mapAllCards(state: ServerGameState, mapper: (card: Card) => Card): void {
  state.allCommunityCards = state.allCommunityCards.map(mapper);
  state.dealDeck = state.dealDeck.map(mapper);
  state.burnCards = state.burnCards.map(mapper);
  for (const hand of state.hands) {
    hand.cards = hand.cards.map(mapper);
    hand.publicCards = hand.publicCards?.map(mapper);
  }
}

export function mutateHoleCardAt(state: ServerGameState, index: number, mapper: (card: Card) => Card): void {
  for (const hand of state.hands) {
    const card = hand.cards[index];
    if (card !== undefined) hand.cards[index] = mapper(card);
  }
}

export function removeCardsWhere(state: ServerGameState, predicate: (card: Card) => boolean): void {
  state.allCommunityCards = state.allCommunityCards.filter((card) => !predicate(card));
  for (const hand of state.hands) {
    hand.cards = hand.cards.filter((card) => !predicate(card));
    hand.publicCards = hand.publicCards?.filter((card) => !predicate(card));
    hand.cardCount = hand.cards.length;
  }
}

/** Remove board cards matching `predicate` and refill from the deal deck so
 *  the community board keeps its original card count (subject to deck supply).
 *  Used by drought / plague which catalog-promise "replaced by fresh draws". */
export function removeAndRefillBoard(state: ServerGameState, predicate: (card: Card) => boolean): void {
  const target = state.allCommunityCards.length;
  state.allCommunityCards = state.allCommunityCards.filter((card) => !predicate(card));
  for (const hand of state.hands) {
    hand.cards = hand.cards.filter((card) => !predicate(card));
    hand.publicCards = hand.publicCards?.filter((card) => !predicate(card));
    hand.cardCount = hand.cards.length;
  }
  while (state.allCommunityCards.length < target && state.dealDeck.length > 0) {
    const next = state.dealDeck.shift();
    if (!next) break;
    if (predicate(next)) continue;
    state.allCommunityCards.push(next);
  }
}

