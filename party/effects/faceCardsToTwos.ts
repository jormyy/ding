import { registerPhaseEffect } from "./registry";
import { isFace, mapAllCards } from "./shared";

registerPhaseEffect("faceCardsToTwos", (state) => {
  mapAllCards(state, (card) => isFace(card.rank) ? { ...card, rank: "2" } : card);
});

export {};
