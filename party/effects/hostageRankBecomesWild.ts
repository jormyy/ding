import { registerPhaseEffect } from "./registry";

registerPhaseEffect("hostageRankBecomesWild", (state) => {
  const designated = state.hands[0];
  if (!designated || designated.cards.length === 0) return;
  const wildRank = designated.cards[0].rank;
  state.wildRankByEffect = wildRank;
  state.dealDeck = state.dealDeck.map((card) =>
    card.rank === wildRank ? { ...card, meta: "joker" } : card,
  );
  // Also tag any matching board cards already in play so the showdown wild
  // path picks them up — otherwise the chip says "K is wild" but K's already
  // on the board play as their face values.
  state.allCommunityCards = state.allCommunityCards.map((card) =>
    card.rank === wildRank ? { ...card, meta: "joker" } : card,
  );
});

export {};
