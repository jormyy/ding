import { registerPhaseEffect } from "./registry";
import { isFace, mapAllCards } from "./shared";

registerPhaseEffect("faceCardsToAces", (state) => {
  mapAllCards(state, (card) => isFace(card.rank) ? { ...card, rank: "A" } : card);
});

export {};
