/**
 * Pipeline dispatcher — the single funnel through which actions become state
 * mutations. Wraps the mode's reducer table in:
 *
 *   1. `state.gen` bump on any applied change (used as the bot fingerprint),
 *   2. invariant check on applied actions.
 */

import type * as Party from "partykit/server";
import type { ClientMessage, Player } from "../../src/lib/types";
import type { ServerGameState } from "../state";
import type { HandlerCtx, HandlerResult } from "../handlers/types";
import { dingReducers } from "../../src/modes/ding/reducers";
import { runInvariants } from "../state/invariants";

export interface DispatchInput {
  state: ServerGameState;
  player: Player;
  msg: ClientMessage;
  handlerCtx: HandlerCtx;
  /** Optional sender connection (for handlers that close it). */
  sender?: Party.Connection;
  /** Reserved for future bot-only branching; currently unused. */
  isBot?: boolean;
}

export interface DispatchOutput {
  result: HandlerResult;
  /** True if `state.gen` advanced (the action mutated client-visible state). */
  changed: boolean;
}

export function dispatchAction(input: DispatchInput): DispatchOutput {
  const { state, player, msg, handlerCtx } = input;

  const result = dingReducers[msg.type](state, player, msg, handlerCtx);

  const changed = result.kind !== "ignore";
  if (changed) state.gen++;
  if (changed) runInvariants(state);

  return { result, changed };
}
