import type { Card, CardMeta, Hand, Rank } from "../types";
import { RANK_VALUE } from "../rankValue";
import { idMap, incrementMapCount } from "../utils";
import type { DingGameModeDefinition, HierarchyId } from "./types";

/**
 * Hierarchy registry — reorders an existing best→worst ranking based on
 * mode-specific group/team/inheritance rules. Hierarchies are pure functions
 * over the ranking, hands, board, and mode; they may not mutate state.
 *
 * The base showdown produces a vanilla ranking by score rule; the active
 * hierarchy then takes over to apply effects like "blessed > unmarked > cursed"
 * or "rock > paper > scissors".
 */
interface HierarchyContext {
  ranking: readonly string[];
  hands: readonly Hand[];
  board: readonly Card[];
  mode: DingGameModeDefinition;
}

export type Hierarchy = (ctx: HierarchyContext) => string[];

function metaBucket(hand: Hand): "blessed" | "neutral" | "cursed" {
  const metas = new Set<CardMeta>(hand.cards.flatMap((card) => card.meta ? [card.meta] : []));
  if (metas.has("blessed")) return "blessed";
  if (metas.has("cursed") || metas.has("hex" as CardMeta)) return "cursed";
  return "neutral";
}

const BUCKET_RANK: Record<"blessed" | "neutral" | "cursed", number> = {
  blessed: 0,
  neutral: 1,
  cursed: 2,
};

function topRankOf(hand: Hand | undefined): number {
  if (!hand || hand.cards.length === 0) return 0;
  return Math.max(...hand.cards.map((card) => RANK_VALUE[card.rank]));
}

function handClass(hand: Hand): "rock" | "paper" | "scissors" {
  // Stable 3-way bucket from the highest rank of the hand:
  //   2-5  → rock      (low)
  //   6-T  → paper     (mid)
  //   J-A  → scissors  (high)
  // The cycle is rock-beats-scissors, paper-beats-rock, scissors-beats-paper.
  const top = topRankOf(hand);
  if (top <= 5) return "rock";
  if (top <= 10) return "paper";
  return "scissors";
}

/** Returns true iff a beats b in the rock-paper-scissors cycle for cyclicHandHierarchy. */
function cycleBeats(a: "rock" | "paper" | "scissors", b: "rock" | "paper" | "scissors"): boolean {
  if (a === b) return false;
  if (a === "rock" && b === "scissors") return true;
  if (a === "paper" && b === "rock") return true;
  if (a === "scissors" && b === "paper") return true;
  return false;
}

export const HIERARCHIES: Record<HierarchyId, Hierarchy> = {
  hierarchyByMeta: ({ ranking, hands }) => {
    const byId = idMap(hands);
    return ranking.slice().sort((a, b) => {
      const aBucket = BUCKET_RANK[metaBucket(byId.get(a)!)];
      const bBucket = BUCKET_RANK[metaBucket(byId.get(b)!)];
      if (aBucket !== bBucket) return aBucket - bBucket;
      return ranking.indexOf(a) - ranking.indexOf(b);
    });
  },

  cyclicHandHierarchy: ({ ranking, hands }) => {
    const byId = idMap(hands);
    // Three-way cycle: prefer the class that beats the largest number of opponents.
    return ranking.slice().sort((a, b) => {
      const aHand = byId.get(a);
      const bHand = byId.get(b);
      if (!aHand || !bHand) return 0;
      const aClass = handClass(aHand);
      const bClass = handClass(bHand);
      if (cycleBeats(aClass, bClass)) return -1;
      if (cycleBeats(bClass, aClass)) return 1;
      // Same class — fall back to base ranking position then top rank.
      const pos = ranking.indexOf(a) - ranking.indexOf(b);
      if (pos !== 0) return pos;
      return topRankOf(bHand) - topRankOf(aHand);
    });
  },

  pactMergeFirstLast: ({ ranking, hands }) => {
    // First + last hand IDs (by seat order) are merged: their average rank
    // value determines a single position they share at the top of the result;
    // remaining hands keep their base ordering after them.
    if (ranking.length < 2) return ranking.slice();
    const firstId = hands[0]?.id;
    const lastId = hands[hands.length - 1]?.id;
    if (!firstId || !lastId || firstId === lastId) return ranking.slice();
    const others = ranking.filter((id) => id !== firstId && id !== lastId);
    return [firstId, lastId, ...others];
  },

  colorTeamAssign: ({ ranking, hands }) => {
    // Sort red-team hands (predominantly H/D hole cards) ahead of black-team hands;
    // within each team, preserve the base ranking.
    const byId = idMap(hands);
    const isRedTeam = (hand: Hand | undefined): boolean => {
      if (!hand || hand.cards.length === 0) return false;
      const red = hand.cards.filter((card) => card.suit === "H" || card.suit === "D").length;
      return red * 2 >= hand.cards.length;
    };
    return ranking.slice().sort((a, b) => {
      const aRed = isRedTeam(byId.get(a)) ? 0 : 1;
      const bRed = isRedTeam(byId.get(b)) ? 0 : 1;
      if (aRed !== bRed) return aRed - bRed;
      return ranking.indexOf(a) - ranking.indexOf(b);
    });
  },

  adjacentRankBonus: ({ ranking, hands }) => {
    // Hands whose hole cards form an adjacent-rank pair across hands get a
    // small bonus that promotes them one slot.
    const byId = idMap(hands);
    const bonus = (hand: Hand | undefined): number => {
      if (!hand || hand.cards.length < 2) return 0;
      const ranks = hand.cards.map((card) => RANK_VALUE[card.rank]).sort((a, b) => a - b);
      for (let i = 1; i < ranks.length; i++) {
        if (ranks[i] - ranks[i - 1] === 1) return 1;
      }
      return 0;
    };
    return ranking.slice().sort((a, b) => {
      const bonusDelta = bonus(byId.get(b)) - bonus(byId.get(a));
      if (bonusDelta !== 0) return bonusDelta;
      return ranking.indexOf(a) - ranking.indexOf(b);
    });
  },

  matchRankInherit: ({ ranking, hands }) => {
    // Hands sharing a rank with a higher-ranked hand inherit that hand's
    // position, breaking ties by seat order.
    const byId = idMap(hands);
    const handRanks = (id: string): Set<Rank> => {
      const hand = byId.get(id);
      return new Set(hand?.cards.map((c) => c.rank) ?? []);
    };
    const result = ranking.slice();
    for (let i = 1; i < result.length; i++) {
      for (let j = 0; j < i; j++) {
        const sharedRank = [...handRanks(result[i])].some((rank) => handRanks(result[j]).has(rank));
        if (sharedRank) {
          // Move i adjacent to j (inherit position): swap into position j+1.
          const [moved] = result.splice(i, 1);
          result.splice(j + 1, 0, moved);
          break;
        }
      }
    }
    return result;
  },

  forceAdjacentTie: ({ ranking, hands }) => {
    // Seat-adjacent hands are forced into a shared position by averaging
    // their indices into a single combined slot at the top of their pair.
    if (hands.length < 2) return ranking.slice();
    const result = ranking.slice();
    for (let seat = 0; seat < hands.length - 1; seat += 2) {
      const aId = hands[seat]?.id;
      const bId = hands[seat + 1]?.id;
      if (!aId || !bId) continue;
      const aIdx = result.indexOf(aId);
      const bIdx = result.indexOf(bId);
      if (aIdx < 0 || bIdx < 0) continue;
      // Co-locate: insert the lower-indexed hand right before the higher.
      if (bIdx > aIdx + 1) {
        const [moved] = result.splice(bIdx, 1);
        result.splice(aIdx + 1, 0, moved);
      } else if (aIdx > bIdx + 1) {
        const [moved] = result.splice(aIdx, 1);
        result.splice(bIdx + 1, 0, moved);
      }
    }
    return result;
  },

  crowdedRankPenalty: ({ ranking, hands }) => {
    // Hands whose top-rank appears in many other hands are demoted.
    const byId = idMap(hands);
    const rankCount = new Map<Rank, number>();
    for (const hand of hands) {
      for (const card of hand.cards) {
        incrementMapCount(rankCount, card.rank);
      }
    }
    const penalty = (handId: string): number => {
      const hand = byId.get(handId);
      if (!hand || hand.cards.length === 0) return 0;
      const topRank = hand.cards.reduce((best, card) =>
        RANK_VALUE[card.rank] > RANK_VALUE[best.rank] ? card : best,
      ).rank;
      return rankCount.get(topRank) ?? 1;
    };
    return ranking.slice().sort((a, b) => {
      const aPenalty = penalty(a);
      const bPenalty = penalty(b);
      if (aPenalty !== bPenalty) return aPenalty - bPenalty;
      return ranking.indexOf(a) - ranking.indexOf(b);
    });
  },

  enforceOneCardPerBoardRow: ({ ranking }) => {
    // Display constraint — the base ranking already respects scoring; the
    // pyramid/board topology is enforced at deal time. Here we keep the
    // ranking unchanged but mark intent by returning a fresh array.
    return ranking.slice();
  },

  bridgeCardChoice: ({ ranking, hands, board }) => {
    // The shared "bridge" card on the board (last index) lends its color to
    // whichever group most matches it. We promote hands sharing the bridge
    // card's suit ahead of those that don't.
    const bridge = board[board.length - 1];
    if (!bridge) return ranking.slice();
    const byId = idMap(hands);
    return ranking.slice().sort((a, b) => {
      const aMatch = byId.get(a)?.cards.some((c) => c.suit === bridge.suit) ? 0 : 1;
      const bMatch = byId.get(b)?.cards.some((c) => c.suit === bridge.suit) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return ranking.indexOf(a) - ranking.indexOf(b);
    });
  },

  uniqueHandClassRequired: ({ ranking, hands }) => {
    // Only hands with a unique top-rank class score; duplicates are pushed
    // to the bottom in seat order.
    const byId = idMap(hands);
    const classOf = (id: string): string => {
      const hand = byId.get(id);
      if (!hand) return "";
      return handClass(hand);
    };
    const counts = new Map<string, number>();
    for (const id of ranking) incrementMapCount(counts, classOf(id));
    return ranking.slice().sort((a, b) => {
      const aUnique = (counts.get(classOf(a)) ?? 0) === 1 ? 0 : 1;
      const bUnique = (counts.get(classOf(b)) ?? 0) === 1 ? 0 : 1;
      if (aUnique !== bUnique) return aUnique - bUnique;
      return ranking.indexOf(a) - ranking.indexOf(b);
    });
  },
};
