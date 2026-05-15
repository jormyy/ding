import { registerPhaseEffect } from "./registry";

registerPhaseEffect("reverseCommunity", (state) => {
  state.allCommunityCards.reverse();
});

export {};
