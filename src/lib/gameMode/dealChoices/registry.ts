/**
 * DealChoice variant plugin registry.
 *
 * Each `DealChoiceVariant` registers a finalize handler (`apply`) that runs
 * once every participant's choice is locked. The dispatcher in
 * `party/handlers/dealChoice.ts` (`finishDealChoicePhase`) reads
 * `resolveDealChoiceVariant(mode)` and invokes the registered handler;
 * variants without an entry fall back to the standard keep behaviour.
 *
 * The handler operates against the engine state shape (`ServerGameState`),
 * but the variant code itself lives under `src/lib/gameMode/` rather than
 * `party/` — so the directional dependency flows engine → registry, not the
 * other way around. New variants ship as a file under this directory plus
 * one line in `index.ts`.
 *
 * The message-side validators (chooseDealCards, mulliganHand, etc.) stay in
 * the protocol layer because they're keyed by message type, which is the
 * orthogonal axis to "what mode is this variant in".
 */
import type { ServerGameState } from "../../../../party/state";
import type { DealChoiceVariant } from "../dealChoiceVariant";

export interface DealChoiceVariantHandler {
  /** Run on `allDealChoicesReady`. Mutate state to finalize the variant. */
  apply(state: ServerGameState): void;
}

export const dealChoiceVariantRegistry: Partial<Record<DealChoiceVariant, DealChoiceVariantHandler>> = {};

export function registerDealChoiceVariant(id: DealChoiceVariant, handler: DealChoiceVariantHandler): void {
  dealChoiceVariantRegistry[id] = handler;
}

/** Set of registered ids; used by contract enforcement at codegen time. */
export function registeredDealChoiceVariants(): readonly DealChoiceVariant[] {
  return Object.keys(dealChoiceVariantRegistry) as DealChoiceVariant[];
}
