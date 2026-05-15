import { registerPhaseEffect } from "./registry";

registerPhaseEffect("revertBoardToFlop", (state) => {
  state.allCommunityCards = state.allCommunityCards.slice(0, 3);
});

export {};
