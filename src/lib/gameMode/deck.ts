import { getGameModeDefinition } from "./registry";
import type { DingGameModeDefinition } from "./types";

function deckSizeForMode(modeId: string | undefined): number {
  switch (getGameModeDefinition(modeId).deal.deck) {
    case "short":
      return 36;
    case "stripped":
      return 28;
    case "bottomHalf":
      return 32;
    case "double":
      return 104;
    case "triple":
      return 156;
    case "half":
      return 26;
    case "pinochle":
      return 48;
    case "tarot":
      return 54;
    case "suitHeavy":
      return 65;
    case "suitLight":
      return 45;
    case "jokers":
      return 54;
    case "cursed":
    case "blessed":
    case "glitch":
    case "twoSuited":
    case "marked":
    case "trickster":
      return 52;
    case "standard":
    default:
      return 52;
  }
}

function cardsConsumedPerHandForMode(modeId: string | undefined): number {
  const deal = getGameModeDefinition(modeId).deal;
  const dealtCards = deal.dealChoice?.dealtCards ?? deal.holeCards;
  return deal.dealChoice?.mulligan ? dealtCards * 2 : dealtCards;
}

function getMaxTotalHandsForMode(modeId: string | undefined): number {
  const mode = getGameModeDefinition(modeId);
  const burns = 3;
  const availableForHands = Math.min(
    deckSizeForMode(mode.id) - mode.deal.communityCards - burns,
    constrainedHandCardLimit(mode)
  );
  return Math.max(1, Math.floor(availableForHands / cardsConsumedPerHandForMode(mode.id)));
}

export function getMaxHandsPerPlayerForMode(modeId: string | undefined, playerCount: number): number {
  if (playerCount <= 0) return 1;
  return Math.max(1, Math.floor(getMaxTotalHandsForMode(modeId) / playerCount));
}

function constrainedHandCardLimit(mode: DingGameModeDefinition): number {
  switch (mode.deal.constraint) {
    case "lowRanks":
      return 24;
    case "highRanks":
      return 28;
    default:
      return deckSizeForMode(mode.id);
  }
}
