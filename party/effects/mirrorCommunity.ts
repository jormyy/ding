import { registerPhaseEffect } from "./registry";
import { copyCard } from "./shared";

registerPhaseEffect("mirrorCommunity", (state) => {
  const base = state.allCommunityCards.slice(0, 5);
  if (base.length < 5) return;
  state.allCommunityCards = base.concat(base.map(copyCard));
});

export {};
