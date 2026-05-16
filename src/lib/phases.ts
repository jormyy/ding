import type { Phase } from "./types";

/**
 * Ordered list of the four cards-on-the-table game phases (excludes lobby
 * and reveal). Used wherever code needs to test "is this an active dealing
 * phase" or iterate per-phase histories.
 */
export const GAME_PHASES: readonly Phase[] = ["preflop", "flop", "turn", "river"];

/**
 * Full canonical phase order: lobby → dealChoice → cards-on-the-table →
 * reveal. Used by the lifecycle advance and by phase-index lookups.
 */
export const ALL_PHASES: readonly Phase[] = [
  "lobby",
  "dealChoice",
  "preflop",
  "flop",
  "turn",
  "river",
  "reveal",
];
