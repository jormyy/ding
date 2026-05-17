/**
 * recruit: each player keeps their selected cards and then steals one card
 * from the right neighbour's discard pile. The two-phase message handler
 * already merged the stolen card into `hand.cards` when `recruitStage`
 * reached `done`; this finalize only falls back for stalled stages.
 */
import { registerDealChoiceVariant } from "./registry";
import { fallbackKeepIndexes, publicCardCount, refreshHandVisibility } from "./shared";
import { filterDefined } from "../../utils";
import type { ServerGameState } from "../../../../party/state";

function applyRecruit(state: ServerGameState): void {
  const publicCount = publicCardCount(state);
  for (const hand of state.hands) {
    const choice = state.dealChoices[hand.id];
    if (!choice) continue;
    if (choice.recruitStage !== "done") {
      const selectedIndexes = choice.selectedIndexes ?? fallbackKeepIndexes(hand.cards, choice.keepCards);
      hand.cards = filterDefined(selectedIndexes.map((index) => hand.cards[index]));
    }
    refreshHandVisibility(hand, publicCount);
  }
}

registerDealChoiceVariant("recruit", { apply: applyRecruit });
