/**
 * Ding's phase definitions. Engine reads `PhaseSpec[]` from the mode; the
 * legacy arrays in `src/lib/constants.ts` are derived from the same metadata
 * for backwards compatibility while the migration completes.
 */

import type { PhaseSpec } from "../../lib/gameMode/types";

export const dingPhases: ReadonlyArray<PhaseSpec> = [
  { id: "lobby", label: "Lobby", stepLabel: "Lobby" },
  { id: "preflop", label: "preflop", short: "P", history: "Pre", stepLabel: "Pre-flop" },
  { id: "flop", label: "flop", short: "F", history: "Flop", stepLabel: "Flop" },
  { id: "turn", label: "turn", short: "T", history: "Turn", stepLabel: "Turn" },
  { id: "river", label: "river", short: "R", history: "River", stepLabel: "River" },
  { id: "reveal", label: "Reveal", stepLabel: "Reveal" },
] as const;
