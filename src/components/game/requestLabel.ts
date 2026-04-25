import type { AcquireRequest, GameState } from "@/lib/types";

export interface RequestItemData {
  initiatorName: string;
  recipientName: string;
  recipientRank: number | undefined;
  initiatorRank: number | undefined;
  badgeRank: number | undefined;
}

export function buildRequestData(
  req: AcquireRequest,
  gameState: GameState,
  rankMap: Map<string, number>
): RequestItemData {
  const initiatorName = gameState.players.find((p) => p.id === req.initiatorId)?.name ?? "?";
  const recipientHand = gameState.hands.find((h) => h.id === req.recipientHandId);
  const recipientName = gameState.players.find((p) => p.id === recipientHand?.playerId)?.name ?? "?";
  const recipientRank = rankMap.get(req.recipientHandId);
  const initiatorRank = rankMap.get(req.initiatorHandId);
  const badgeRank =
    req.kind === "offer" ? initiatorRank
    : req.kind === "acquire" ? recipientRank
    : initiatorRank;
  return { initiatorName, recipientName, recipientRank, initiatorRank, badgeRank };
}
