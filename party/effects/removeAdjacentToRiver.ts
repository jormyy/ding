import { registerPhaseEffect } from "./registry";
import { RANKS, getRiverCard, removeCardsWhere } from "./shared";
import type { Rank } from "../../src/lib/types";

registerPhaseEffect("removeAdjacentToRiver", (state) => {
  const river = getRiverCard(state);
  if (!river) return;
  const riverIndex = RANKS.indexOf(river.rank);
  const adjacent = new Set<Rank>();
  const lower = RANKS[riverIndex - 1];
  const upper = RANKS[riverIndex + 1];
  if (lower) adjacent.add(lower);
  if (upper) adjacent.add(upper);
  removeCardsWhere(state, (card) => adjacent.has(card.rank));
});

export {};
