import { registerPhaseEffect } from "./registry";
import type { ScoreRule } from "../../src/lib/gameMode";

registerPhaseEffect("coinflipScoreRule", (state) => {
  const choice: ScoreRule = Math.random() < 0.5 ? "red" : "black";
  state.scoreRuleOverride = choice;
});

export {};
