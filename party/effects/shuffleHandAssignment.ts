import { registerPhaseEffect } from "./registry";
import { copyCard } from "./shared";

registerPhaseEffect("shuffleHandAssignment", (state) => {
  const snapshots = state.hands.map((hand) => hand.cards.map(copyCard));
  if (snapshots.length <= 1) return;
  const rotated = snapshots.slice(1).concat(snapshots.slice(0, 1));
  state.hands.forEach((hand, index) => {
    hand.cards = rotated[index];
  });
});

export {};
