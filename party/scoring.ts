import type { Card, Hand } from "../src/lib/types";
import { Hand as PokerHand } from "pokersolver";
import { solveHands } from "./solver";

export function computeTrueRanking(
  hands: Hand[],
  communityCards: Card[]
): string[] {
  const solvedMap = solveHands(hands, communityCards);
  const solvedHands = hands.map((h) => ({ id: h.id, solved: solvedMap.get(h.id)! }));

  solvedHands.sort((a, b) => {
    const winners = PokerHand.winners([a.solved, b.solved]);
    if (winners.length === 2) return 0;
    if (winners[0] === a.solved) return -1;
    return 1;
  });

  return solvedHands.map((h) => h.id);
}

export function computeTrueRanks(
  trueRanking: string[],
  hands: Hand[],
  communityCards: Card[]
): Record<string, number> {
  const solvedMap = solveHands(hands, communityCards);

  const ranks: Record<string, number> = {};
  let rank = 1;
  for (let i = 0; i < trueRanking.length; i++) {
    if (i === 0) {
      ranks[trueRanking[i]] = rank;
    } else {
      const prev = solvedMap.get(trueRanking[i - 1])!;
      const curr = solvedMap.get(trueRanking[i])!;
      const winners = PokerHand.winners([prev, curr]);
      if (winners.length !== 2) rank++;
      ranks[trueRanking[i]] = rank;
    }
  }
  return ranks;
}

export function countInversions(
  playerRanking: (string | null)[],
  trueRanking: string[],
  hands: Hand[],
  communityCards: Card[]
): number {
  const claimedRanking = playerRanking.filter((id): id is string => id !== null);
  const solvedMap = solveHands(hands, communityCards);

  const truePosMap = new Map<string, number>();
  let pos = 0;
  for (let i = 0; i < trueRanking.length; i++) {
    if (i === 0) {
      truePosMap.set(trueRanking[i], pos);
    } else {
      const prev = solvedMap.get(trueRanking[i - 1])!;
      const curr = solvedMap.get(trueRanking[i])!;
      const winners = PokerHand.winners([prev, curr]);
      if (winners.length === 2) {
        truePosMap.set(trueRanking[i], pos);
      } else {
        pos++;
        truePosMap.set(trueRanking[i], pos);
      }
    }
  }

  let inversions = 0;
  for (let i = 0; i < claimedRanking.length; i++) {
    for (let j = i + 1; j < claimedRanking.length; j++) {
      const posI = truePosMap.get(claimedRanking[i])!;
      const posJ = truePosMap.get(claimedRanking[j])!;
      if (posI > posJ) inversions++;
    }
  }
  return inversions;
}
