import { registerPhaseEffect } from "./registry";

registerPhaseEffect("spreadPlagueToFirstCard", (state) => {
  for (const hand of state.hands) {
    const index = hand.cards.findIndex((card) => card.rank !== "7");
    if (index !== -1) {
      hand.cards[index] = { ...hand.cards[index], rank: "7" };
      return;
    }
  }
  const boardIndex = state.allCommunityCards.findIndex((card) => card.rank !== "7");
  if (boardIndex !== -1) state.allCommunityCards[boardIndex] = { ...state.allCommunityCards[boardIndex], rank: "7" };
});

export {};
