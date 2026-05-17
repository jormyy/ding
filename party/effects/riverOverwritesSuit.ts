import { registerPhaseEffect } from "./registry";
import { getRiverCard } from "./shared";

registerPhaseEffect("riverOverwritesSuit", (state) => {
  const river = getRiverCard(state);
  if (!river) return;
  state.allCommunityCards = state.allCommunityCards.map((card) =>
    card.suit === river.suit ? { ...card, rank: river.rank } : card,
  );
});

export {};
