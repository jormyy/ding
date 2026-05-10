/**
 * Pipeline dispatcher — the single funnel through which actions become state
 * mutations. Wraps the mode's reducer table in:
 *
 *   1. `state.gen` bump on any applied change (used as the bot fingerprint),
 *   2. bot action log append + cap,
 *   3. invariant check on applied actions.
 */

import type * as Party from "partykit/server";
import type {
  BotActionLogEntry,
  Card,
  ClientMessage,
  Player,
} from "../../src/lib/types";
import type { ServerGameState } from "../state";
import type { HandlerCtx, HandlerResult } from "../handlers/types";
import { dingReducers } from "../../src/modes/ding/reducers";
import { runInvariants } from "../state/invariants";
import { visibleCommunityCardCount } from "../../src/lib/gameModes";

/** How many bot action log entries to keep on the server. */
export const BOT_ACTION_LOG_CAP = 100;

export interface DispatchInput {
  state: ServerGameState;
  player: Player;
  msg: ClientMessage;
  handlerCtx: HandlerCtx;
  /** Optional sender connection (for handlers that close it). */
  sender?: Party.Connection;
  /** True for bot-originated actions; controls bot-log appending. */
  isBot?: boolean;
}

export interface DispatchOutput {
  result: HandlerResult;
  /** True if `state.gen` advanced (the action mutated client-visible state). */
  changed: boolean;
  /** The bot log entry we appended, if any. */
  botLogEntry?: BotActionLogEntry;
}

export function dispatchAction(input: DispatchInput): DispatchOutput {
  const { state, player, msg, handlerCtx, isBot } = input;

  // Snapshot the slices the bot log diffs over only when we actually need
  // them — for human actions the snapshot work is wasted.
  const rankingBefore = isBot ? state.ranking.slice() : null;
  const acquireBefore = isBot ? state.acquireRequests.map((r) => ({ ...r })) : null;
  const phaseElapsedMs =
    state.phaseStartedAt === null ? null : Date.now() - state.phaseStartedAt;

  // Run the mode's reducer; reducers mutate `state` in place.
  const result = dingReducers[msg.type](state, player, msg, handlerCtx);

  const changed = result.kind !== "ignore";
  if (changed) state.gen++;

  let botLogEntry: BotActionLogEntry | undefined;
  if (isBot && rankingBefore && acquireBefore) {
    botLogEntry = createBotActionLogEntry(
      state,
      player,
      msg,
      changed,
      phaseElapsedMs,
      rankingBefore,
      acquireBefore
    );
    state.botActionLog.push(botLogEntry);
    if (state.botActionLog.length > BOT_ACTION_LOG_CAP) {
      state.botActionLog.splice(0, state.botActionLog.length - BOT_ACTION_LOG_CAP);
    }
  }

  if (changed) runInvariants(state);

  return { result, changed, botLogEntry };
}

function createBotActionLogEntry(
  state: ServerGameState,
  player: Player,
  msg: ClientMessage,
  applied: boolean,
  phaseElapsedMs: number | null,
  rankingBefore: (string | null)[],
  acquireRequestsBefore: BotActionLogEntry["acquireRequestsBefore"]
): BotActionLogEntry {
  const count = visibleCommunityCardCount(state.modeId, state.phase);
  const actorHoleCards: Record<string, Card[]> = {};
  for (const hand of state.hands) {
    if (hand.playerId !== player.id) continue;
    actorHoleCards[hand.id] = hand.cards.map((card) => ({ ...card }));
  }
  return {
    id: `${Date.now()}-${state.botActionLog.length}`,
    ts: Date.now(),
    phaseElapsedMs,
    phase: state.phase,
    playerId: player.id,
    playerName: player.name,
    action: msg,
    applied,
    communityCards: state.allCommunityCards.slice(0, count),
    actorHoleCards,
    rankingBefore,
    rankingAfter: state.ranking.slice(),
    acquireRequestsBefore,
    acquireRequestsAfter: state.acquireRequests.map((r) => ({ ...r })),
  };
}
