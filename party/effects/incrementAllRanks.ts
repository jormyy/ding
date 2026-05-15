import { registerPhaseEffect } from "./registry";
import { incrementCardRank, mapAllCards } from "./shared";

registerPhaseEffect("incrementAllRanks", (state) => {
  mapAllCards(state, incrementCardRank);
});

export {};
