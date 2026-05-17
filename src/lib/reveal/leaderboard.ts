import type { GameState, Hand, Player } from "../types";
import { findPlayerById, idMap } from "../utils";

export interface RevealRow {
  handId: string;
  hand: Hand;
  player: Player | undefined;
  trueRank: number;
  guessedRank: number | null;
  delta: number | null;
  correct: boolean;
  madeHand: string;
  history: (number | null)[];
  phaseDisplacements: (number | null)[];
  phaseScore: number;
  mine: boolean;
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  off: number;
  mine: boolean;
  rank: number;
}

interface DisplacementResult {
  ranked: LeaderboardEntry[];
  best: LeaderboardEntry;
  worst: LeaderboardEntry;
  maxOff: number;
  myEntry: LeaderboardEntry | undefined;
}

export function computeRevealRows(gameState: GameState, myId: string): RevealRow[] {
  const trueRanks = gameState.trueRanks!;
  const trueRanking = gameState.trueRanking!;
  const handMap = idMap(gameState.hands);
  const total = gameState.hands.length;

  return trueRanking.map((handId) => {
    const hand = handMap.get(handId)!;
    const player = findPlayerById(gameState.players, hand.playerId);
    const trueRank = trueRanks[handId];
    const guessedIdx = gameState.ranking.indexOf(handId);
    const guessedRank = guessedIdx === -1 ? null : guessedIdx + 1;
    const tieGroupMin = trueRanking.findIndex((id) => trueRanks[id] === trueRank) + 1;
    const tieGroupSize = Object.values(trueRanks).filter((r) => r === trueRank).length;
    const tieGroupMax = tieGroupMin + tieGroupSize - 1;
    const correct =
      guessedRank !== null &&
      guessedRank >= tieGroupMin &&
      guessedRank <= tieGroupMax;
    const delta = guessedRank !== null ? guessedRank - trueRank : null;
    const madeHand = hand.flipped ? (hand.madeHandName ?? "") : "";
    const history = gameState.rankHistory[handId] ?? [null, null, null, null];
    const mine = hand.playerId === myId;

    const phaseWeights = [0.15, 0.25, 0.30, 0.30];
    const phaseDisplacements: (number | null)[] = [];
    let phaseScore = 0;
    let totalWeight = 0;

    for (let pi = 0; pi < 4; pi++) {
      const rank = history[pi];
      if (rank === null || rank === undefined) {
        phaseDisplacements.push(null);
        continue;
      }
      let displacement = 0;
      if (rank < tieGroupMin) {
        displacement = tieGroupMin - rank;
      } else if (rank > tieGroupMax) {
        displacement = rank - tieGroupMax;
      }
      phaseDisplacements.push(displacement);
      const accuracy = 1 - displacement / total;
      phaseScore += accuracy * phaseWeights[pi];
      totalWeight += phaseWeights[pi];
    }

    if (totalWeight > 0) {
      phaseScore = phaseScore / totalWeight;
    }

    return {
      handId, hand, player, trueRank, guessedRank, delta, correct, madeHand,
      history, phaseDisplacements, phaseScore, mine,
    };
  });
}

export function computeDisplacementLeaderboard(
  gameState: GameState,
  myId: string
): DisplacementResult {
  const trueRanks = gameState.trueRanks!;
  const trueRanking = gameState.trueRanking!;
  const handMap = idMap(gameState.hands);

  const displacementByPlayer = new Map<string, number>();
  gameState.ranking.forEach((handId, i) => {
    if (!handId) return;
    const hand = handMap.get(handId);
    if (!hand) return;
    const tR = trueRanks[handId];
    const tieMin = trueRanking.findIndex((id) => trueRanks[id] === tR) + 1;
    const tieSize = Object.values(trueRanks).filter((r) => r === tR).length;
    const claimed = i + 1;
    let dist = 0;
    if (claimed < tieMin) dist = tieMin - claimed;
    else if (claimed > tieMin + tieSize - 1) dist = claimed - (tieMin + tieSize - 1);
    displacementByPlayer.set(hand.playerId, (displacementByPlayer.get(hand.playerId) ?? 0) + dist);
  });

  const sorted = Array.from(displacementByPlayer.entries())
    .map(([playerId, off]) => ({
      playerId,
      name: findPlayerById(gameState.players, playerId)?.name ?? "?",
      off,
      mine: playerId === myId,
    }))
    .sort((a, b) => a.off - b.off);

  const ranked: LeaderboardEntry[] = sorted.map((entry) => ({
    ...entry,
    rank: sorted.findIndex((e) => e.off === entry.off) + 1,
  }));

  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const maxOff = Math.max(...ranked.map((r) => r.off), 1);
  const myEntry = ranked.find((r) => r.mine);
  return { ranked, best, worst, maxOff, myEntry };
}

export interface InversionsData {
  invByPlayer: Record<string, number[]>;
  teamSeries: number[];
  players: Array<{ id: string; name: string }>;
  myId: string;
}

const PHASE_KEYS = ["preflop", "flop", "turn", "river"] as const;

function computeTeamInversionsByPhase(
  rankHistory: GameState["rankHistory"],
  trueRanks: Record<string, number>,
  totalHands: number,
): { preflop: number; flop: number; turn: number; river: number } {
  const out = { preflop: 0, flop: 0, turn: 0, river: 0 };
  for (let pi = 0; pi < 4; pi++) {
    const ranking: (string | null)[] = new Array(totalHands).fill(null);
    for (const [handId, history] of Object.entries(rankHistory)) {
      const rank = history[pi];
      if (rank !== null && rank !== undefined) ranking[rank - 1] = handId;
    }
    const claimed = ranking.filter((id): id is string => id !== null);
    let inversions = 0;
    for (let i = 0; i < claimed.length; i++) {
      for (let j = i + 1; j < claimed.length; j++) {
        const rankI = trueRanks[claimed[i]];
        const rankJ = trueRanks[claimed[j]];
        if (rankI !== undefined && rankJ !== undefined && rankI > rankJ) inversions++;
      }
    }
    out[PHASE_KEYS[pi]] = inversions;
  }
  return out;
}

export function computeInversionsData(gameState: GameState, myId: string): InversionsData {
  const { hands, ranking, rankHistory, trueRanks, trueRanking } = gameState;
  if (!trueRanks || !trueRanking) {
    return { invByPlayer: {}, teamSeries: [0, 0, 0, 0, 0], players: [], myId };
  }

  const players = gameState.players.map((p) => ({ id: p.id, name: p.name }));
  const invByPlayer: Record<string, number[]> = {};
  players.forEach((p) => { invByPlayer[p.id] = [0, 0, 0, 0, 0]; });

  type ClaimedRow = { rank: number; playerId: string; trueRank: number };

  function tallyInversions(claimed: ClaimedRow[], slot: number) {
    claimed.sort((a, b) => a.rank - b.rank);
    for (let i = 0; i < claimed.length; i++) {
      for (let j = i + 1; j < claimed.length; j++) {
        if (claimed[i].trueRank > claimed[j].trueRank) {
          const a = claimed[i].playerId;
          const b = claimed[j].playerId;
          if (invByPlayer[a]) invByPlayer[a][slot]++;
          if (invByPlayer[b] && b !== a) invByPlayer[b][slot]++;
        }
      }
    }
  }

  function rowsFromRank(getRank: (h: (typeof hands)[0]) => number | null | undefined): ClaimedRow[] {
    const out: ClaimedRow[] = [];
    for (const hand of hands) {
      const r = getRank(hand);
      if (r != null) out.push({ rank: r, playerId: hand.playerId, trueRank: trueRanks![hand.id] ?? 0 });
    }
    return out;
  }

  for (let pi = 0; pi < 4; pi++) {
    tallyInversions(rowsFromRank((h) => (rankHistory[h.id] ?? [])[pi]), pi);
  }

  const finalClaimed = rowsFromRank((h) => {
    const idx = ranking.indexOf(h.id);
    return idx === -1 ? null : idx + 1;
  });
  tallyInversions(finalClaimed, 4);

  const teamInv = computeTeamInversionsByPhase(rankHistory, trueRanks, hands.length);
  const finalSorted = [...hands]
    .map((h) => ({ idx: ranking.indexOf(h.id), trueRank: trueRanks[h.id] ?? 0 }))
    .filter((x) => x.idx !== -1)
    .sort((a, b) => a.idx - b.idx);
  let finalInv = 0;
  for (let i = 0; i < finalSorted.length; i++) {
    for (let j = i + 1; j < finalSorted.length; j++) {
      if (finalSorted[i].trueRank > finalSorted[j].trueRank) finalInv++;
    }
  }

  const teamSeries = [teamInv.preflop, teamInv.flop, teamInv.turn, teamInv.river, finalInv];

  return { invByPlayer, teamSeries, players, myId };
}
