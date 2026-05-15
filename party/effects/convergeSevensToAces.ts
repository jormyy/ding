import { registerPhaseEffect } from "./registry";
import { mapAllCards } from "./shared";

registerPhaseEffect("convergeSevensToAces", (state) => {
  mapAllCards(state, (card) => card.rank === "7" ? { ...card, rank: "A" } : card);
});

export {};
