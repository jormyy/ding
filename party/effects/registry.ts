/**
 * Phase-effect plugin registry.
 *
 * Each phase-effect mechanic is registered into `phaseEffectRegistry` keyed by
 * its `PhaseEffectId`. The dispatcher in `party/handlers/phaseEffects.ts` looks
 * up the handler at runtime and invokes it; this lets new mechanics ship as a
 * new file under `party/effects/` plus a side-effect import in `index.ts`
 * without touching a megaswitch.
 *
 * Handlers are pure mutators — the dispatcher takes care of bumping
 * `state.mutationVersion` and emitting the typed `ChaosEvent` so handlers
 * don't have to remember either.
 */
import type { Phase } from "../../src/lib/types";
import type { PhaseEffectId } from "../../src/lib/gameMode";
import type { ServerGameState } from "../state";

export type PhaseEffectHandler = (state: ServerGameState, phase: Phase) => void;

export const phaseEffectRegistry: Partial<Record<PhaseEffectId, PhaseEffectHandler>> = {};

export function registerPhaseEffect(id: PhaseEffectId, fn: PhaseEffectHandler): void {
  phaseEffectRegistry[id] = fn;
}

/** Set of registered ids; used by contract enforcement at codegen time. */
export function registeredPhaseEffectIds(): readonly PhaseEffectId[] {
  return Object.keys(phaseEffectRegistry) as PhaseEffectId[];
}
