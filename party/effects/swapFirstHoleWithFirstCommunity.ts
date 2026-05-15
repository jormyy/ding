import { registerPhaseEffect } from "./registry";

registerPhaseEffect("swapFirstHoleWithFirstCommunity", (state) => {
  const hand = state.hands[0];
  const community = state.allCommunityCards[0];
  if (!hand || !hand.cards[0] || !community) return;
  const temp = hand.cards[0];
  hand.cards[0] = community;
  state.allCommunityCards[0] = temp;
});

export {};
