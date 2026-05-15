import { registerPhaseEffect } from "./registry";

registerPhaseEffect("removeLastCommunity", (state) => {
  state.allCommunityCards.pop();
});

export {};
