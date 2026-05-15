/**
 * Ding mode entry point — the GameMode-shaped facade the engine talks to.
 *
 * The full GameMode contract (validateAction/applyAction/etc.) lands in a
 * later step when the pipeline dispatcher is wired up. For now we expose:
 *
 *   - dingEvaluator: HandEvaluator wrapping pokersolver
 *   - dingScaler:    StrengthScaler with board-sig memoization
 *   - dingPhases:    PhaseSpec[]
 *   - reveal/trading helpers
 *
 * These are the surfaces the engine starts calling in Step 3 (inversion of
 * control) so the perf wins land before the bigger architectural moves.
 */

export { dingEvaluator } from "./evaluator";
export { dingScaler } from "./scaler";
export { dingPhases } from "./phases";
export { computeReveal, nextFlipIndex, nextFlipHandId } from "./reveal";
export {
  classifyChipMoveKind,
  applyChipMoveToRanking,
  clearRequestsForHands,
} from "./trading";

/** Stable identifier matching `BaseGameState.modeId`. */
export const DING_MODE_ID = "ding";
