import type { Card, Hand, Player, Rank, Suit } from "./types";
import { ROOM_CODE_LENGTH } from "./constants";

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Stable string key for a card — useful as a Set/Map key. */
export function cardKey(card: Card): string {
  return card.rank + card.suit;
}

/** Pokersolver's lowercase suit chars, in canonical order (h, d, c, s). */
export const POKER_SUITS = ["h", "d", "c", "s"] as const;

/**
 * Deduplicate a list of pokersolver-format card strings (e.g. ["Ah","Kh"]).
 * On collision, picks the next unused suit for the same rank; drops the
 * candidate entirely if every suit is taken. Used when synthesizing inputs
 * for hypothetical hand evaluations.
 */
export function normalizeSolverStrings(cards: readonly string[]): string[] {
  const used = new Set<string>();
  const out: string[] = [];
  for (const raw of cards) {
    if (!used.has(raw)) {
      used.add(raw);
      out.push(raw);
      continue;
    }
    const rank = raw.slice(0, -1);
    const replacement = POKER_SUITS
      .map((suit) => `${rank}${suit}`)
      .find((candidate) => !used.has(candidate));
    if (!replacement) continue;
    used.add(replacement);
    out.push(replacement);
  }
  return out;
}

export function cardToPokersolverStr(card: Card): string {
  const rankMap: Record<string, string> = {
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    T: "T",
    J: "J",
    Q: "Q",
    K: "K",
    A: "A",
  };
  const suitMap: Record<Suit, string> = {
    H: "h",
    D: "d",
    C: "c",
    S: "s",
  };
  return rankMap[card.rank] + suitMap[card.suit];
}

export function getSuitSymbol(suit: Suit): string {
  const symbols: Record<Suit, string> = {
    H: "♥",
    D: "♦",
    C: "♣",
    S: "♠",
  };
  return symbols[suit];
}

export function getRankDisplay(rank: Rank): string {
  return rank === "T" ? "10" : rank;
}

/**
 * Returns a new Set with `item` toggled — added if absent, removed if present.
 * When `maxSize` is provided, adds are skipped past that size (the original
 * Set is returned via the new copy unchanged in the over-cap case).
 */
export function toggleInSet<T>(prev: ReadonlySet<T>, item: T, maxSize?: number): Set<T> {
  const next = new Set(prev);
  if (next.has(item)) {
    next.delete(item);
  } else if (maxSize === undefined || next.size < maxSize) {
    next.add(item);
  }
  return next;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function incrementMapCount<K>(map: Map<K, number>, key: K, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

export function idMap<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

/** Drops null/undefined entries; preserves the narrowed element type. */
export function filterDefined<T>(items: readonly (T | null | undefined)[]): T[] {
  return items.filter((item): item is T => item !== undefined && item !== null);
}

/** True iff handId currently occupies a slot in the ranking array. */
export function isHandRanked(ranking: readonly (string | null)[], handId: string): boolean {
  return ranking.indexOf(handId) !== -1;
}

/** True iff handId is not present in any ranking slot. */
export function isHandUnranked(ranking: readonly (string | null)[], handId: string): boolean {
  return ranking.indexOf(handId) === -1;
}

/** Returns the element one step clockwise (next index) from myIndex, wrapping. */
export function leftNeighbor<T>(items: readonly T[], myIndex: number): T {
  return items[(myIndex + 1) % items.length];
}

/** Returns the element one step counter-clockwise (previous index) from myIndex, wrapping. */
export function rightNeighbor<T>(items: readonly T[], myIndex: number): T {
  return items[(myIndex + items.length - 1) % items.length];
}

export function findPlayerById(players: readonly Player[], id: string | undefined | null): Player | undefined {
  if (!id) return undefined;
  return players.find((p) => p.id === id);
}

export function findHandById(hands: readonly Hand[], id: string | undefined | null): Hand | undefined {
  if (!id) return undefined;
  return hands.find((h) => h.id === id);
}

export function filterHandsByPlayer(hands: readonly Hand[], playerId: string): Hand[] {
  return hands.filter((h) => h.playerId === playerId);
}
