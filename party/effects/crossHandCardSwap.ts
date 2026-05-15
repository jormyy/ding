import { registerPhaseEffect } from "./registry";
import { copyCard } from "./shared";

registerPhaseEffect("crossHandCardSwap", (state) => {
  if (state.hands.length < 2) return;
  const firstSnapshots = state.hands.map((hand) => (hand.cards[0] ? copyCard(hand.cards[0]) : null));
  const lastSnapshots = state.hands.map((hand) =>
    hand.cards.length > 0 ? copyCard(hand.cards[hand.cards.length - 1]) : null,
  );
  state.hands.forEach((hand, index) => {
    const nextLast = lastSnapshots[(index + 1) % lastSnapshots.length];
    if (hand.cards.length > 0 && nextLast) hand.cards[0] = nextLast;
    const ownFirst = firstSnapshots[index];
    if (hand.cards.length > 0 && ownFirst) hand.cards[hand.cards.length - 1] = ownFirst;
  });
});

export {};
