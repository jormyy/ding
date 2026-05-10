import type { Phase } from "./types";

export const DEFAULT_GAME_MODE_ID = "ding";

export type DeckKind = "standard" | "short";

export type ScoreRule =
  | "high"
  | "lowball"
  | "flush"
  | "straight"
  | "pairs"
  | "red"
  | "black";

export interface GameModeDealRule {
  /** Cards consumed per hand before any automatic keep/discard rule. */
  holeCards: number;
  /** Cards kept in the hand after deal. Omitted means keep every hole card. */
  keepCards?: number;
  /** Cards from each hand shown to every player before reveal. */
  publicCards?: number;
  /** Total community cards dealt for showdown. */
  communityCards: number;
  /** Community cards visible in each phase. Reveal always shows all cards. */
  visibleCommunityCards?: Partial<Record<Phase, number>>;
  /** Deck family to deal from. */
  deck?: DeckKind;
}

export interface DingGameModeDefinition {
  id: string;
  name: string;
  shortName: string;
  summary: string;
  detail: string;
  tags: readonly string[];
  deal: GameModeDealRule;
  score: ScoreRule;
}

const standardDeal: GameModeDealRule = {
  holeCards: 2,
  communityCards: 5,
};

const baseVisibleCommunity: Record<Phase, number> = {
  lobby: 0,
  preflop: 0,
  flop: 3,
  turn: 4,
  river: 5,
  reveal: 5,
};

export const GAME_MODE_DEFINITIONS: readonly DingGameModeDefinition[] = [
  {
    id: "ding",
    name: "Classic Ding",
    shortName: "Classic",
    summary: "The original cooperative hold'em ranking game.",
    detail: "Two private cards, five shared board cards, strongest poker hand wins.",
    tags: ["default", "balanced"],
    deal: standardDeal,
    score: "high",
  },
  {
    id: "draw-three",
    name: "Draw 3, Discard 1",
    shortName: "Draw 3",
    summary: "Every hand is dealt three cards and automatically keeps its best two-card start.",
    detail: "The discard happens before pre-flop so players still coordinate with two-card hands.",
    tags: ["swingy", "friendly"],
    deal: { ...standardDeal, holeCards: 3, keepCards: 2 },
    score: "high",
  },
  {
    id: "one-up",
    name: "One Up",
    shortName: "One Up",
    summary: "One card from every hand is public from the start.",
    detail: "The exposed card gives the table shared anchors without revealing the full hand.",
    tags: ["social", "information"],
    deal: { ...standardDeal, publicCards: 1 },
    score: "high",
  },
  {
    id: "open-book",
    name: "Open Book",
    shortName: "Open",
    summary: "Everyone's hole cards are public.",
    detail: "A low-bluff, high-coordination mode where disagreements are about interpretation.",
    tags: ["transparent", "fast"],
    deal: { ...standardDeal, publicCards: 2 },
    score: "high",
  },
  {
    id: "short-deck",
    name: "Short Deck",
    shortName: "Short",
    summary: "Cards two through five are removed before the deal.",
    detail: "Compressed ranks make strong hands common and hand reading more volatile.",
    tags: ["volatile", "compact"],
    deal: { ...standardDeal, deck: "short" },
    score: "high",
  },
  {
    id: "lowball",
    name: "Lowball Ding",
    shortName: "Lowball",
    summary: "The worst poker hand wins the top slot.",
    detail: "Ranking instincts invert: weak high-card hands become the hands to protect.",
    tags: ["inverted", "mind-bending"],
    deal: standardDeal,
    score: "lowball",
  },
  {
    id: "omaha-luxe",
    name: "Omaha Luxe",
    shortName: "Omaha",
    summary: "Four private cards per hand, best five-card poker hand wins.",
    detail: "More private information creates bigger late-street reversals and tougher negotiation.",
    tags: ["big-hands", "complex"],
    deal: { ...standardDeal, holeCards: 4 },
    score: "high",
  },
  {
    id: "triad",
    name: "Triad",
    shortName: "Triad",
    summary: "Three private cards per hand, best five-card poker hand wins.",
    detail: "A lighter multi-card mode with enough extra texture to make rankings less obvious.",
    tags: ["big-hands", "swingy"],
    deal: { ...standardDeal, holeCards: 3 },
    score: "high",
  },
  {
    id: "single-spark",
    name: "Single Spark",
    shortName: "Spark",
    summary: "Each hand gets one private card instead of two.",
    detail: "Tiny private edges make public-board reading and player confidence matter more.",
    tags: ["minimal", "fast"],
    deal: { ...standardDeal, holeCards: 1 },
    score: "high",
  },
  {
    id: "double-river",
    name: "Double River",
    shortName: "2 River",
    summary: "The river reveals two final community cards.",
    detail: "Six-card boards create dramatic final re-sorts without changing the core loop.",
    tags: ["late-swing", "board"],
    deal: {
      holeCards: 2,
      communityCards: 6,
      visibleCommunityCards: { ...baseVisibleCommunity, river: 6, reveal: 6 },
    },
    score: "high",
  },
  {
    id: "big-sky",
    name: "Big Sky",
    shortName: "Big Sky",
    summary: "A seven-card board gives every hand more ways to connect.",
    detail: "The board grows to four on the flop, five on the turn, and seven on the river.",
    tags: ["board", "chaotic"],
    deal: {
      holeCards: 2,
      communityCards: 7,
      visibleCommunityCards: { lobby: 0, preflop: 0, flop: 4, turn: 5, river: 7, reveal: 7 },
    },
    score: "high",
  },
  {
    id: "flash-flop",
    name: "Flash Flop",
    shortName: "Flash",
    summary: "The flop is visible before anyone ranks a hand.",
    detail: "Players start with real board context, so early rankings are less random.",
    tags: ["information", "fast"],
    deal: {
      holeCards: 2,
      communityCards: 5,
      visibleCommunityCards: { ...baseVisibleCommunity, preflop: 3 },
    },
    score: "high",
  },
  {
    id: "blackout",
    name: "Blackout",
    shortName: "Blackout",
    summary: "No community cards are shown until the river.",
    detail: "The first three streets are pure private-hand debate, then the board lands all at once.",
    tags: ["bluff", "suspense"],
    deal: {
      holeCards: 2,
      communityCards: 5,
      visibleCommunityCards: { lobby: 0, preflop: 0, flop: 0, turn: 0, river: 5, reveal: 5 },
    },
    score: "high",
  },
  {
    id: "slow-burn",
    name: "Slow Burn",
    shortName: "Slow",
    summary: "The board arrives one card, then three, then five.",
    detail: "A narrow flop makes early confidence brittle and keeps trades alive longer.",
    tags: ["suspense", "board"],
    deal: {
      holeCards: 2,
      communityCards: 5,
      visibleCommunityCards: { lobby: 0, preflop: 0, flop: 1, turn: 3, river: 5, reveal: 5 },
    },
    score: "high",
  },
  {
    id: "turnpike",
    name: "Turnpike",
    shortName: "Turnpike",
    summary: "Four community cards hit on the flop, then the game pauses before the river.",
    detail: "Most of the board appears early, making the final card a sharper negotiation point.",
    tags: ["board", "tempo"],
    deal: {
      holeCards: 2,
      communityCards: 5,
      visibleCommunityCards: { lobby: 0, preflop: 0, flop: 4, turn: 4, river: 5, reveal: 5 },
    },
    score: "high",
  },
  {
    id: "flush-hunt",
    name: "Flush Hunt",
    shortName: "Flush",
    summary: "Hands rank by the largest same-suit cluster first.",
    detail: "Poker strength breaks ties, but suit density is the primary objective.",
    tags: ["objective", "suits"],
    deal: standardDeal,
    score: "flush",
  },
  {
    id: "straight-hunt",
    name: "Straight Hunt",
    shortName: "Straight",
    summary: "Hands rank by their longest rank run first.",
    detail: "Poker strength breaks ties, but connected cards define the table order.",
    tags: ["objective", "ranks"],
    deal: standardDeal,
    score: "straight",
  },
  {
    id: "pair-party",
    name: "Pair Party",
    shortName: "Pairs",
    summary: "Pairs, trips, and quads are the main scoring target.",
    detail: "The best multiplicity profile wins, with normal poker strength as the tiebreaker.",
    tags: ["objective", "ranks"],
    deal: standardDeal,
    score: "pairs",
  },
  {
    id: "red-shift",
    name: "Red Shift",
    shortName: "Red",
    summary: "Red cards are the primary scoring resource.",
    detail: "More hearts and diamonds rank higher; poker strength breaks close red counts.",
    tags: ["objective", "color"],
    deal: standardDeal,
    score: "red",
  },
  {
    id: "black-ice",
    name: "Black Ice",
    shortName: "Black",
    summary: "Black cards are the primary scoring resource.",
    detail: "More clubs and spades rank higher; poker strength breaks close black counts.",
    tags: ["objective", "color"],
    deal: standardDeal,
    score: "black",
  },
] as const;

const modeById = new Map(GAME_MODE_DEFINITIONS.map((mode) => [mode.id, mode]));

export function listGameModes(): readonly DingGameModeDefinition[] {
  return GAME_MODE_DEFINITIONS;
}

export function isGameModeId(id: string): boolean {
  return modeById.has(id);
}

export function getGameModeDefinition(id: string | undefined): DingGameModeDefinition {
  return modeById.get(id ?? "") ?? modeById.get(DEFAULT_GAME_MODE_ID)!;
}

export function visibleCommunityCardCount(modeId: string | undefined, phase: Phase): number {
  const mode = getGameModeDefinition(modeId);
  if (phase === "reveal") return mode.deal.communityCards;
  const configured = mode.deal.visibleCommunityCards?.[phase];
  if (configured !== undefined) {
    return Math.max(0, Math.min(mode.deal.communityCards, configured));
  }
  const fallback = baseVisibleCommunity[phase] ?? 0;
  return Math.max(0, Math.min(mode.deal.communityCards, fallback));
}

export function deckSizeForMode(modeId: string | undefined): number {
  return getGameModeDefinition(modeId).deal.deck === "short" ? 36 : 52;
}

export function getMaxTotalHandsForMode(modeId: string | undefined): number {
  const mode = getGameModeDefinition(modeId);
  const burns = 3;
  const availableForHands = deckSizeForMode(mode.id) - mode.deal.communityCards - burns;
  return Math.max(1, Math.floor(availableForHands / mode.deal.holeCards));
}

export function getMaxHandsPerPlayerForMode(modeId: string | undefined, playerCount: number): number {
  if (playerCount <= 0) return 1;
  return Math.max(1, Math.floor(getMaxTotalHandsForMode(modeId) / playerCount));
}
