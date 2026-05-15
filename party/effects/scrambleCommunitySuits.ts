import { registerPhaseEffect } from "./registry";
import { rotateCardSuit } from "./shared";

registerPhaseEffect("scrambleCommunitySuits", (state) => {
  state.allCommunityCards = state.allCommunityCards.map(rotateCardSuit);
});

export {};
