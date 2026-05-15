import type { DingGameModeDefinition } from "@/lib/gameMode";

export type DealChoiceVariant =
  | "peekKeep"
  | "mulligan"
  | "tradeUp"
  | "inheritance"
  | "exposeChoice"
  | "auction"
  | "blindPool"
  | "peekBoard"
  | "sacrificeForPeek"
  | "recruit"
  | "solomon"
  | "tablePicks"
  | "optInHole3WithPenalty"
  | "draftFromFlop";

const FLAG_BY_VARIANT: Record<DealChoiceVariant, (deal: DingGameModeDefinition["deal"]) => boolean> = {
  peekKeep: () => true,
  mulligan: (deal) => deal.dealChoice?.mulligan === true,
  tradeUp: (deal) => deal.dealChoice?.tradeUp === true,
  inheritance: (deal) => deal.dealChoice?.inheritance === true,
  exposeChoice: (deal) => deal.publicCardSelection === "playerChoice",
  auction: (deal) => deal.dealChoice?.auction === true,
  blindPool: (deal) => deal.dealChoice?.blindPool === true,
  peekBoard: (deal) => typeof deal.dealChoice?.peekBoard === "number",
  sacrificeForPeek: (deal) => deal.dealChoice?.sacrificeForPeek === true,
  recruit: (deal) => deal.dealChoice?.recruit === true,
  solomon: (deal) => deal.dealChoice?.solomon === true,
  tablePicks: (deal) => deal.dealChoice?.tablePicks === true,
  optInHole3WithPenalty: (deal) => deal.dealChoice?.optInHole3WithPenalty === true,
  // Wired via `state.phaseSubstep === "flopDraftPending"`, not a dealChoice flag.
  draftFromFlop: () => false,
};

const PRIORITY: readonly DealChoiceVariant[] = [
  "exposeChoice",
  "tradeUp",
  "inheritance",
  "auction",
  "blindPool",
  "peekBoard",
  "sacrificeForPeek",
  "recruit",
  "solomon",
  "tablePicks",
  "optInHole3WithPenalty",
  "draftFromFlop",
  "mulligan",
  "peekKeep",
];

// Resolve the active variant. Earliest matching entry in PRIORITY wins.
export function resolveDealChoiceVariant(mode: DingGameModeDefinition): DealChoiceVariant {
  for (const variant of PRIORITY) {
    if (FLAG_BY_VARIANT[variant](mode.deal)) return variant;
  }
  return "peekKeep";
}
