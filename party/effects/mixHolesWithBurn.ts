import { registerPhaseEffect } from "./registry";
import { copyAllHoleCards, copyCard, rotateCards } from "./shared";

registerPhaseEffect("mixHolesWithBurn", (state) => {
  const holeCounts = state.hands.map((hand) => hand.cards.length);
  const mixed = rotateCards(copyAllHoleCards(state).concat(state.burnCards.map(copyCard)), 1);
  let cursor = 0;
  for (let handIndex = 0; handIndex < state.hands.length; handIndex++) {
    const count = holeCounts[handIndex];
    state.hands[handIndex].cards = mixed.slice(cursor, cursor + count);
    cursor += count;
  }
});

export {};
