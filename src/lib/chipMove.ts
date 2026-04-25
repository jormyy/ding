import type { AcquireRequest, AcquireRequestKind } from "./types";

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

// Returns a new ranking with the chip move applied.
// Returns a copy of the original if indices are invalid for the given kind.
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

export function clearRequestsForHands(
  requests: AcquireRequest[],
  handIds: string[]
): AcquireRequest[] {
  return requests.filter(
    (r) =>
      !handIds.includes(r.initiatorHandId) && !handIds.includes(r.recipientHandId)
  );
}
