import type { Card, Hand } from "../src/lib/types";
import { cardToPokersolverStr } from "../src/lib/utils";
import { Hand as PokerHand } from "pokersolver";

type SolvedHand = ReturnType<typeof PokerHand.solve>;

export function solveHands(hands: Hand[], communityCards: Card[]): Map<string, SolvedHand> {
  const map = new Map<string, SolvedHand>();
  const communityStrs = communityCards.map(cardToPokersolverStr);
  for (const hand of hands) {
    const strs = [...hand.cards.map(cardToPokersolverStr), ...communityStrs];
    map.set(hand.id, PokerHand.solve(strs));
  }
  return map;
}

export function solvedHandName(solved: SolvedHand): string {
  return solved.descr as string;
}
