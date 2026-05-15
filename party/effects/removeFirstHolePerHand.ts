import { registerPhaseEffect } from "./registry";

registerPhaseEffect("removeFirstHolePerHand", (state) => {
  for (const hand of state.hands) hand.cards.shift();
});

export {};
