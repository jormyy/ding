import { registerPhaseEffect } from "./registry";
import { incrementCardRank, mutateHoleCardAt } from "./shared";

registerPhaseEffect("incrementFirstHolePerHand", (state) => {
  mutateHoleCardAt(state, 0, incrementCardRank);
});

export {};
