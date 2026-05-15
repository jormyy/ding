import { registerPhaseEffect } from "./registry";

registerPhaseEffect("markFirstBoard", (state) => {
  if (state.allCommunityCards[0]) {
    state.allCommunityCards[0] = { ...state.allCommunityCards[0], meta: "marked" };
  }
});

export {};
