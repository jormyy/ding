import { registerPhaseEffect } from "./registry";

registerPhaseEffect("tricksterSwapRight", (state) => {
  const tricksterIndex = state.hands.findIndex((hand) => hand.cards.some((card) => card.meta === "trickster"));
  if (tricksterIndex < 0) return;
  const rightIndex = (tricksterIndex + 1) % state.hands.length;
  const left = state.hands[tricksterIndex];
  const right = state.hands[rightIndex];
  if (!left || !right || left.cards.length === 0 || right.cards.length === 0) return;
  const leftIdx = left.cards.findIndex((card) => card.meta === "trickster");
  if (leftIdx < 0) return;
  const temp = left.cards[leftIdx];
  left.cards[leftIdx] = right.cards[0];
  right.cards[0] = temp;
});

export {};
