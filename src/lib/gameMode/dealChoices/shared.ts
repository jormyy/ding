/**
 * Helpers shared across dealChoice variant handlers — visibility refresh and
 * fallback index selection. Lives outside the per-variant files so each
 * variant can stay focused on its own mutation.
 */
import { keepBestCards } from "../deal";
import { getGameModeDefinition } from "../registry";
import type { Card } from "../../types";
import type { ServerGameState } from "../../../../party/state";

type StateHand = ServerGameState["hands"][number];

export function refreshHandVisibility(hand: StateHand, publicCount: number): void {
  hand.cardCount = hand.cards.length;
  hand.publicCards = hand.cards.slice(0, publicCount);
}

export function fallbackKeepIndexes(cards: readonly Card[], keepCards: number): number[] {
  const kept = keepBestCards(cards, keepCards);
  const used = new Set<number>();
  const indexes: number[] = [];
  for (const keptCard of kept) {
    const index = cards.findIndex((candidate, i) => !used.has(i) && candidate === keptCard);
    if (index !== -1) {
      used.add(index);
      indexes.push(index);
    }
  }
  return indexes.sort((a, b) => a - b);
}

export function fallbackExposeIndexes(keepCards: number): number[] {
  const indexes: number[] = [];
  for (let index = 0; index < keepCards; index++) indexes.push(index);
  return indexes;
}

export function fallbackTradeUpIndexes(cards: readonly Card[], keepCards: number): number[] {
  if (cards.length === 0 || keepCards <= 0) return [];
  const best = new Set(fallbackKeepIndexes(cards, Math.max(0, cards.length - keepCards)));
  const indexes: number[] = [];
  for (let index = 0; index < cards.length && indexes.length < keepCards; index++) {
    if (!best.has(index)) indexes.push(index);
  }
  return indexes.length > 0 ? indexes : [0];
}

export function publicCardCount(state: ServerGameState): number {
  return getGameModeDefinition(state.modeId).deal.publicCards ?? 0;
}
