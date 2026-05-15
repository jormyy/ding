/**
 * blindPool: every player contributes one of their dealt cards to a shared
 * face-down pool; cards are reshuffled and dealt back into the original
 * slots, so each player now holds a random contribution.
 */
import { shuffleDeck } from "../../deckUtils";
import { registerDealChoiceVariant } from "./registry";
import { fallbackKeepIndexes, publicCardCount, refreshHandVisibility } from "./shared";
import type { Card } from "../../types";
import type { ServerGameState } from "../../../../party/state";

type StateHand = ServerGameState["hands"][number];

function applyBlindPool(state: ServerGameState): void {
  const publicCount = publicCardCount(state);
  type Contribution = { hand: StateHand; slot: number; card: Card };
  const contributions: Contribution[] = [];
  for (const hand of state.hands) {
    const choice = state.dealChoices[hand.id];
    if (!choice) continue;
    const slot = choice.blindPoolContribution
      ?? fallbackKeepIndexes(hand.cards, 1)[0]
      ?? 0;
    const card = hand.cards[slot];
    if (!card) continue;
    contributions.push({ hand, slot, card });
  }

  if (contributions.length === 0) return;

  const shuffled = shuffleDeck(contributions.map((c) => ({ ...c.card })));
  contributions.forEach((entry, i) => {
    entry.hand.cards[entry.slot] = shuffled[i];
  });
  for (const hand of state.hands) {
    refreshHandVisibility(hand, publicCount);
  }
}

registerDealChoiceVariant("blindPool", { apply: applyBlindPool });
