import { registerPhaseEffect } from "./registry";
import { isRed, removeCardsWhere } from "./shared";

registerPhaseEffect("lockMajorityColor", (state) => {
  let red = 0;
  let black = 0;
  for (const card of state.allCommunityCards) {
    if (isRed(card.suit)) red++;
    else black++;
  }
  if (red === 0 && black === 0) return;
  const keepRed = red >= black;
  removeCardsWhere(state, (card) => isRed(card.suit) !== keepRed);
});

export {};
