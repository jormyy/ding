import { registerPhaseEffect } from "./registry";
import { incrementCardRank } from "./shared";

registerPhaseEffect("incrementFirstCommunityRank", (state) => {
  if (state.allCommunityCards[0]) state.allCommunityCards[0] = incrementCardRank(state.allCommunityCards[0]);
});

export {};
