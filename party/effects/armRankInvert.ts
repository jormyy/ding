import { registerPhaseEffect } from "./registry";

// Arms inverted-high scoring for reveal — the actual rank flip happens
// in showdown via rankTransform when state.scoreRuleOverride === "invertedHigh".
registerPhaseEffect("armRankInvert", (state) => {
  state.scoreRuleOverride = "invertedHigh";
});

export {};
