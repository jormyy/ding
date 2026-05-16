import type * as Party from "partykit/server";
import type { ClientMessage, Phase, Player } from "../../src/lib/types";
import type { ServerGameState } from "../state";
import type { BotController } from "../bots";

const GAME_PHASES: Phase[] = ["preflop", "flop", "turn", "river"];

export type HandlerResult =
  | { kind: "ignore" }
  | { kind: "broadcast" }
  | { kind: "broadcast-raw"; payload: string }
  | { kind: "broadcast-raw-and-state"; payload: string }
  | { kind: "broadcast-close-self" }

export interface HandlerCtx {
  lastChatAt: Map<string, number>;
  kickedPids: Set<string>;
  connections: Map<string, Party.Connection>;
  botController: BotController;
  room: Party.Room;
  removePlayerFromLobby: (targetId: string) => void;
  resetState: (newState: ServerGameState) => void;
}

export type Handler = (
  state: ServerGameState,
  player: Player,
  msg: ClientMessage,
  ctx: HandlerCtx
) => HandlerResult;

export function inGamePhase(state: ServerGameState): boolean {
  return GAME_PHASES.includes(state.phase);
}
