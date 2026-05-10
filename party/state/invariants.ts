/**
 * Composable state invariants. The pipeline runs these after every applied
 * action. Returning a violation logs it; the pipeline does not roll back
 * (yet — that lands when the slice-snapshot transaction wrapper does).
 *
 * Each invariant is a pure function over the state. New rules go in this file
 * and register themselves in the default list.
 */

import type { ServerGameState } from "../state";
import type { InvariantViolation } from "../../src/lib/gameMode/types";

export type Invariant = (s: Readonly<ServerGameState>) => InvariantViolation | null;

/**
 * No two slots in `ranking` may hold the same hand id, and the ranking
 * length must match `hands.length` once any hands exist.
 */
export const noDuplicateRanking: Invariant = (state) => {
  const claimed = state.ranking.filter((r): r is string => r !== null);
  const unique = new Set(claimed);
  if (unique.size !== claimed.length) {
    return {
      rule: "no-duplicate-ranking",
      message: `ranking has duplicate hand ids: ${claimed.join(",")}`,
    };
  }
  if (state.hands.length > 0 && state.ranking.length !== state.hands.length) {
    return {
      rule: "ranking-length-matches-hands",
      message: `ranking length ${state.ranking.length} != hands ${state.hands.length}`,
    };
  }
  return null;
};

/**
 * Every acquireRequest must reference hands that still exist, owned by
 * current players. Stale requests are a symptom of incomplete cleanup at
 * phase boundaries or after kicks/leaves.
 */
export const noOrphanAcquireRequests: Invariant = (state) => {
  const handIds = new Set(state.hands.map((h) => h.id));
  for (const req of state.acquireRequests) {
    if (!handIds.has(req.initiatorHandId) || !handIds.has(req.recipientHandId)) {
      return {
        rule: "no-orphan-acquire-request",
        message: `acquireRequest refers to missing hand: ${req.initiatorHandId} ↔ ${req.recipientHandId}`,
      };
    }
  }
  return null;
};

/**
 * Player ids must be unique. A duplicate id is a serious bug — joins should
 * route to reconnect instead of inserting a second player.
 */
export const uniquePlayerIds: Invariant = (state) => {
  const seen = new Set<string>();
  for (const p of state.players) {
    if (seen.has(p.id)) {
      return {
        rule: "unique-player-ids",
        message: `duplicate player id: ${p.id}`,
      };
    }
    seen.add(p.id);
  }
  return null;
};

/**
 * Default registry of invariants for the Ding mode. Order is significant:
 * ranking violations are loudest and should fire first.
 */
export const defaultInvariants: ReadonlyArray<Invariant> = [
  noDuplicateRanking,
  noOrphanAcquireRequests,
  uniquePlayerIds,
];

/**
 * Run every invariant; log violations. Returns the count of violations seen.
 *
 * Side-effecting (console.error). The pipeline transaction layer will
 * eventually roll back rather than just log.
 */
export function runInvariants(
  state: Readonly<ServerGameState>,
  rules: ReadonlyArray<Invariant> = defaultInvariants
): number {
  let count = 0;
  for (const rule of rules) {
    const v = rule(state);
    if (v) {
      // eslint-disable-next-line no-console
      console.error(`[ding][invariant] ${v.rule}: ${v.message}`);
      count++;
    }
  }
  return count;
}
