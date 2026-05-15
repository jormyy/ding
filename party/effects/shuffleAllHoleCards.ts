import { registerPhaseEffect } from "./registry";
import { copyCard, rotateCards } from "./shared";

registerPhaseEffect("shuffleAllHoleCards", (state) => {
  const cards = state.hands.flatMap((hand) => hand.cards.map(copyCard));
  const rotated = rotateCards(cards, 1);
  let cursor = 0;
  for (const hand of state.hands) {
    const count = hand.cards.length;
    hand.cards = rotated.slice(cursor, cursor + count);
    cursor += count;
  }
});

export {};
