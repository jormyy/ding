import type { ClientMessage, GameState, Player } from "../src/lib/types";
import { decideAction, newBotMemo, type BotMemo } from "../src/lib/ai/strategy";
import {
  pickBotName,
  randomTraits,
  thinkDelayMs,
  firstActionDelayMs,
  type Traits,
} from "../src/lib/ai/personality";
import { pickUnusedArchetype, type Archetype } from "../src/lib/ai/archetypes";

/** Persisted-across-hibernation identity for a single bot. */
export type BotMeta = {
  archetype: Archetype;
  traits: Traits;
};

/** Internal state for a single bot player. */
type BotRecord = {
  player: Player;
  traits: Traits;
  archetype: Archetype;
  memo: BotMemo;
  timer: ReturnType<typeof setTimeout> | null;
  pending: boolean;
  earliestNextActionAt: number;
  firstActionPhase: string;
};

/** Configuration passed to the BotController constructor. */
export type BotControllerOptions = {
  /** Get the current authoritative server state. */
  getState: () => GameState;
  /** Dispatch a bot action through the same handler path as human actions. */
  dispatch: (playerId: string, msg: ClientMessage) => void;
  /** Build a masked client state for a specific bot (same view humans see). */
  mask: (playerId: string) => GameState;
  /**
   * Persist a bot's archetype + traits so it survives DO hibernation with
   * the same personality. Called from `addBot`; safe to fire-and-forget.
   */
  persistBotMeta?: (playerId: string, meta: BotMeta) => void;
};

/**
 * Manages the lifecycle and scheduling of AI bot players.
 *
 * Two modes:
 * 1. **Timer mode** (`notifyStateChanged`): schedules per-bot think ticks with
 *    personality-scaled delays. Supports hesitation, bot-to-bot trade acceleration,
 *    and action re-validation after delays.
 * 2. **Fast mode** (`fastTickAll`): direct synchronous ticks for simulation
 *    scripts — no timers, no delays.
 *
 * Bots receive the same masked `GameState` as humans and dispatch the same
 * `ClientMessage` types through the same handlers.
 */
export class BotController {
  private bots: Map<string, BotRecord> = new Map();
  private disposed = false;

  constructor(private opts: BotControllerOptions) {}

  listPlayerIds(): string[] {
    return Array.from(this.bots.keys());
  }

  isBot(playerId: string): boolean {
    return this.bots.has(playerId);
  }

  /**
   * Create and register a new bot player.
   * @param idFactory  Optional function to generate a deterministic bot ID.
   * @returns The newly created Player record (already pushed to server state).
   */
  addBot(idFactory?: () => string): Player {
    const takenNames = new Set(this.opts.getState().players.map((p) => p.name));
    // Prefer an unused archetype so a room of N bots gets N distinct
    // archetypes (up to 10) — the user wants each bot to feel different.
    const usedArchetypes = new Set<Archetype>();
    for (const rec of this.bots.values()) usedArchetypes.add(rec.archetype);
    const archetype = pickUnusedArchetype(usedArchetypes);
    const name = pickBotName(takenNames, archetype);
    const pid = (idFactory && idFactory()) || `bot-${crypto.randomUUID()}`;
    const connId = `bot:${pid}`;
    const player: Player = {
      id: pid,
      connId,
      name,
      isCreator: false,
      ready: false,
      connected: true,
      isBot: true,
    };
    const { traits } = randomTraits(archetype);
    this.bots.set(pid, {
      player,
      traits,
      archetype,
      memo: newBotMemo(),
      timer: null,
      pending: false,
      earliestNextActionAt: 0,
      firstActionPhase: "",
    });
    this.opts.persistBotMeta?.(pid, { archetype, traits });
    return player;
  }

  /**
   * Re-register a bot for an existing Player (post-hibernation rehydration).
   * Does NOT push to state — caller is replaying state already loaded from
   * storage. If `meta` is missing (e.g. botMeta key got dropped), generates
   * a fresh personality so the bot still acts.
   */
  rehydrateBot(player: Player, meta?: BotMeta): void {
    if (this.bots.has(player.id)) return;
    let archetype: Archetype;
    let traits: Traits;
    if (meta) {
      archetype = meta.archetype;
      traits = meta.traits;
    } else {
      const usedArchetypes = new Set<Archetype>();
      for (const rec of this.bots.values()) usedArchetypes.add(rec.archetype);
      archetype = pickUnusedArchetype(usedArchetypes);
      traits = randomTraits(archetype).traits;
    }
    this.bots.set(player.id, {
      player,
      traits,
      archetype,
      memo: newBotMemo(),
      timer: null,
      pending: false,
      earliestNextActionAt: 0,
      firstActionPhase: "",
    });
  }

  /** Remove a bot and clear its pending timer. */
  removeBot(playerId: string): void {
    const rec = this.bots.get(playerId);
    if (!rec) return;
    if (rec.timer) clearTimeout(rec.timer);
    this.bots.delete(playerId);
  }

  /**
   * Notify all bots that the game state has changed.
   *
   * Schedules each bot's next think tick with a delay based on its personality.
   * Bots that have pending timers are skipped. Delays are scaled by:
   * - Personality traits (baseThinkMs, thinkPerDifficultyMs)
   * - First-action delay at phase start (gives humans time to orient)
   * - Bot-to-bot trade acceleration (10× faster for bot-only negotiations)
   */
  notifyStateChanged(): void {
    if (this.disposed) return;
    const state = this.opts.getState();
    const livePids = new Set(state.players.map((p) => p.id));
    for (const pid of Array.from(this.bots.keys())) {
      if (!livePids.has(pid)) this.removeBot(pid);
    }
    const gamePhases = ["preflop", "flop", "turn", "river"];
    for (const [pid, rec] of Array.from(this.bots.entries())) {
      if (rec.pending) continue;
      rec.pending = true;
      // Base pacing — difficulty modulates later once we've evaluated.
      let delay = thinkDelayMs(rec.traits, 0.3);
      if (gamePhases.includes(state.phase) && rec.firstActionPhase !== state.phase) {
        rec.firstActionPhase = state.phase;
        delay += firstActionDelayMs(rec.traits);
      }
      // Bot-to-bot trading is 10x faster — only when there's a pending chip-move
      // proposal where both sides are bots and this bot is one of them.
      if (this.hasActiveBotBotTradeFor(pid, state)) {
        delay = Math.round(delay / 10);
      }
      const now = Date.now();
      const minAt = Math.max(now + delay, rec.earliestNextActionAt);
      const wait = Math.max(0, minAt - now);
      rec.timer = setTimeout(() => {
        rec.pending = false;
        rec.timer = null;
        this.tick(pid);
      }, wait);
    }
  }

  /**
   * Fast simulation mode: synchronously tick every bot without timers.
   *
   * Used by simulation scripts to run game batches quickly. Returns the
   * number of bots that produced an action this round.
   */
  fastTickAll(): number {
    if (this.disposed) return 0;
    const state = this.opts.getState();
    const gamePhases = ["preflop", "flop", "turn", "river"];
    let acted = 0;
    for (const [pid, rec] of Array.from(this.bots.entries())) {
      if (rec.pending) {
        // In timer-based mode, pending means the bot is waiting. In fast mode,
        // we reset it so the bot can act this round. After dispatching, the
        // notifyStateChanged call may set it to true again — we reset below.
        rec.pending = false;
      }
      if (gamePhases.includes(state.phase) && rec.firstActionPhase !== state.phase) {
        rec.firstActionPhase = state.phase;
      }
      rec.pending = true;
      const masked = this.opts.mask(pid);
      const msg = decideAction(masked, pid, rec.traits, rec.memo);
      if (msg) {
        acted++;
        this.opts.dispatch(pid, msg);
      }
      // Reset pending: notifyStateChanged may have set it to true again via
      // the dispatch path, but we want the bot to tick again next round.
      rec.pending = false;
    }
    return acted;
  }

  // Emit a previously-decided message after hesitation, but re-decide if the
  // state has changed enough to invalidate it. We treat "still legal" as a
  // simple proxy: the action's referenced hands/proposals still exist.
  private emitOrRedecide(playerId: string, prior: ClientMessage): void {
    const rec = this.bots.get(playerId);
    if (!rec) return;
    const state = this.opts.getState();
    if (this.isStillValid(state, playerId, prior)) {
      this.opts.dispatch(playerId, prior);
      const cooldown = thinkDelayMs(rec.traits, 0.3);
      rec.earliestNextActionAt = Date.now() + cooldown;
      if (!rec.pending) {
        rec.pending = true;
        rec.timer = setTimeout(() => {
          rec.pending = false;
          rec.timer = null;
          this.tick(playerId);
        }, cooldown);
      }
      return;
    }
    // State shifted — fall through to a fresh decision.
    this.tick(playerId);
  }

  private isStillValid(state: GameState, pid: string, msg: ClientMessage): boolean {
    if (state.phase === "lobby") return false;
    switch (msg.type) {
      case "move": {
        const h = state.hands.find((x) => x.id === msg.handId);
        if (!h || h.playerId !== pid) return false;
        if (msg.toIndex < 0 || msg.toIndex >= state.ranking.length) return false;
        const at = state.ranking[msg.toIndex];
        return at === null || at === msg.handId;
      }
      case "swap": {
        const a = state.hands.find((x) => x.id === msg.handIdA);
        const b = state.hands.find((x) => x.id === msg.handIdB);
        return !!(a && b && a.playerId === pid && b.playerId === pid &&
          state.ranking.indexOf(msg.handIdA) !== -1 &&
          state.ranking.indexOf(msg.handIdB) !== -1);
      }
      case "proposeChipMove":
      case "acceptChipMove":
      case "rejectChipMove":
      case "cancelChipMove": {
        // Initiator-side actions need the request still pending; propose
        // needs the pairing not already proposed.
        if (msg.type === "proposeChipMove") {
          return !state.acquireRequests.some(
            (r) => r.initiatorHandId === msg.initiatorHandId && r.recipientHandId === msg.recipientHandId
          );
        }
        return state.acquireRequests.some(
          (r) => r.initiatorHandId === msg.initiatorHandId && r.recipientHandId === msg.recipientHandId
        );
      }
      case "ding":
      case "fuckoff":
      case "ready":
      case "flip":
        return true;
      default:
        return true;
    }
  }

  private tick(playerId: string): void {
    if (this.disposed) return;
    const rec = this.bots.get(playerId);
    if (!rec) return;
    const masked = this.opts.mask(playerId);
    const msg = decideAction(masked, playerId, rec.traits, rec.memo);
    if (msg) {
      // Hesitation: occasionally pause before emitting — looks like a bot
      // reconsidering. We DELAY the same action rather than discarding it.
      const canHesitate = msg.type !== "ready" && msg.type !== "flip";
      const hesitated = canHesitate && Math.random() < rec.traits.hesitationProb;
      const botBotTrade = this.isBotBotTradeMsg(playerId, msg);
      if (hesitated) {
        let pause = Math.round(thinkDelayMs(rec.traits, 0.5) / 2);
        if (botBotTrade) pause = Math.round(pause / 10);
        rec.earliestNextActionAt = Date.now() + pause;
        if (!rec.pending) {
          rec.pending = true;
          rec.timer = setTimeout(() => {
            rec.pending = false;
            rec.timer = null;
            if (this.disposed) return;
            // Re-validate: state may have shifted while we hesitated. If the
            // chosen msg is still legal we emit it; otherwise we re-decide.
            this.emitOrRedecide(playerId, msg);
          }, pause);
        }
      } else {
        let cooldown = thinkDelayMs(rec.traits, 0.3);
        if (botBotTrade) cooldown = Math.round(cooldown / 10);
        rec.earliestNextActionAt = Date.now() + cooldown;
        this.opts.dispatch(playerId, msg);
        // Self-reschedule as backup: if dispatch didn't trigger notifyStateChanged
        // (e.g. server rejected the move without broadcasting), the bot would
        // otherwise freeze indefinitely waiting for an external state change.
        if (!rec.pending) {
          rec.pending = true;
          rec.timer = setTimeout(() => {
            rec.pending = false;
            rec.timer = null;
            this.tick(playerId);
          }, cooldown);
        }
      }
    } else {
      const state = this.opts.getState();
      if (state.phase === "lobby") return;
      if (state.phase === "reveal" && state.score !== null) return;
      if (rec.pending) return;
      rec.pending = true;
      const delay = thinkDelayMs(rec.traits, 0.3);
      // Don't apply earliestNextActionAt here — no action was dispatched, so
      // the cooldown shouldn't delay the next attempt to find something to do.
      const wait = delay;
      rec.timer = setTimeout(() => {
        rec.pending = false;
        rec.timer = null;
        this.tick(playerId);
      }, wait);
    }
  }

  // True if there's a pending chip-move proposal in state where the initiator
  // is a bot AND the recipient hand is owned by a bot AND this playerId is
  // one of the two. Trades with humans return false. Placing chips from the
  // board is not a proposal, so unaffected.
  private hasActiveBotBotTradeFor(pid: string, state: GameState): boolean {
    for (const r of state.acquireRequests) {
      const rh = state.hands.find((h) => h.id === r.recipientHandId);
      if (!rh) continue;
      const recipientPid = rh.playerId;
      const initBot = this.isBot(r.initiatorId);
      const recBot = this.isBot(recipientPid);
      if (!initBot || !recBot) continue;
      if (r.initiatorId === pid || recipientPid === pid) return true;
    }
    return false;
  }

  private isBotBotTradeMsg(pid: string, msg: ClientMessage): boolean {
    if (
      msg.type !== "proposeChipMove" &&
      msg.type !== "acceptChipMove" &&
      msg.type !== "rejectChipMove" &&
      msg.type !== "cancelChipMove"
    ) return false;
    const state = this.opts.getState();
    const init = state.hands.find((h) => h.id === msg.initiatorHandId);
    const rec = state.hands.find((h) => h.id === msg.recipientHandId);
    if (!init || !rec) return false;
    const initBot = this.isBot(init.playerId);
    const recBot = this.isBot(rec.playerId);
    if (!initBot || !recBot) return false;
    return init.playerId === pid || rec.playerId === pid;
  }

  /** Shut down the controller and clear all bot timers. */
  dispose(): void {
    this.disposed = true;
    for (const rec of Array.from(this.bots.values())) {
      if (rec.timer) clearTimeout(rec.timer);
    }
    this.bots.clear();
  }
}
