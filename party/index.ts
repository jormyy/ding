import type * as Party from "partykit/server";
import type { ClientMessage, Player, ServerMessage } from "../src/lib/types";
import { MAX_PLAYERS } from "../src/lib/constants";
import { findPlayerById } from "../src/lib/utils";
import { BotController, type BotMeta } from "./bots";
import {
  type ServerGameState,
  createInitialState,
  buildClientState,
  broadcastStateTo,
  forgetPlayerInBroadcaster,
} from "./state";
import type { HandlerCtx } from "./handlers/types";
import { advancePhaseIfAllReady } from "./handlers/lifecycle";
import { ConnectionManager } from "./server/connectionManager";
import { AlarmScheduler } from "./server/alarmScheduler";
import { sweepLobbyGhosts } from "./server/lobbySweeper";
import { RoomStorage } from "./server/roomStorage";
import { dispatchAction } from "./pipeline/dispatch";
import { getMaxHandsPerPlayerForMode } from "../src/lib/gameMode";

/**
 * Main PartyKit server for Ding — now a thin orchestrator over the
 * server-module split:
 *
 *   - ConnectionManager owns the WebSocket map.
 *   - RoomStorage handles versioned persistence + migration.
 *   - AlarmScheduler computes & dirty-bit-gates the next DO alarm.
 *   - dispatchAction (pipeline) wraps every action: invariants, gen bump.
 *   - BotController drives AI players (unchanged).
 *
 * The handler dispatch table is reused unchanged; reducer migration
 * (one file per ClientMessage) lands incrementally inside dispatchAction.
 */
export default class DingServer implements Party.Server {
  private state: ServerGameState;
  private conns: ConnectionManager;
  private storageHelper: RoomStorage;
  private alarmScheduler: AlarmScheduler;
  private lastChatAt: Map<string, number> = new Map();
  private kickedPids: Set<string> = new Set();
  private botMeta: Record<string, BotMeta> = {};
  private botController: BotController;

  constructor(readonly room: Party.Room) {
    this.state = createInitialState();
    this.conns = new ConnectionManager();
    this.storageHelper = new RoomStorage(room);
    this.alarmScheduler = new AlarmScheduler(room);
    this.botController = this.makeBotController();
  }

  private makeBotController(): BotController {
    return new BotController({
      getState: () => this.state,
      dispatch: (playerId, msg) => this.dispatchBotAction(playerId, msg),
      mask: (playerId) => buildClientState(this.state, playerId),
      persistBotMeta: (playerId, meta) => {
        this.botMeta[playerId] = meta;
        void this.storageHelper.saveBotMeta(this.botMeta);
      },
    });
  }

  /**
   * Lifecycle hook called by PartyKit before any messages are delivered.
   * Restores state, bot personalities, and the kicked-pid set from storage
   * via RoomStorage (which migrates the persisted blob forward).
   */
  async onStart(): Promise<void> {
    try {
      const stored = await this.storageHelper.loadState();
      if (stored) this.state = stored;
      this.botMeta = await this.storageHelper.loadBotMeta();
      this.kickedPids = await this.storageHelper.loadKicked();
    } catch (err) {
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
    await this.alarmScheduler.schedule(this.state);
  }

  private getPlayerByConn(connId: string): Player | undefined {
    return this.conns.playerByConn(this.state.players, connId);
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
      const owner = findPlayerById(this.state.players, h.playerId);
      return owner ? !owner.connected : true;
    });
    if (!onlyOfflineUnranked) return false;

    for (const p of this.state.players) {
      if (p.connected) p.ready = true;
    }
    return advancePhaseIfAllReady(this.state);
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
      void this.storageHelper.saveBotMeta(this.botMeta);
    }
  }

  /**
   * Synchronously broadcast the current masked state to every connection
   * and notify the bot controller. Persistence + alarm scheduling are
   * fire-and-forget so this stays sync — DO keeps the worker alive for
   * in-flight promises until they resolve.
   */
  private broadcast(): void {
    // Enforce the round timer server-side on every state change so bots
    // get auto-readied without waiting for the alarm to fire.
    this.applyRoundTimerIfExpired();
    this.flushChaosEvents();
    broadcastStateTo(this.room, this.state, this.conns.raw());
    this.botController.notifyStateChanged();
    void this.persistState();
    void this.alarmScheduler.schedule(this.state);
  }

  private flushChaosEvents(): void {
    const events = this.state.pendingChaosEvents.splice(0);
    for (const event of events) {
      this.room.broadcast(JSON.stringify({ type: "chaos-event", ...event } satisfies ServerMessage));
    }
  }

  private async persistState(): Promise<void> {
    try {
      await this.storageHelper.saveState(this.state);
      await this.storageHelper.saveKicked(this.kickedPids);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[ding] persistState failed", err);
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

  private sweepLobbyGhosts(): boolean {
    return sweepLobbyGhosts(this.state, {
      removePlayerFromLobby: (id) => this.removePlayerFromLobby(id),
    });
  }

  private dispatchBotAction(playerId: string, msg: ClientMessage): void {
    const player = findPlayerById(this.state.players, playerId);
    if (!player) return;
    this.handlePlayerAction(player, msg, undefined, true);
  }

  /** Track a new WebSocket connection. */
  onConnect(conn: Party.Connection) {
    this.conns.add(conn);
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
    this.conns.remove(conn.id);
    const player = this.getPlayerByConn(conn.id);
    if (player) {
      forgetPlayerInBroadcaster(player.id);
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
    if (this.conns.size() === 0) {
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
    this.handlePlayerAction(player, msg, sender, false);
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
    const existingPlayer = findPlayerById(this.state.players, msg.pid);
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
    this.state.handsPerPlayer = Math.min(
      this.state.handsPerPlayer,
      getMaxHandsPerPlayerForMode(this.state.modeId, this.state.players.length)
    );
    sender.send(JSON.stringify({ type: "welcome", playerId: newPlayer.id } as ServerMessage));
    this.broadcast();
  }

  /**
   * Validate and dispatch a player action through the pipeline.
   */
  private handlePlayerAction(
    player: Player,
    msg: ClientMessage,
    sender: Party.Connection | undefined,
    isBot: boolean
  ): void {
    const ctx: HandlerCtx = {
      lastChatAt: this.lastChatAt,
      kickedPids: this.kickedPids,
      connections: this.conns.raw(),
      botController: this.botController,
      room: this.room,
      removePlayerFromLobby: (id) => this.removePlayerFromLobby(id),
      resetState: (newState) => {
        this.state = newState;
        this.alarmScheduler.invalidate();
      },
    };
    const { result } = dispatchAction({
      state: this.state,
      player,
      msg,
      handlerCtx: ctx,
      sender,
      isBot,
    });
    switch (result.kind) {
      case "ignore":
        break;
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
