import { registerPhaseEffect } from "./registry";

registerPhaseEffect("removeOneHolePerHand", (state) => {
  for (const hand of state.hands) hand.cards.pop();
});

export {};
