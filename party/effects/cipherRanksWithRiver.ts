import { registerPhaseEffect } from "./registry";
import { RANKS, getRiverCard, mapAllCards } from "./shared";
import type { Card } from "../../src/lib/types";

registerPhaseEffect("cipherRanksWithRiver", (state) => {
  const river = getRiverCard(state);
  if (!river) return;
  const shift = RANKS.indexOf(river.rank);
  const cipher = (card: Card): Card => ({
    ...card,
    rank: RANKS[(RANKS.indexOf(card.rank) + shift) % RANKS.length],
  });
  mapAllCards(state, cipher);
});

export {};
