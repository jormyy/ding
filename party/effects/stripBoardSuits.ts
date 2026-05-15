import { registerPhaseEffect } from "./registry";

registerPhaseEffect("stripBoardSuits", (state) => {
  state.suitsStripped = true;
});

export {};
