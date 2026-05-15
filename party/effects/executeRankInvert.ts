import { registerPhaseEffect } from "./registry";
import { INVERTED_RANK, mapAllCards } from "./shared";

registerPhaseEffect("executeRankInvert", (state) => {
  mapAllCards(state, (card) => ({ ...card, rank: INVERTED_RANK[card.rank] }));
});

export {};
