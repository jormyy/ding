import { registerPhaseEffect } from "./registry";
import { removeAndRefillBoard } from "./shared";

registerPhaseEffect("removeSevens", (state) => {
  removeAndRefillBoard(state, (card) => card.rank === "7");
});

export {};
