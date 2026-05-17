import type { AcquireRequest, GameState } from "@/lib/types";
import { findHandById, findPlayerById } from "@/lib/utils";

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
  const initiatorName = findPlayerById(gameState.players, req.initiatorId)?.name ?? "?";
  const recipientHand = findHandById(gameState.hands, req.recipientHandId);
  const recipientName = findPlayerById(gameState.players, recipientHand?.playerId)?.name ?? "?";
  const recipientRank = rankMap.get(req.recipientHandId);
  const initiatorRank = rankMap.get(req.initiatorHandId);
  const badgeRank =
    req.kind === "offer" ? initiatorRank
    : req.kind === "acquire" ? recipientRank
    : initiatorRank;
  return { initiatorName, recipientName, recipientRank, initiatorRank, badgeRank };
}
