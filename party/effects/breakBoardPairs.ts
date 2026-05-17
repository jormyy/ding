import { registerPhaseEffect } from "./registry";
import { removeCardsWhere } from "./shared";
import type { Rank } from "../../src/lib/types";
import { incrementMapCount } from "../../src/lib/utils";

registerPhaseEffect("breakBoardPairs", (state) => {
  const counts = new Map<Rank, number>();
  for (const card of state.allCommunityCards) incrementMapCount(counts, card.rank);
  const dupes = new Set<Rank>();
  for (const [rank, count] of counts) if (count > 1) dupes.add(rank);
  if (dupes.size === 0) return;
  removeCardsWhere(state, (card) => dupes.has(card.rank));
});

export {};
