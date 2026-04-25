import type * as Party from "partykit/server";
import type { ClientMessage, Player } from "../../src/lib/types";
import type { ServerGameState } from "../state";
import type { BotController } from "../bots";
import { GAME_PHASES } from "../../src/lib/constants";

export type HandlerResult =
  | { kind: "ignore" }
  | { kind: "broadcast" }
  | { kind: "broadcast-raw"; payload: string }
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
