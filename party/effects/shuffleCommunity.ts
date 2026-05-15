import { registerPhaseEffect } from "./registry";
import { rotateCards } from "./shared";

registerPhaseEffect("shuffleCommunity", (state) => {
  state.allCommunityCards = rotateCards(state.allCommunityCards, 1);
});

export {};
