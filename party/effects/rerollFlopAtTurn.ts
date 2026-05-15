import { registerPhaseEffect } from "./registry";

registerPhaseEffect("rerollFlopAtTurn", (state) => {
  if (state.allCommunityCards.length < 3) return;
  for (let index = 0; index < 3; index++) {
    const replacement = state.dealDeck.shift();
    if (!replacement) break;
    state.allCommunityCards[index] = replacement;
  }
});

export {};
