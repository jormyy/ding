import { registerPhaseEffect } from "./registry";

// Sub-phase machinery: tick the substep label so visibility can slice
// 1, 2, then 3 cards across consecutive flop arrivals. The visibility
// module reads state.phaseSubstep when computing visibleCommunityCardCount.
registerPhaseEffect("flopOneAtATime", (state) => {
  state.phaseSubstep = state.phaseSubstep === "flop1"
    ? "flop2"
    : state.phaseSubstep === "flop2"
      ? "flop3"
      : "flop1";
});

export {};
