import type { GameState, Hand, Player } from "../types";

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

export interface DisplacementResult {
  ranked: LeaderboardEntry[];
  best: LeaderboardEntry;
  worst: LeaderboardEntry;
  maxOff: number;
  myEntry: LeaderboardEntry | undefined;
}

export interface PhasePerformanceEntry {
  playerId: string;
  name: string;
  mine: boolean;
  preflopAvg: number | null;
  flopAvg: number | null;
  turnAvg: number | null;
  riverAvg: number | null;
  cumulativeAvg: number;
}

export interface PhasePerformanceData {
  phaseLeaders: { preflop: string | null; flop: string | null; turn: string | null; river: string | null };
  teamInversions: { preflop: number; flop: number; turn: number; river: number };
  entries: PhasePerformanceEntry[];
}

export function computeRevealRows(gameState: GameState, myId: string): RevealRow[] {
  const trueRanks = gameState.trueRanks!;
  const trueRanking = gameState.trueRanking!;
  const handMap = new Map<string, Hand>(gameState.hands.map((h) => [h.id, h]));
  const total = gameState.hands.length;

  return trueRanking.map((handId) => {
    const hand = handMap.get(handId)!;
    const player = gameState.players.find((p) => p.id === hand.playerId);
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
  const handMap = new Map<string, Hand>(gameState.hands.map((h) => [h.id, h]));

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
      name: gameState.players.find((p) => p.id === playerId)?.name ?? "?",
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

export function computePhasePerformance(
  gameState: GameState,
  myId: string
): PhasePerformanceData {
  const { hands, rankHistory, trueRanking, trueRanks } = gameState;
  if (!trueRanking || !trueRanks) {
    return {
      phaseLeaders: { preflop: null, flop: null, turn: null, river: null },
      teamInversions: { preflop: 0, flop: 0, turn: 0, river: 0 },
      entries: [],
    };
  }

  const totalHands = hands.length;

  const phaseRankings: Record<string, (string | null)[]> = {};
  const teamInversions: Record<string, number> = { preflop: 0, flop: 0, turn: 0, river: 0 };

  for (let pi = 0; pi < 4; pi++) {
    const ranking: (string | null)[] = new Array(totalHands).fill(null);
    for (const [handId, history] of Object.entries(rankHistory)) {
      const rank = history[pi];
      if (rank !== null && rank !== undefined) {
        ranking[rank - 1] = handId;
      }
    }
    phaseRankings[PHASE_KEYS[pi]] = ranking;

    const claimed = ranking.filter((id): id is string => id !== null);
    let inversions = 0;
    for (let i = 0; i < claimed.length; i++) {
      for (let j = i + 1; j < claimed.length; j++) {
        const rankI = trueRanks[claimed[i]];
        const rankJ = trueRanks[claimed[j]];
        if (rankI !== undefined && rankJ !== undefined && rankI > rankJ) {
          inversions++;
        }
      }
    }
    teamInversions[PHASE_KEYS[pi]] = inversions;
  }

  const playerMap = new Map<
    string,
    {
      playerId: string;
      name: string;
      mine: boolean;
      ranks: Record<string, number[]>;
    }
  >();

  for (const hand of hands) {
    const pid = hand.playerId;
    if (!playerMap.has(pid)) {
      playerMap.set(pid, {
        playerId: pid,
        name: gameState.players.find((p) => p.id === pid)?.name ?? "?",
        mine: pid === myId,
        ranks: { preflop: [], flop: [], turn: [], river: [] },
      });
    }
    const pd = playerMap.get(pid)!;
    const history = rankHistory[hand.id];
    if (!history) continue;
    for (let pi = 0; pi < 4; pi++) {
      const rank = history[pi];
      if (rank !== null && rank !== undefined) {
        pd.ranks[PHASE_KEYS[pi]].push(rank);
      }
    }
  }

  const entries: PhasePerformanceEntry[] = [];
  const phaseLeaders: Record<string, string | null> = { preflop: null, flop: null, turn: null, river: null };
  let bestPreflop = Infinity;
  let bestFlop = Infinity;
  let bestTurn = Infinity;
  let bestRiver = Infinity;

  for (const [, pd] of playerMap) {
    const preflopAvg = pd.ranks.preflop.length > 0
      ? pd.ranks.preflop.reduce((s, r) => s + r, 0) / pd.ranks.preflop.length
      : null;
    const flopAvg = pd.ranks.flop.length > 0
      ? pd.ranks.flop.reduce((s, r) => s + r, 0) / pd.ranks.flop.length
      : null;
    const turnAvg = pd.ranks.turn.length > 0
      ? pd.ranks.turn.reduce((s, r) => s + r, 0) / pd.ranks.turn.length
      : null;
    const riverAvg = pd.ranks.river.length > 0
      ? pd.ranks.river.reduce((s, r) => s + r, 0) / pd.ranks.river.length
      : null;

    const validAvgs = [preflopAvg, flopAvg, turnAvg, riverAvg].filter((a): a is number => a !== null);
    const cumulativeAvg = validAvgs.length > 0
      ? validAvgs.reduce((s, a) => s + a, 0) / validAvgs.length
      : totalHands;

    entries.push({
      playerId: pd.playerId,
      name: pd.name,
      mine: pd.mine,
      preflopAvg,
      flopAvg,
      turnAvg,
      riverAvg,
      cumulativeAvg,
    });

    if (preflopAvg !== null && preflopAvg < bestPreflop) { bestPreflop = preflopAvg; phaseLeaders.preflop = pd.name; }
    if (flopAvg !== null && flopAvg < bestFlop) { bestFlop = flopAvg; phaseLeaders.flop = pd.name; }
    if (turnAvg !== null && turnAvg < bestTurn) { bestTurn = turnAvg; phaseLeaders.turn = pd.name; }
    if (riverAvg !== null && riverAvg < bestRiver) { bestRiver = riverAvg; phaseLeaders.river = pd.name; }
  }

  entries.sort((a, b) => a.cumulativeAvg - b.cumulativeAvg);

  return {
    phaseLeaders: phaseLeaders as PhasePerformanceData["phaseLeaders"],
    teamInversions: teamInversions as PhasePerformanceData["teamInversions"],
    entries,
  };
}

export function computeInversionsData(gameState: GameState, myId: string): InversionsData {
  const { hands, ranking, rankHistory, trueRanks, trueRanking } = gameState;
  if (!trueRanks || !trueRanking) {
    return { invByPlayer: {}, teamSeries: [0, 0, 0, 0, 0], players: [], myId };
  }

  const players = gameState.players.map((p) => ({ id: p.id, name: p.name }));
  const invByPlayer: Record<string, number[]> = {};
  players.forEach((p) => { invByPlayer[p.id] = [0, 0, 0, 0, 0]; });

  function tallyPhase(getRank: (h: (typeof hands)[0]) => number | null | undefined, slot: number) {
    const claimed: { rank: number; playerId: string; trueRank: number }[] = [];
    for (const hand of hands) {
      const r = getRank(hand);
      if (r != null) {
        claimed.push({ rank: r, playerId: hand.playerId, trueRank: trueRanks![hand.id] ?? 0 });
      }
    }
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

  for (let pi = 0; pi < 4; pi++) {
    tallyPhase((h) => (rankHistory[h.id] ?? [])[pi], pi);
  }

  const finalClaimed = hands
    .map((h) => {
      const idx = ranking.indexOf(h.id);
      return idx === -1 ? null : { rank: idx + 1, playerId: h.playerId, trueRank: trueRanks[h.id] ?? 0 };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.rank - b.rank);

  for (let i = 0; i < finalClaimed.length; i++) {
    for (let j = i + 1; j < finalClaimed.length; j++) {
      if (finalClaimed[i].trueRank > finalClaimed[j].trueRank) {
        const a = finalClaimed[i].playerId;
        const b = finalClaimed[j].playerId;
        if (invByPlayer[a]) invByPlayer[a][4]++;
        if (invByPlayer[b] && b !== a) invByPlayer[b][4]++;
      }
    }
  }

  const teamInv = computePhasePerformance(gameState, myId).teamInversions;
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
