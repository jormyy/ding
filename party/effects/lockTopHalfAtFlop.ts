import { registerPhaseEffect } from "./registry";
import { RANKS } from "./shared";

// Rough mid-hand ranking: hands with higher hole-card top-rank are "locked".
// We capture half of the hands (rounded down) and freeze them by ID so
// later phase-effect cases can skip them.
registerPhaseEffect("lockTopHalfAtFlop", (state) => {
  if (state.hands.length < 2) {
    state.lockedHandIds = [];
    return;
  }
  const sorted = state.hands
    .slice()
    .sort((a, b) => {
      const aTop = Math.max(0, ...a.cards.map((card) => RANKS.indexOf(card.rank)));
      const bTop = Math.max(0, ...b.cards.map((card) => RANKS.indexOf(card.rank)));
      return bTop - aTop;
    });
  state.lockedHandIds = sorted.slice(0, Math.floor(state.hands.length / 2)).map((hand) => hand.id);
});

export {};
