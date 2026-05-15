import { registerPhaseEffect } from "./registry";

registerPhaseEffect("swapFirstCardsFirstTwoHands", (state) => {
  const left = state.hands[0];
  const right = state.hands[1];
  if (!left || !right || !left.cards[0] || !right.cards[0]) return;
  const temp = left.cards[0];
  left.cards[0] = right.cards[0];
  right.cards[0] = temp;
});

export {};
