import { registerPhaseEffect } from "./registry";

registerPhaseEffect("duplicateFlopPhase", (state) => {
  state.phaseSubstep = "flopDuplicate";
  // Re-roll the first 3 community cards from the deal deck (the "second flop").
  if (state.allCommunityCards.length < 3) return;
  for (let i = 0; i < 3; i++) {
    const replacement = state.dealDeck.shift();
    if (!replacement) break;
    state.allCommunityCards[i] = replacement;
  }
});

export {};
