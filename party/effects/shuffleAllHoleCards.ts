import { registerPhaseEffect } from "./registry";
import { copyAllHoleCards, rotateCards } from "./shared";

registerPhaseEffect("shuffleAllHoleCards", (state) => {
  const rotated = rotateCards(copyAllHoleCards(state), 1);
  let cursor = 0;
  for (const hand of state.hands) {
    const count = hand.cards.length;
    hand.cards = rotated.slice(cursor, cursor + count);
    cursor += count;
  }
});

export {};
