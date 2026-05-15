import { registerPhaseEffect } from "./registry";
import { incrementCardRank } from "./shared";

registerPhaseEffect("incrementAllHoleRanks", (state) => {
  for (const hand of state.hands) hand.cards = hand.cards.map(incrementCardRank);
});

export {};
