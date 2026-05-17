/**
 * Ding's StrengthScaler — wraps `handStrength.ts` and `range.ts` behind the
 * GameMode contract. Adds the board-signature memoization that the audit
 * called out as the biggest single perf win:
 *
 * `buildPercentileMap` evaluates 1,225 pokersolver hands per call. Without
 * memoization it ran every tick, multiplying bot decision CPU. With this
 * memo, the result is reused across all bots within a phase as long as the
 * board is unchanged (which is always: community cards only change at phase
 * transitions, and the excluded set varies very little within a phase).
 */

import type { Card } from "../../lib/types";
import { cardKey } from "../../lib/utils";
import {
  buildAbsoluteStrengthMap,
  buildPercentileMap,
} from "../../lib/ai/range";
import {
  currentHandStrength,
  estimateStrength,
} from "../../lib/ai/handStrength";
import type { StrengthScaler } from "../../lib/gameMode/types";

function boardSig(board: Card[]): string {
  return board.map(cardKey).join("");
}

function excludedSig(excluded: Set<string>): string {
  // Sort to get a stable key. Excluded sets are at most ~52 entries.
  const xs = Array.from(excluded);
  xs.sort();
  return xs.join("|");
}

function makeKey(excluded: Set<string>, board: Card[]): string {
  return boardSig(board) + "::" + excludedSig(excluded);
}

/**
 * Memoization caches. Keys are `boardSig + excludedSig`. Bounded LRU
 * behavior is implicit: phase transitions create new keys; old entries
 * remain in memory. With at most one game's worth of (phase, excluded)
 * combinations alive at a time the cache stays small (< ~100 entries).
 */
const percentileCache = new Map<string, Map<string, number>>();
const absStrengthCache = new Map<string, Map<string, number>>();

const MAX_CACHE_ENTRIES = 256;

function trimCache<V>(cache: Map<string, V>): void {
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export const dingScaler: StrengthScaler = {
  ownHandStrength(hole: Card[], board: Card[]): number {
    return currentHandStrength(hole, board);
  },
  estimateStrength(hole: Card[], board: Card[], fieldSize: number, nSims?: number): number {
    return estimateStrength(hole, board, fieldSize, nSims ?? 40);
  },
  buildPercentileMap(excluded: Set<string>, board: Card[]): Map<string, number> {
    const key = makeKey(excluded, board);
    const hit = percentileCache.get(key);
    if (hit) return hit;
    const built = buildPercentileMap(excluded, board);
    percentileCache.set(key, built);
    trimCache(percentileCache);
    return built;
  },
  buildAbsoluteStrengthMap(excluded: Set<string>, board: Card[]): Map<string, number> {
    const key = makeKey(excluded, board);
    const hit = absStrengthCache.get(key);
    if (hit) return hit;
    const built = buildAbsoluteStrengthMap(excluded, board);
    absStrengthCache.set(key, built);
    trimCache(absStrengthCache);
    return built;
  },
};
