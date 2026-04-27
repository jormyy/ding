/**
 * Chip move utilities: classify and apply inter-player chip transfers.
 *
 * The server auto-determines the "kind" of a chip move from the current
 * ranking state. This ensures players only need to pick two hands; the
 * system figures out whether it's an acquire, offer, or swap.
 */

import type { AcquireRequest, AcquireRequestKind } from "./types";

/**
 * Classify a chip move between two hands based on their current ranking.
 *
 * - **Acquire**: initiator is unranked, recipient is ranked.
 * - **Offer**: initiator is ranked, recipient is unranked.
 * - **Swap**: both are ranked.
 * - **null**: both are unranked (invalid — nothing to move).
 */
export function classifyChipMoveKind(
  ranking: (string | null)[],
  initiatorHandId: string,
  recipientHandId: string
): AcquireRequestKind | null {
  const idxInitiator = ranking.indexOf(initiatorHandId);
  const idxRecipient = ranking.indexOf(recipientHandId);
  if (idxInitiator === -1 && idxRecipient !== -1) return "acquire";
  if (idxInitiator !== -1 && idxRecipient === -1) return "offer";
  if (idxInitiator !== -1 && idxRecipient !== -1) return "swap";
  return null;
}

/**
 * Apply a chip move to a ranking array, returning a new array.
 *
 * Does not mutate the input. Returns a copy if indices are invalid for the
 * given kind (e.g., trying to acquire when the recipient is already unranked).
 */
export function applyChipMoveToRanking(
  ranking: (string | null)[],
  kind: AcquireRequestKind,
  initiatorHandId: string,
  recipientHandId: string
): (string | null)[] {
  const next = ranking.slice();
  const ii = next.indexOf(initiatorHandId);
  const ir = next.indexOf(recipientHandId);
  if (kind === "acquire") {
    if (ir === -1) return next;
    next[ir] = initiatorHandId;
    if (ii !== -1) next[ii] = null;
  } else if (kind === "offer") {
    if (ii === -1) return next;
    next[ii] = recipientHandId;
  } else {
    if (ii === -1 || ir === -1) return next;
    next[ii] = recipientHandId;
    next[ir] = initiatorHandId;
  }
  return next;
}

/**
 * Remove any pending requests that involve the given hand IDs.
 * Called after a move/swap/unclaim to clear stale proposals.
 */
export function clearRequestsForHands(
  requests: AcquireRequest[],
  handIds: string[]
): AcquireRequest[] {
  return requests.filter(
    (r) =>
      !handIds.includes(r.initiatorHandId) && !handIds.includes(r.recipientHandId)
  );
}
