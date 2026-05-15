import { registerPhaseEffect } from "./registry";
import { copyCard, rotateCards } from "./shared";
import type { Card } from "../../src/lib/types";

registerPhaseEffect("rotateFirstHoleCardsClockwise", (state) => {
  const firstCards = state.hands.map((hand) => hand.cards[0]).filter((card): card is Card => card !== undefined);
  if (firstCards.length <= 1) return;
  const rotated = rotateCards(firstCards.map(copyCard), firstCards.length - 1);
  let cursor = 0;
  for (const hand of state.hands) {
    if (hand.cards[0]) hand.cards[0] = rotated[cursor++];
  }
});

export {};
