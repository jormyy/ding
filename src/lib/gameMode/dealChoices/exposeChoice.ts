/**
 * exposeChoice: the player picks which of their hole cards become public.
 * Unlike standard keep, the dealt cards stay — only `publicCards` is set.
 */
import { registerDealChoiceVariant } from "./registry";
import { fallbackExposeIndexes } from "./shared";
import type { Card } from "../../types";
import type { ServerGameState } from "../../../../party/state";

function applyExposeChoice(state: ServerGameState): void {
  for (const hand of state.hands) {
    const choice = state.dealChoices[hand.id];
    if (!choice) continue;
    const selectedIndexes = choice.selectedIndexes ?? fallbackExposeIndexes(choice.keepCards);
    hand.publicCards = selectedIndexes
      .map((index) => hand.cards[index])
      .filter((card): card is Card => card !== undefined);
    hand.cardCount = hand.cards.length;
  }
}

registerDealChoiceVariant("exposeChoice", { apply: applyExposeChoice });
