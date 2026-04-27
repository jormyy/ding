import type * as Party from "partykit/server";
import type { ClientMessage, Player, ServerMessage } from "../src/lib/types";
import { MAX_PLAYERS } from "../src/lib/constants";
import { BotController } from "./bots";
import {
  type ServerGameState,
  createInitialState,
  buildClientState,
  broadcastStateTo,
  assertRankingInvariant,
} from "./state";
import { handlerMap } from "./handlers/index";
import type { HandlerCtx } from "./handlers/types";

export { buildClientState } from "./state";
export type { ServerGameState } from "./state";

/**
 * Main PartyKit server for Ding.
 *
 * Responsibilities:
 * - Manage WebSocket connections and player identity (join/reconnect/disconnect)
 * - Maintain the authoritative `ServerGameState` (unmasked cards)
 * - Validate and dispatch all player actions through `handlerMap`
 * - Broadcast masked game state to each connected client
 * - Manage the `BotController` for AI players
 *
 * Bots bypass WebSockets entirely; they call `dispatchBotAction()` directly.
 */
export default class DingServer implements Party.Server {
  private state: ServerGameState;
  private connections: Map<string, Party.Connection> = new Map();
  private lastChatAt: Map<string, number> = new Map();
  private kickedPids: Set<string> = new Set();
  private botController: BotController;

  constructor(readonly room: Party.Room) {
    this.state = createInitialState();
    this.botController = new BotController({
      getState: () => this.state,
      dispatch: (playerId, msg) => this.dispatchBotAction(playerId, msg),
      mask: (playerId) => buildClientState(this.state, playerId),
    });
  }

  private getPlayerByConn(connId: string): Player | undefined {
    return this.state.players.find((p) => p.connId === connId);
  }

  private removePlayerFromLobby(targetId: string): void {
    if (this.state.phase !== "lobby") return;
    const idx = this.state.players.findIndex((p) => p.id === targetId);
    if (idx === -1) return;
    const [removed] = this.state.players.splice(idx, 1);
    if (removed.isCreator && this.state.players.length > 0) {
      const nextHuman = this.state.players.find((p) => p.connected && !p.isBot);
      const next = nextHuman ?? this.state.players[0];
      next.isCreator = true;
    }
    this.lastChatAt.delete(targetId);
    if (removed.isBot) this.botController.removeBot(removed.id);
  }

  private broadcast(): void {
    assertRankingInvariant(this.state);
    broadcastStateTo(this.room, this.state, this.connections);
    this.botController.notifyStateChanged();
  }

  private dispatchBotAction(playerId: string, msg: ClientMessage): void {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return;
    this.handlePlayerAction(player, msg);
  }

  /** Track a new WebSocket connection. */
  onConnect(conn: Party.Connection) {
    this.connections.set(conn.id, conn);
  }

  /**
   * Handle WebSocket disconnect.
   *
   * In lobby: marks player disconnected; may transfer creator role.
   * In-game: marks disconnected and un-readies them.
   *
   * If all humans disconnect, the bot controller is reset so it will be
   * recreated fresh on the next human reconnect.
   */
  onClose(conn: Party.Connection) {
    this.connections.delete(conn.id);
    const player = this.getPlayerByConn(conn.id);
    if (player) {
      if (this.state.phase === "lobby") {
        player.connected = false;
        if (player.isCreator) {
          const nextConnected = this.state.players.find((p) => p.connected && !p.isBot);
          if (nextConnected) {
            player.isCreator = false;
            nextConnected.isCreator = true;
          }
        }
      } else {
        player.connected = false;
        player.ready = false;
      }
      this.broadcast();
    }
    if (this.connections.size === 0) {
      this.botController.dispose();
      this.botController = new BotController({
        getState: () => this.state,
        dispatch: (playerId, msg) => this.dispatchBotAction(playerId, msg),
        mask: (playerId) => buildClientState(this.state, playerId),
      });
    }
  }

  /** Route incoming WebSocket messages to the appropriate handler. */
  onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message) as ClientMessage;
    } catch {
      return;
    }
    if (msg.type === "join") {
      this.handleJoin(msg, sender);
      return;
    }
    const player = this.getPlayerByConn(sender.id);
    if (!player) return;
    this.handlePlayerAction(player, msg, sender);
  }

/**
   * Handle a player joining the room.
   *
   * Supports three paths:
   * 1. **Reconnect**: matching `pid` exists → update connId, mark connected.
   * 2. **New join in lobby**: fresh player, room not full.
   * 3. **Rejected**: game in progress, room full, or player was kicked.
   */
  private handleJoin(
    msg: Extract<ClientMessage, { type: "join" }>,
    sender: Party.Connection
  ): void {
    if (this.kickedPids.has(msg.pid)) {
      sender.send(JSON.stringify({ type: "error", message: "Removed by host" } as ServerMessage));
      sender.close();
      return;
    }
    const existingPlayer = this.state.players.find((p) => p.id === msg.pid);
    if (existingPlayer) {
      existingPlayer.connId = sender.id;
      existingPlayer.connected = true;
      sender.send(JSON.stringify({ type: "welcome", playerId: existingPlayer.id } as ServerMessage));
      this.broadcast();
      return;
    }
    const existingByConn = this.getPlayerByConn(sender.id);
    if (existingByConn) {
      sender.send(JSON.stringify({ type: "welcome", playerId: existingByConn.id } as ServerMessage));
      this.broadcast();
      return;
    }
    if (this.state.phase !== "lobby") {
      sender.send(JSON.stringify({ type: "error", message: "Game already in progress" } as ServerMessage));
      sender.close();
      return;
    }
    if (this.state.players.length >= MAX_PLAYERS) {
      sender.send(JSON.stringify({ type: "error", message: `Room is full (max ${MAX_PLAYERS} players)` } as ServerMessage));
      sender.close();
      return;
    }
    const isCreator = this.state.players.length === 0;
    const newPlayer: Player = {
      id: msg.pid, connId: sender.id, name: msg.name,
      isCreator, ready: false, connected: true,
    };
    this.state.players.push(newPlayer);
    sender.send(JSON.stringify({ type: "welcome", playerId: newPlayer.id } as ServerMessage));
    this.broadcast();
  }

  /**
   * Validate and dispatch a player action through the handler map.
   *
   * Constructs a `HandlerCtx` with server-level resources (connections, kicked
   * set, bot controller, room) so handlers can perform side effects like
   * closing connections or resetting state.
   */
  private handlePlayerAction(
    player: Player,
    msg: ClientMessage,
    sender?: Party.Connection
  ): void {
    const ctx: HandlerCtx = {
      lastChatAt: this.lastChatAt,
      kickedPids: this.kickedPids,
      connections: this.connections,
      botController: this.botController,
      room: this.room,
      removePlayerFromLobby: (id) => this.removePlayerFromLobby(id),
      resetState: (newState) => { this.state = newState; },
    };
    const result = handlerMap[msg.type](this.state, player, msg, ctx);
    switch (result.kind) {
      case "broadcast":
        this.broadcast();
        break;
      case "broadcast-raw":
        this.room.broadcast(result.payload);
        break;
      case "broadcast-close-self":
        this.broadcast();
        if (sender) sender.close();
        break;
    }
  }
}
