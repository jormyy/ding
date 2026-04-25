import type { Card, Rank, Suit } from "./types";
import { ROOM_CODE_LENGTH } from "./constants";

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
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
