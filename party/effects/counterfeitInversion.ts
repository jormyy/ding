import { registerPhaseEffect } from "./registry";
import { INVERTED_RANK, mapAllCards } from "./shared";

registerPhaseEffect("counterfeitInversion", (state) => {
  mapAllCards(state, (card) => card.meta === "counterfeit" ? { ...card, rank: INVERTED_RANK[card.rank] } : card);
});

export {};
