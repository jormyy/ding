import { registerPhaseEffect } from "./registry";

registerPhaseEffect("reverseTableAndBoard", (state) => {
  state.allCommunityCards.reverse();
  state.players.reverse();
});

export {};
