import type * as Party from "partykit/server";
import type { ClientMessage, Player, ServerMessage } from "../src/lib/types";
import { LOBBY_GRACE_MS, MAX_PLAYERS } from "../src/lib/constants";
import { BotController, type BotMeta } from "./bots";
import {
  type ServerGameState,
  createInitialState,
  buildClientState,
  broadcastStateTo,
  assertRankingInvariant,
} from "./state";
import { handlerMap } from "./handlers/index";
import type { HandlerCtx } from "./handlers/types";
import { advancePhaseIfAllReady } from "./handlers/lifecycle";

export { buildClientState } from "./state";
export type { ServerGameState } from "./state";

const STORAGE_KEY_STATE = "state";
const STORAGE_KEY_BOT_META = "botMeta";
const STORAGE_KEY_KICKED = "kickedPids";

/**
 * Main PartyKit server for Ding.
 *
 * Responsibilities:
 * - Manage WebSocket connections and player identity (join/reconnect/disconnect)
 * - Maintain the authoritative `ServerGameState` (unmasked cards)
 * - Validate and dispatch all player actions through `handlerMap`
 * - Broadcast masked game state to each connected client
 * - Manage the `BotController` for AI players
 * - Persist state, bot personalities, and kicked-pid set across DO hibernation
 * - Drive timer expiry via DO alarms (no always-on setInterval)
 *
 * Bots bypass WebSockets entirely; they call `dispatchBotAction()` directly.
 */
export default class DingServer implements Party.Server {
  private state: ServerGameState;
  private connections: Map<string, Party.Connection> = new Map();
  private lastChatAt: Map<string, number> = new Map();
  private kickedPids: Set<string> = new Set();
  private botMeta: Record<string, BotMeta> = {};
  private botController: BotController;

  constructor(readonly room: Party.Room) {
    this.state = createInitialState();
    this.botController = this.makeBotController();
  }

  private makeBotController(): BotController {
    return new BotController({
      getState: () => this.state,
      dispatch: (playerId, msg) => this.dispatchBotAction(playerId, msg),
      mask: (playerId) => buildClientState(this.state, playerId),
      persistBotMeta: (playerId, meta) => {
        this.botMeta[playerId] = meta;
        void this.room.storage.put(STORAGE_KEY_BOT_META, this.botMeta);
      },
    });
  }

  /**
   * Lifecycle hook called by PartyKit before any messages are delivered.
   * Restores state, bot personalities, and the kicked-pid set from storage
   * so the room survives DO hibernation, deploys, and evictions.
   */
  async onStart(): Promise<void> {
    try {
      const stored = await this.room.storage.get<ServerGameState>(STORAGE_KEY_STATE);
      if (stored) this.state = stored;
      const meta = await this.room.storage.get<Record<string, BotMeta>>(STORAGE_KEY_BOT_META);
      if (meta) this.botMeta = meta;
      const kicked = await this.room.storage.get<string[]>(STORAGE_KEY_KICKED);
      if (kicked) this.kickedPids = new Set(kicked);
    } catch (err) {
      // Corrupt storage: fall back to fresh state. The schema is unversioned
      // — first incompatible change should add a version field and migrate.
      // eslint-disable-next-line no-console
      console.error("[ding] failed to load persisted state, using fresh", err);
      this.state = createInitialState();
      this.botMeta = {};
      this.kickedPids = new Set();
    }

    // Re-register bots for the post-hibernation BotController so they tick
    // again. Without this, bots become inert players sitting at the table.
    for (const p of this.state.players.filter((p) => p.isBot)) {
      this.botController.rehydrateBot(p, this.botMeta[p.id]);
    }
    this.botController.notifyStateChanged();
    await this.scheduleNextAlarm();
  }

  private getPlayerByConn(connId: string): Player | undefined {
    return this.state.players.find((p) => p.connId === connId);
  }

  /**
   * If the round timer is active and has expired, auto-ready all connected
   * players and advance the phase if everyone is ready.  This enforces the
   * timer server-side so bots (which never send WebSocket messages) also get
   * auto-readied.
   *
   * Only fires when all online players have placed their hands (same guard
   * as the `ready` handler), so the timer never advances a phase with
   * unranked hands from connected players.
   *
   * Returns true if the phase was advanced (state mutated, needs broadcast).
   */
  private applyRoundTimerIfExpired(): boolean {
    const { roundTimerSeconds, phaseStartedAt, phase } = this.state;
    if (roundTimerSeconds <= 0 || phaseStartedAt === null) return false;
    if (phase === "lobby" || phase === "reveal") return false;

    const expiresAt = phaseStartedAt + roundTimerSeconds * 1000;
    if (Date.now() < expiresAt) return false;

    // Safety: don't force-ready if online players haven't placed their hands.
    // Same guard the `ready` handler uses — prevents advancing a phase with
    // unranked hands from connected players.
    const unrankedHands = this.state.hands.filter(
      (h) => !this.state.ranking.includes(h.id)
    );
    const onlyOfflineUnranked = unrankedHands.every((h) => {
      const owner = this.state.players.find((p) => p.id === h.playerId);
      return owner ? !owner.connected : true;
    });
    if (!onlyOfflineUnranked) return false;

    for (const p of this.state.players) {
      if (p.connected) p.ready = true;
    }
    return advancePhaseIfAllReady(this.state);
  }

  /**
   * Evict lobby players whose grace window has elapsed since they
   * disconnected. Reuses `removePlayerFromLobby` for creator transfer.
   * Returns true if any player was removed.
   */
  private sweepLobbyGhosts(): boolean {
    if (this.state.phase !== "lobby") return false;
    const now = Date.now();
    const stale = this.state.players.filter(
      (p) =>
        !p.connected &&
        p.disconnectedAt !== null &&
        p.disconnectedAt !== undefined &&
        p.disconnectedAt + LOBBY_GRACE_MS <= now
    );
    for (const p of stale) this.removePlayerFromLobby(p.id);
    return stale.length > 0;
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
    if (removed.isBot) {
      this.botController.removeBot(removed.id);
      delete this.botMeta[removed.id];
      void this.room.storage.put(STORAGE_KEY_BOT_META, this.botMeta);
    }
  }

  /**
   * Synchronously broadcast the current masked state to every connection
   * and notify the bot controller. Persistence + alarm scheduling are
   * fire-and-forget so this stays sync — DO keeps the worker alive for
   * in-flight promises until they resolve.
   */
  private broadcast(): void {
    assertRankingInvariant(this.state);
    // Enforce the round timer server-side on every state change so bots
    // get auto-readied without waiting for the alarm to fire.
    this.applyRoundTimerIfExpired();
    broadcastStateTo(this.room, this.state, this.connections);
    this.botController.notifyStateChanged();
    void this.persistState();
    void this.scheduleNextAlarm();
  }

  private async persistState(): Promise<void> {
    try {
      await this.room.storage.put(STORAGE_KEY_STATE, this.state);
      await this.room.storage.put(STORAGE_KEY_KICKED, Array.from(this.kickedPids));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[ding] persistState failed", err);
    }
  }

  /**
   * Compute the next time the alarm should fire (round-timer expiry or
   * lobby-ghost grace expiry) and arm it. Deletes the alarm entirely if
   * nothing pending — this lets the DO hibernate.
   */
  private async scheduleNextAlarm(): Promise<void> {
    const candidates: number[] = [];
    const { phase, phaseStartedAt, roundTimerSeconds } = this.state;
    if (
      phaseStartedAt !== null &&
      roundTimerSeconds > 0 &&
      phase !== "lobby" &&
      phase !== "reveal"
    ) {
      candidates.push(phaseStartedAt + roundTimerSeconds * 1000);
    }
    if (phase === "lobby") {
      for (const p of this.state.players) {
        if (
          !p.connected &&
          p.disconnectedAt !== null &&
          p.disconnectedAt !== undefined
        ) {
          candidates.push(p.disconnectedAt + LOBBY_GRACE_MS);
        }
      }
    }
    try {
      if (candidates.length === 0) {
        await this.room.storage.deleteAlarm();
        return;
      }
      const next = Math.max(Date.now() + 100, Math.min(...candidates));
      await this.room.storage.setAlarm(next);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[ding] scheduleNextAlarm failed", err);
    }
  }

  /**
   * DO alarm handler — backstop for "no actions arrived since the timer
   * expired" and the lobby-ghost sweeper. Inline checks at action
   * boundaries do most of the work; this just covers the idle case.
   */
  async onAlarm(): Promise<void> {
    this.sweepLobbyGhosts();
    // broadcast() runs applyRoundTimerIfExpired and re-arms the next alarm.
    this.broadcast();
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
   * In lobby: marks player disconnected and stamps `disconnectedAt` so the
   *   ghost sweeper can evict them after the grace window.
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
        player.disconnectedAt = Date.now();
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
      this.botController = this.makeBotController();
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
   *
   * Belt-and-suspenders for room-full: opportunistically sweep lobby ghosts
   * before rejecting so a kicked tab leaving doesn't block a new join for
   * 30 seconds.
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
      existingPlayer.disconnectedAt = null;
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
      // Try to free a seat from a stale ghost before refusing.
      this.sweepLobbyGhosts();
    }
    if (this.state.players.length >= MAX_PLAYERS) {
      sender.send(JSON.stringify({ type: "error", message: `Room is full (max ${MAX_PLAYERS} players)` } as ServerMessage));
      sender.close();
      return;
    }
    const isCreator = this.state.players.length === 0;
    const hasCustomPrefix = msg.name.startsWith("-=");
    const cleanName = hasCustomPrefix ? msg.name.slice(2) : msg.name;
    const newPlayer: Player = {
      id: msg.pid, connId: sender.id, name: cleanName,
      isCreator, ready: false, connected: true,
      isCustom: hasCustomPrefix || undefined,
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
      case "broadcast-raw-and-state":
        this.room.broadcast(result.payload);
        this.broadcast();
        break;
      case "broadcast-close-self":
        this.broadcast();
        if (sender) sender.close();
        break;
    }
  }
}
