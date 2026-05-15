import { registerPhaseEffect } from "./registry";
import { rotateCards } from "./shared";

registerPhaseEffect("rotateHoleRanksAcrossHands", (state) => {
  const cards = state.hands.flatMap((hand) => hand.cards);
  const ranks = rotateCards(cards.map((card) => card.rank), 1);
  let cursor = 0;
  for (const hand of state.hands) {
    hand.cards = hand.cards.map((card) => ({ ...card, rank: ranks[cursor++] ?? card.rank }));
  }
});

export {};
