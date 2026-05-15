import { registerPhaseEffect } from "./registry";
import { RANKS, copyCard } from "./shared";

registerPhaseEffect("bestCardClockwise", (state) => {
  if (state.hands.length <= 1) return;
  const best = state.hands.map((hand) => {
    if (hand.cards.length === 0) return null;
    let topIndex = 0;
    for (let index = 1; index < hand.cards.length; index++) {
      if (RANKS.indexOf(hand.cards[index].rank) > RANKS.indexOf(hand.cards[topIndex].rank)) topIndex = index;
    }
    return { card: copyCard(hand.cards[topIndex]), index: topIndex };
  });
  state.hands.forEach((hand, index) => {
    const fromIndex = (index - 1 + state.hands.length) % state.hands.length;
    const incoming = best[fromIndex];
    const own = best[index];
    if (incoming && own) hand.cards[own.index] = incoming.card;
  });
});

export {};
