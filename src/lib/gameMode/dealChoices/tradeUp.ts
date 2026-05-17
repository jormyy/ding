/**
 * tradeUp: each player picks one card to pass to their left neighbour, in
 * exchange for whatever the right neighbour passes them — so every hand
 * shifts one card sideways.
 */
import { handIndexFromId } from "../../handId";
import { leftNeighbor } from "../../utils";
import { registerDealChoiceVariant } from "./registry";
import { fallbackTradeUpIndexes, publicCardCount, refreshHandVisibility } from "./shared";
import type { Card } from "../../types";
import type { ServerGameState } from "../../../../party/state";

type StateHand = ServerGameState["hands"][number];

function applyTradeUp(state: ServerGameState): void {
  const publicCount = publicCardCount(state);
  const playerIds = state.players.map((player) => player.id);
  const handByOwnerAndIndex = new Map<string, StateHand>();
  for (const hand of state.hands) {
    handByOwnerAndIndex.set(`${hand.playerId}:${handIndexFromId(hand.id)}`, hand);
  }

  const selectedByOwnerAndIndex = new Map<string, { targetIndex: number; card: Card }>();
  for (const hand of state.hands) {
    const choice = state.dealChoices[hand.id];
    if (!choice) continue;
    const handIndex = handIndexFromId(hand.id);
    const selectedIndexes = choice.selectedIndexes ?? fallbackTradeUpIndexes(hand.cards, choice.keepCards);
    const targetIndex = selectedIndexes[0] ?? 0;
    const card = hand.cards[targetIndex];
    if (!card) continue;
    selectedByOwnerAndIndex.set(`${hand.playerId}:${handIndex}`, { targetIndex, card });
  }

  for (let playerIndex = 0; playerIndex < playerIds.length; playerIndex++) {
    const sourcePlayerId = playerIds[playerIndex];
    const leftPlayerId = leftNeighbor(playerIds, playerIndex);
    for (let handIndex = 0; handIndex < state.handsPerPlayer; handIndex++) {
      const source = selectedByOwnerAndIndex.get(`${sourcePlayerId}:${handIndex}`);
      const target = selectedByOwnerAndIndex.get(`${leftPlayerId}:${handIndex}`);
      const targetHand = handByOwnerAndIndex.get(`${leftPlayerId}:${handIndex}`);
      if (!source || !target || !targetHand) continue;
      targetHand.cards[target.targetIndex] = source.card;
    }
  }

  for (const hand of state.hands) {
    refreshHandVisibility(hand, publicCount);
  }
}

registerDealChoiceVariant("tradeUp", { apply: applyTradeUp });
