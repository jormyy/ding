/**
 * Phase-effect dispatcher.
 *
 * Three dispatch paths:
 *   1. Qualifier ids → arm `state.pendingQualifier`, let showdown evaluate.
 *   2. Hierarchy ids → arm `state.handHierarchyId`, let showdown reorder.
 *   3. Everything else → look up `phaseEffectRegistry[effect]` and invoke it.
 *
 * Mechanic handlers live under `party/effects/<id>.ts` and self-register at
 * module-load time via `party/effects/index.ts` (side-effect imports).
 *
 * Adding a new mechanic: create `party/effects/<id>.ts`, register it, and add
 * one import line to `party/effects/index.ts`. The `PhaseEffectId` union in
 * `types.ts` is the contract; codegen audits that every YAML id has a handler.
 */
import {
  getGameModeDefinition,
  type HierarchyId,
  type PhaseEffectId,
  type QualifierId,
} from "../../src/lib/gameMode";
import type { ChaosEvent, Phase } from "../../src/lib/types";
import type { ServerGameState } from "../state";
import { phaseEffectRegistry } from "../effects/registry";
import "../effects";

/** IDs that simply arm a qualifier on state for evaluation at showdown. */
const QUALIFIER_EFFECTS: readonly QualifierId[] = [
  "requireTopHandIsFlush",
  "requireAllHandsPaired",
  "requireTopHandNoFaceCards",
  "requireAllHandsHaveFace",
  "requireTopHandRainbow",
  "requireAdjacentTie",
  "requireTightSpread",
  "requireWideSpread",
  "requireRedRiver",
  "requirePocketSourceTop",
  "requirePairToQualify",
  "excludePairTier",
];

/** IDs that install a hierarchy reorderer for showdown. */
const HIERARCHY_EFFECTS: readonly HierarchyId[] = [
  "hierarchyByMeta",
  "cyclicHandHierarchy",
  "pactMergeFirstLast",
  "colorTeamAssign",
  "adjacentRankBonus",
  "matchRankInherit",
  "forceAdjacentTie",
  "crowdedRankPenalty",
  "enforceOneCardPerBoardRow",
  "bridgeCardChoice",
  "uniqueHandClassRequired",
];

function isQualifierEffect(effect: PhaseEffectId): effect is QualifierId {
  return (QUALIFIER_EFFECTS as readonly string[]).includes(effect);
}

function isHierarchyEffect(effect: PhaseEffectId): effect is HierarchyId {
  return (HIERARCHY_EFFECTS as readonly string[]).includes(effect);
}

export function applyModePhaseEffects(state: ServerGameState, phase: Phase): ChaosEvent[] {
  const mode = getGameModeDefinition(state.modeId);
  const effects = mode.phaseEffects?.[phase] ?? [];
  const events: ChaosEvent[] = [];
  for (const effect of effects) {
    if (isQualifierEffect(effect)) {
      state.pendingQualifier = effect;
      state.mutationVersion++;
      events.push(buildChaosEvent(effect, state, phase, mode.id));
      continue;
    }
    if (isHierarchyEffect(effect)) {
      state.handHierarchyId = effect;
      state.mutationVersion++;
      events.push(buildChaosEvent(effect, state, phase, mode.id));
      continue;
    }

    const handler = phaseEffectRegistry[effect];
    if (handler) handler(state, phase);
    // Missing-handler ids are treated as a no-op + chaos event for legacy
    // compatibility; codegen's contract audit prevents this in practice by
    // failing the build if a YAML references an unregistered id.

    state.mutationVersion++;
    events.push(buildChaosEvent(effect, state, phase, mode.id));
  }
  return events;
}

/** Exposed for the contract audit so codegen knows which ids the dispatcher
 *  handles via the generic qualifier/hierarchy paths (no registry entry). */
export const DISPATCHED_QUALIFIER_EFFECTS: readonly QualifierId[] = QUALIFIER_EFFECTS;
export const DISPATCHED_HIERARCHY_EFFECTS: readonly HierarchyId[] = HIERARCHY_EFFECTS;

function buildChaosEvent(
  effect: PhaseEffectId,
  state: ServerGameState,
  phase: Phase,
  modeId: string,
): ChaosEvent {
  return {
    event: effect,
    affected: affectedForEffect(effect, state),
    phase,
    modeId,
  };
}

function affectedForEffect(effect: PhaseEffectId, state: ServerGameState): string[] {
  switch (effect) {
    case "randomReplaceVisibleCommunity":
    case "reverseCommunity":
    case "mirrorCommunity":
    case "shuffleCommunity":
    case "removeAdjacentToRiver":
    case "stormSurge":
    case "scrambleCommunitySuits":
    case "removeLastCommunity":
    case "festivalBoostFirstCommunity":
    case "revertBoardToFlop":
    case "firstCommunityAbsorbsSecondSuit":
    case "removeHighestRankInPlay":
    case "cipherRanksWithRiver":
      return ["community"];
    case "schismDeckHighOnly":
      return ["deck"];
    case "splitHandsAtReveal":
      return state.hands.map((hand) => hand.id);
    default:
      return ["community", ...state.hands.map((hand) => hand.id)];
  }
}
