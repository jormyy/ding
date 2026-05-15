import { registerPhaseEffect } from "./registry";
import { RANKS } from "./shared";

registerPhaseEffect("schismDeckHighOnly", (state) => {
  state.dealDeck = state.dealDeck.filter((card) => RANKS.indexOf(card.rank) >= RANKS.indexOf("8"));
});

export {};
