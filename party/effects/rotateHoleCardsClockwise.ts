import { registerPhaseEffect } from "./registry";
import { copyCard } from "./shared";

registerPhaseEffect("rotateHoleCardsClockwise", (state) => {
  const snapshots = state.hands.map((hand) => hand.cards.map(copyCard));
  if (snapshots.length <= 1) return;
  state.hands.forEach((hand, index) => {
    const fromIndex = (index - 1 + snapshots.length) % snapshots.length;
    hand.cards = snapshots[fromIndex];
  });
});

export {};
