import { registerPhaseEffect } from "./registry";

registerPhaseEffect("randomReplaceVisibleCommunity", (state) => {
  const replacement = state.dealDeck.shift();
  if (!replacement || state.allCommunityCards.length === 0) return;
  const visibleCount = Math.min(4, state.allCommunityCards.length);
  const index = Math.floor(Math.random() * visibleCount);
  state.allCommunityCards[index] = replacement;
});

export {};
