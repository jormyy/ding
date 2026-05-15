import { registerPhaseEffect } from "./registry";
import { incrementCardRank, mapAllCards } from "./shared";

registerPhaseEffect("tarotRankShift", (state) => {
  mapAllCards(state, incrementCardRank);
});

export {};
