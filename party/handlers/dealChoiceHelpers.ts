import type { Player } from "../../src/lib/types";
import { findHandById } from "../../src/lib/utils";
import type { ServerGameState } from "../state";

export function isValidCardIndex(
  index: number | null | undefined,
  max: number,
): index is number {
  return Number.isInteger(index) && (index as number) >= 0 && (index as number) < max;
}

export function lookupOwnedHandChoice(
  state: ServerGameState,
  player: Player,
  handId: string,
): {
  hand: ServerGameState["hands"][number];
  choice: NonNullable<ServerGameState["dealChoices"][string]>;
} | null {
  const hand = findHandById(state.hands, handId);
  if (!hand || hand.playerId !== player.id) return null;
  const choice = state.dealChoices[handId];
  if (!choice || choice.submitted) return null;
  return { hand, choice };
}
