import { registerPhaseEffect } from "./registry";

registerPhaseEffect("firstCommunityAbsorbsSecondSuit", (state) => {
  if (state.allCommunityCards[0] && state.allCommunityCards[1]) {
    state.allCommunityCards[0] = { ...state.allCommunityCards[0], suit: state.allCommunityCards[1].suit };
  }
});

export {};
