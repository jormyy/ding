import { registerPhaseEffect } from "./registry";
import { removeCardsWhere } from "./shared";
import type { Rank } from "../../src/lib/types";

registerPhaseEffect("breakBoardPairs", (state) => {
  const counts = new Map<Rank, number>();
  for (const card of state.allCommunityCards) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  const dupes = new Set<Rank>();
  for (const [rank, count] of counts) if (count > 1) dupes.add(rank);
  if (dupes.size === 0) return;
  removeCardsWhere(state, (card) => dupes.has(card.rank));
});

export {};
