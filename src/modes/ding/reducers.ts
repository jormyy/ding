/**
 * Ding reducer registry — the dispatch table mapping each `ClientMessage`
 * type to the handler that applies it. Sourcing this from the mode folder
 * keeps Ding the canonical owner of "what actions does this game handle?";
 * the party-side dispatcher (`party/pipeline/dispatch.ts`) only routes.
 */

import type { ClientMessage } from "../../lib/types";
import type { Handler } from "../../../party/handlers/types";

import {
  move,
  swap,
  unclaim,
  transferOwnChip,
} from "../../../party/handlers/ranking";
import {
  proposeChipMove,
  acceptChipMove,
  rejectChipMove,
  cancelChipMove,
} from "../../../party/handlers/trading";
import {
  ready,
  flip,
  playAgain,
  endGame,
} from "../../../party/handlers/lifecycle";
import {
  configure,
  addBot,
  start,
  kick,
  leave,
} from "../../../party/handlers/lobby";
import {
  chooseDealCards,
  mulliganHand,
  sacrificeHole,
  optInThirdHole,
  contributeToBlindPool,
  auctionClaim,
  recruitFromNeighbor,
  solomonSplit,
  solomonChoose,
  tablePicksVote,
  draftFlopCard,
} from "../../../party/handlers/dealChoice";
import {
  ding,
  fuckoff,
  chat,
  customOutput,
} from "../../../party/handlers/social";

const ignore: Handler = () => ({ kind: "ignore" });

export const dingReducers: Record<ClientMessage["type"], Handler> = {
  join: ignore,
  configure,
  addBot,
  start,
  chooseDealCards,
  mulliganHand,
  sacrificeHole,
  optInThirdHole,
  contributeToBlindPool,
  auctionClaim,
  recruitFromNeighbor,
  solomonSplit,
  solomonChoose,
  tablePicksVote,
  draftFlopCard,
  kick,
  leave,
  move,
  swap,
  unclaim,
  transferOwnChip,
  proposeChipMove,
  acceptChipMove,
  rejectChipMove,
  cancelChipMove,
  ready,
  flip,
  playAgain,
  endGame,
  ding,
  fuckoff,
  chat,
  customOutput,
};
