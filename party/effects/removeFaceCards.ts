import { registerPhaseEffect } from "./registry";
import { removeAndRefillBoard } from "./shared";

registerPhaseEffect("removeFaceCards", (state) => {
  removeAndRefillBoard(state, (card) => card.rank === "J" || card.rank === "Q" || card.rank === "K");
});

export {};
