import { registerPhaseEffect } from "./registry";
import { RANKS } from "./shared";

registerPhaseEffect("singularityAverageFirstTwoHoles", (state) => {
  for (const hand of state.hands) {
    if (hand.cards.length < 2) continue;
    const [left, right] = hand.cards;
    const averageIndex = Math.floor((RANKS.indexOf(left.rank) + RANKS.indexOf(right.rank)) / 2);
    hand.cards = [{ ...left, rank: RANKS[averageIndex] }].concat(hand.cards.slice(2));
    hand.cardCount = hand.cards.length;
  }
});

export {};
