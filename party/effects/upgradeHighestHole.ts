import { registerPhaseEffect } from "./registry";
import { RANKS, incrementCardRank } from "./shared";

registerPhaseEffect("upgradeHighestHole", (state) => {
  for (const hand of state.hands) {
    if (hand.cards.length === 0) continue;
    let highestIndex = 0;
    for (let index = 1; index < hand.cards.length; index++) {
      if (RANKS.indexOf(hand.cards[index].rank) > RANKS.indexOf(hand.cards[highestIndex].rank)) highestIndex = index;
    }
    hand.cards[highestIndex] = incrementCardRank(hand.cards[highestIndex]);
  }
});

export {};
