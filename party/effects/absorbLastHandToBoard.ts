import { registerPhaseEffect } from "./registry";
import { copyCard } from "./shared";

registerPhaseEffect("absorbLastHandToBoard", (state) => {
  if (state.hands.length === 0) return;
  const last = state.hands[state.hands.length - 1];
  if (!last || last.cards.length === 0) return;
  state.allCommunityCards = state.allCommunityCards.concat(last.cards.map(copyCard));
  state.absorbedHandIds = [...(state.absorbedHandIds ?? []), last.id];
  last.cards = [];
  last.cardCount = 0;
});

export {};
