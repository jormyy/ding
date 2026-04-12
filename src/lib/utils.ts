import type { Card, Rank, Suit } from "./types";

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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

export function cardToDisplayString(card: Card): string {
  return `${card.rank}${card.suit}`;
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

export function isRedSuit(suit: Suit): boolean {
  return suit === "H" || suit === "D";
}

export function getSuitColor(suit: Suit): string {
  const colors: Record<Suit, string> = {
    H: "text-red-500",
    D: "text-blue-500",
    C: "text-emerald-600",
    S: "text-gray-900",
  };
  return colors[suit];
}

export function getRankDisplay(rank: Rank): string {
  return rank === "T" ? "10" : rank;
}
