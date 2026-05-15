import { registerPhaseEffect } from "./registry";

registerPhaseEffect("adoptBlackScoring", (state) => {
  state.scoreRuleOverride = "black";
});

export {};
