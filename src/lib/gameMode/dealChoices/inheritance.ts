/**
 * inheritance: each player keeps their selected cards plus the *discarded*
 * card from their right neighbour (so one card flows clockwise per round).
 */
import { handIndexFromId } from "../../handId";
import { filterDefined, rightNeighbor } from "../../utils";
import { registerDealChoiceVariant } from "./registry";
import { fallbackKeepIndexes, publicCardCount, refreshHandVisibility } from "./shared";
import type { Card } from "../../types";
import type { ServerGameState } from "../../../../party/state";

type StateHand = ServerGameState["hands"][number];

function applyInheritance(state: ServerGameState): void {
  const publicCount = publicCardCount(state);
  const playerIds = state.players.map((player) => player.id);
  const handByOwnerAndIndex = new Map<string, StateHand>();
  for (const hand of state.hands) {
    handByOwnerAndIndex.set(`${hand.playerId}:${handIndexFromId(hand.id)}`, hand);
  }

  const planByOwnerAndIndex = new Map<string, { keptCards: Card[]; discardedCard: Card | null }>();
  for (const hand of state.hands) {
    const choice = state.dealChoices[hand.id];
    if (!choice) continue;
    const handIndex = handIndexFromId(hand.id);
    const selectedIndexes = choice.selectedIndexes ?? fallbackKeepIndexes(hand.cards, choice.keepCards);
    const selectedSet = new Set(selectedIndexes);
    const keptCards = filterDefined(selectedIndexes.map((index) => hand.cards[index]));
    const discardedCard =
      hand.cards.find((_card, index) => !selectedSet.has(index)) ?? null;
    planByOwnerAndIndex.set(`${hand.playerId}:${handIndex}`, { keptCards, discardedCard });
  }

  for (let playerIndex = 0; playerIndex < playerIds.length; playerIndex++) {
    const targetPlayerId = playerIds[playerIndex];
    const rightPlayerId = rightNeighbor(playerIds, playerIndex);
    for (let handIndex = 0; handIndex < state.handsPerPlayer; handIndex++) {
      const targetHand = handByOwnerAndIndex.get(`${targetPlayerId}:${handIndex}`);
      const targetPlan = planByOwnerAndIndex.get(`${targetPlayerId}:${handIndex}`);
      const rightPlan = planByOwnerAndIndex.get(`${rightPlayerId}:${handIndex}`);
      if (!targetHand || !targetPlan || !rightPlan?.discardedCard) continue;
      targetHand.cards = [...targetPlan.keptCards, rightPlan.discardedCard];
    }
  }

  for (const hand of state.hands) {
    refreshHandVisibility(hand, publicCount);
  }
}

registerDealChoiceVariant("inheritance", { apply: applyInheritance });
