import { registerPhaseEffect } from "./registry";

registerPhaseEffect("rewindToTurnAfterReveal", (state) => {
  state.phaseSubstep = "rewindToTurn";
});

export {};
