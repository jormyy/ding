import { registerPhaseEffect } from "./registry";
import { incrementCardRank, mutateHoleCardAt } from "./shared";

registerPhaseEffect("staticFlickerFirstCards", (state) => {
  mutateHoleCardAt(state, 0, incrementCardRank);
  if (state.allCommunityCards[0]) state.allCommunityCards[0] = incrementCardRank(state.allCommunityCards[0]);
});

export {};
