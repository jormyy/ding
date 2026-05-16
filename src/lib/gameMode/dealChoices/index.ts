/**
 * Side-effect imports — each variant file calls `registerDealChoiceVariant`
 * at module-load time. Importing this file once from the dispatcher populates
 * the registry before `finishDealChoicePhase` runs.
 *
 * New variant? Add a file under this directory, then one line here.
 */
import "./peekKeep";
import "./exposeChoice";
import "./inheritance";
import "./tradeUp";
import "./blindPool";
import "./auction";
import "./recruit";
import "./standardKeepVariants";
import "./draftFromFlop";

export { applyStandardKeep } from "./peekKeep";
export { dealChoiceVariantRegistry, registerDealChoiceVariant, registeredDealChoiceVariants } from "./registry";
export type { DealChoiceVariantHandler } from "./registry";
export { fallbackKeepIndexes } from "./shared";
