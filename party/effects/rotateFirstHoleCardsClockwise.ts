import { registerPhaseEffect } from "./registry";
import { copyCard, rotateCards } from "./shared";
import { filterDefined } from "../../src/lib/utils";

registerPhaseEffect("rotateFirstHoleCardsClockwise", (state) => {
  const firstCards = filterDefined(state.hands.map((hand) => hand.cards[0]));
  if (firstCards.length <= 1) return;
  const rotated = rotateCards(firstCards.map(copyCard), firstCards.length - 1);
  let cursor = 0;
  for (const hand of state.hands) {
    if (hand.cards[0]) hand.cards[0] = rotated[cursor++];
  }
});

export {};
