/**
 * Default deal-choice variant: keep N cards out of the dealt set.
 *
 * Many variants reuse this `apply` as their finalization step (anything that
 * just narrows the dealt cards down to the chosen subset). Variants that
 * need different semantics override `apply`; everything else inherits.
 */
import { registerDealChoiceVariant } from "./registry";
import { fallbackKeepIndexes, publicCardCount, refreshHandVisibility } from "./shared";
import { filterDefined } from "../../utils";
import type { ServerGameState } from "../../../../party/state";

export function applyStandardKeep(state: ServerGameState): void {
  const publicCount = publicCardCount(state);
  for (const hand of state.hands) {
    const choice = state.dealChoices[hand.id];
    if (!choice) continue;
    const selectedIndexes = choice.selectedIndexes ?? fallbackKeepIndexes(hand.cards, choice.keepCards);
    hand.cards = filterDefined(selectedIndexes.map((index) => hand.cards[index]));
    refreshHandVisibility(hand, publicCount);
  }
}

registerDealChoiceVariant("peekKeep", { apply: applyStandardKeep });
