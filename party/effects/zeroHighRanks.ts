import { registerPhaseEffect } from "./registry";
import { RANKS, removeCardsWhere } from "./shared";

registerPhaseEffect("zeroHighRanks", (state) => {
  removeCardsWhere(state, (card) => RANKS.indexOf(card.rank) >= RANKS.indexOf("6"));
});

export {};
