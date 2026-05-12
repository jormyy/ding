/**
 * Ding reducer registry — per-ClientMessage reducers exposed under
 * `src/modes/ding/reducers/`. Composing the dispatch table here keeps the
 * mode folder the canonical source for "what actions does Ding handle?"
 *
 * The party-side dispatcher (`party/pipeline/dispatch.ts`) sources this
 * table via `dingReducers` so future per-action validateAction/applyAction
 * tightening lands without touching the dispatcher.
 */

import type { ClientMessage } from "../../../lib/types";
import type { Reducer } from "./types";

import { reduceMove } from "./move";
import { reduceSwap } from "./swap";
import { reduceUnclaim } from "./unclaim";
import { reduceTransferOwnChip } from "./transferOwnChip";
import { reduceProposeChipMove } from "./proposeChipMove";
import { reduceAcceptChipMove } from "./acceptChipMove";
import { reduceRejectChipMove } from "./rejectChipMove";
import { reduceCancelChipMove } from "./cancelChipMove";
import { reduceReady } from "./ready";
import { reduceFlip } from "./flip";
import { reducePlayAgain } from "./playAgain";
import { reduceEndGame } from "./endGame";
import { reduceConfigure } from "./configure";
import { reduceAddBot } from "./addBot";
import { reduceStart } from "./start";
import { reduceChooseDealCards } from "./chooseDealCards";
import { reduceMulliganHand } from "./mulliganHand";
import { reduceKick } from "./kick";
import { reduceLeave } from "./leave";
import { reduceDing } from "./ding";
import { reduceFuckoff } from "./fuckoff";
import { reduceChat } from "./chat";
import { reduceCustomOutput } from "./customOutput";

const ignore: Reducer = () => ({ kind: "ignore" });

export const dingReducers: Record<ClientMessage["type"], Reducer> = {
  join: ignore,
  configure: reduceConfigure,
  addBot: reduceAddBot,
  start: reduceStart,
  chooseDealCards: reduceChooseDealCards,
  mulliganHand: reduceMulliganHand,
  kick: reduceKick,
  leave: reduceLeave,
  move: reduceMove,
  swap: reduceSwap,
  unclaim: reduceUnclaim,
  transferOwnChip: reduceTransferOwnChip,
  proposeChipMove: reduceProposeChipMove,
  acceptChipMove: reduceAcceptChipMove,
  rejectChipMove: reduceRejectChipMove,
  cancelChipMove: reduceCancelChipMove,
  ready: reduceReady,
  flip: reduceFlip,
  playAgain: reducePlayAgain,
  endGame: reduceEndGame,
  ding: reduceDing,
  fuckoff: reduceFuckoff,
  chat: reduceChat,
  customOutput: reduceCustomOutput,
};
