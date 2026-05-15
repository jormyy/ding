import { registerPhaseEffect } from "./registry";

registerPhaseEffect("stormSurge", (state) => {
  state.allCommunityCards.shift();
});

export {};
