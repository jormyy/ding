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

export function computeRevealRows(gameState: GameState, myId: string): RevealRow[] {
  const trueRanks = gameState.trueRanks!;
  const trueRanking = gameState.trueRanking!;
  const handMap = new Map<string, Hand>(gameState.hands.map((h) => [h.id, h]));

  return trueRanking.map((handId) => {
    const hand = handMap.get(handId)!;
    const player = gameState.players.find((p) => p.id === hand.playerId);
    const trueRank = trueRanks[handId];
    const guessedIdx = gameState.ranking.indexOf(handId);
    const guessedRank = guessedIdx === -1 ? null : guessedIdx + 1;
    const tieGroupMin = trueRanking.findIndex((id) => trueRanks[id] === trueRank) + 1;
    const tieGroupSize = Object.values(trueRanks).filter((r) => r === trueRank).length;
    const correct =
      guessedRank !== null &&
      guessedRank >= tieGroupMin &&
      guessedRank <= tieGroupMin + tieGroupSize - 1;
    const delta = guessedRank !== null ? guessedRank - trueRank : null;
    const madeHand = hand.flipped ? (hand.madeHandName ?? "") : "";
    const history = gameState.rankHistory[handId] ?? [null, null, null, null];
    const mine = hand.playerId === myId;
    return { handId, hand, player, trueRank, guessedRank, delta, correct, madeHand, history, mine };
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
