import { registerPhaseEffect } from "./registry";
import { RANKS, removeCardsWhere } from "./shared";
import type { Rank } from "../../src/lib/types";

registerPhaseEffect("removeHighestRankInPlay", (state) => {
  const cards = state.hands.flatMap((hand) => hand.cards).concat(state.allCommunityCards);
  const highest = cards.reduce<Rank | null>((best, card) => {
    if (best === null) return card.rank;
    return RANKS.indexOf(card.rank) > RANKS.indexOf(best) ? card.rank : best;
  }, null);
  if (highest === null) return;
  removeCardsWhere(state, (card) => card.rank === highest);
});

export {};
