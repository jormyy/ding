import { registerPhaseEffect } from "./registry";

registerPhaseEffect("splitHandsAtReveal", (state) => {
  const originals = state.hands.slice();
  const splitByOriginal = new Map<string, string>();
  const nextHands = originals.flatMap((hand) => {
    if (hand.cards.length < 2) return [hand];
    const splitId = `${hand.id}-split`;
    splitByOriginal.set(hand.id, splitId);
    const [first, second, ...rest] = hand.cards;
    return [
      { ...hand, cards: [first, ...rest], cardCount: 1 + rest.length, publicCards: [], flipped: false },
      { ...hand, id: splitId, cards: [second], cardCount: 1, publicCards: [], flipped: false },
    ];
  });
  state.hands = nextHands;
  const baseRanking = state.ranking.length > 0
    ? state.ranking.filter((id): id is string => id !== null)
    : originals.map((hand) => hand.id);
  state.ranking = baseRanking.flatMap((id) => {
    const splitId = splitByOriginal.get(id);
    return splitId ? [id, splitId] : [id];
  });
});

export {};
