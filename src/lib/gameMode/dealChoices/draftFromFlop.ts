/**
 * draftFromFlop is wired via `state.phaseSubstep === "flopDraftPending"`
 * at the flop phase, not through `finishDealChoicePhase`. The variant is
 * registered as a no-op finalize so codegen contract enforcement still
 * sees it — the message handler (`draftFlopCard`) owns the real flow.
 */
import { registerDealChoiceVariant } from "./registry";

registerDealChoiceVariant("draftFromFlop", { apply: () => {} });

export {};
