import { registerPhaseEffect } from "./registry";

registerPhaseEffect("riverOverwritesSuit", (state) => {
  const river = state.allCommunityCards[4] ?? state.allCommunityCards[state.allCommunityCards.length - 1];
  if (!river) return;
  state.allCommunityCards = state.allCommunityCards.map((card) =>
    card.suit === river.suit ? { ...card, rank: river.rank } : card,
  );
});

export {};
