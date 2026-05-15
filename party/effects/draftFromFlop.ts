import { registerPhaseEffect } from "./registry";

// The actual draft pool is opened in lifecycle.ts when the flop phase
// begins (it needs to deal 6 cards before phase effects run). This
// handler tags the substep so we record the chaos event and so any
// future read of state.phaseSubstep here is meaningful.
registerPhaseEffect("draftFromFlop", (state) => {
  if (state.phaseSubstep !== "flopDraftPending") {
    state.phaseSubstep = "flopDraftPending";
  }
});

export {};
