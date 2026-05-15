import { registerPhaseEffect } from "./registry";

// The bump is applied post-showdown in lifecycle.ts (we need the ranking
// to exist before we can reorder it). Tag state here so the post-showdown
// step knows the penalty was armed; the chaos event surfaces via the
// generic dispatcher tail.
registerPhaseEffect("optedTierPenalty", (state) => {
  state.pendingOptedTierPenalty = true;
});

export {};
