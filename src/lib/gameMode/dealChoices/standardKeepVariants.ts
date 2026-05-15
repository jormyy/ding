/**
 * Variants that finalize identically to standard keep (mulligan,
 * sacrificeForPeek, peekBoard, solomon, tablePicks, optInHole3WithPenalty).
 *
 * Each variant has its own message-handler flow that may pre-mutate state
 * (toggling `optedThirdHole`, recording solomon splits, etc.), but once all
 * choices are submitted the finalize step is the same shape: keep the
 * `selectedIndexes`, drop the rest, refresh visibility.
 *
 * Grouping them in one file keeps the registry boilerplate compact — each
 * still has a registered entry so codegen contract enforcement can see it.
 */
import { applyStandardKeep } from "./peekKeep";
import { registerDealChoiceVariant } from "./registry";
import type { DealChoiceVariant } from "../dealChoiceVariant";

const STANDARD_KEEP_VARIANTS: readonly DealChoiceVariant[] = [
  "mulligan",
  "sacrificeForPeek",
  "peekBoard",
  "solomon",
  "tablePicks",
  "optInHole3WithPenalty",
];

for (const id of STANDARD_KEEP_VARIANTS) {
  registerDealChoiceVariant(id, { apply: applyStandardKeep });
}

export {};
