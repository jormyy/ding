/**
 * Four phase-effect ids that are intentionally no-ops at runtime.
 *
 * These reinforce `forceRankByMeta`, which already runs at showdown via
 * `applyMetaRankForces`. Keeping them would re-apply the same ordering twice.
 * The ids survive only so older YAML entries don't trip contract enforcement;
 * they still emit a typed `ChaosEvent` via the dispatcher tail.
 */
import { registerPhaseEffect } from "./registry";

const noop = (): void => {};

registerPhaseEffect("blessedTierBump", noop);
registerPhaseEffect("cursedTierDemote", noop);
registerPhaseEffect("chosenJokerImprint", noop);
registerPhaseEffect("markedTwinWild", noop);

export {};
