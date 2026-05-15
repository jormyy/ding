import { registerPhaseEffect } from "./registry";
import { mapAllCards, rotateCardSuit } from "./shared";

registerPhaseEffect("reassignAllSuits", (state) => {
  mapAllCards(state, rotateCardSuit);
});

export {};
