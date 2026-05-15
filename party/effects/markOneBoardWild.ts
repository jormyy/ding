import { registerPhaseEffect } from "./registry";

registerPhaseEffect("markOneBoardWild", (state) => {
  if (state.allCommunityCards.length === 0) return;
  const index = 0; // First card by default — modes that want a different choice can extend later.
  state.markedBoardWildIndex = index;
  state.allCommunityCards[index] = { ...state.allCommunityCards[index], meta: "joker" };
});

export {};
