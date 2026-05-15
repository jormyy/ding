import { registerPhaseEffect } from "./registry";

registerPhaseEffect("festivalBoostFirstCommunity", (state) => {
  if (state.allCommunityCards[0]) state.allCommunityCards[0] = { ...state.allCommunityCards[0], rank: "A" };
});

export {};
