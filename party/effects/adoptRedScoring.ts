import { registerPhaseEffect } from "./registry";

registerPhaseEffect("adoptRedScoring", (state) => {
  state.scoreRuleOverride = "red";
});

export {};
