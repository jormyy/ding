/**
 * Per-tick caches for `decideAction`. Reused across every `scoreAction` call
 * within a single tick so handId→strength lookups aren't recomputed N times.
 *
 * The pair-comparison cache the audit recommended exists conceptually here
 * but only the strength side is wired today; expand the shape when a future
 * scorer wants to share pair compares across calls.
 */

export interface PerTickCaches {
  /** Cached `strengthOf(handId)` results for this tick. */
  strengthByHand: Map<string, number>;
}

export function newPerTickCaches(): PerTickCaches {
  return {
    strengthByHand: new Map(),
  };
}
