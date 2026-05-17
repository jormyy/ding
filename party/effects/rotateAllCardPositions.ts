import { registerPhaseEffect } from "./registry";
import { copyAllHoleCards, copyCard, rotateCards } from "./shared";

registerPhaseEffect("rotateAllCardPositions", (state) => {
  const handCounts = state.hands.map((hand) => hand.cards.length);
  const boardCount = state.allCommunityCards.length;
  const stream = rotateCards(
    copyAllHoleCards(state).concat(state.allCommunityCards.map(copyCard)),
    1,
  );
  let cursor = 0;
  for (let index = 0; index < state.hands.length; index++) {
    const count = handCounts[index];
    state.hands[index].cards = stream.slice(cursor, cursor + count);
    cursor += count;
  }
  state.allCommunityCards = stream.slice(cursor, cursor + boardCount);
});

export {};
