import { registerPhaseEffect } from "./registry";
import { RANKS, mapAllCards } from "./shared";
import type { Card } from "../../src/lib/types";

registerPhaseEffect("cipherRanksWithRiver", (state) => {
  const river = state.allCommunityCards[4] ?? state.allCommunityCards[state.allCommunityCards.length - 1];
  if (!river) return;
  const shift = RANKS.indexOf(river.rank);
  const cipher = (card: Card): Card => ({
    ...card,
    rank: RANKS[(RANKS.indexOf(card.rank) + shift) % RANKS.length],
  });
  mapAllCards(state, cipher);
});

export {};
