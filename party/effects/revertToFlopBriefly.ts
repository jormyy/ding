import { registerPhaseEffect } from "./registry";

registerPhaseEffect("revertToFlopBriefly", (state) => {
  state.phaseSubstep = "flopRevert";
});

export {};
