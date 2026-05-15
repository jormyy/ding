/**
 * auction: a face-up pool is opened, players take turns claiming cards.
 * By the time `apply` runs the message handler has already pushed claimed
 * cards onto each hand — finalize just refreshes visibility.
 */
import { registerDealChoiceVariant } from "./registry";
import { publicCardCount, refreshHandVisibility } from "./shared";
import type { ServerGameState } from "../../../../party/state";

function applyAuction(state: ServerGameState): void {
  const publicCount = publicCardCount(state);
  for (const hand of state.hands) {
    refreshHandVisibility(hand, publicCount);
  }
}

registerDealChoiceVariant("auction", { apply: applyAuction });
