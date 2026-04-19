import type { ClientMessage, GameState, Player } from "../src/lib/types";
import { decideAction, newBotMemo, type BotMemo } from "../src/lib/ai/strategy";
import {
  pickBotName,
  randomTraits,
  thinkDelayMs,
  firstActionDelayMs,
  type Traits,
} from "../src/lib/ai/personality";
import type { Archetype } from "../src/lib/ai/archetypes";

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

export type BotControllerOptions = {
  getState: () => GameState;
  dispatch: (playerId: string, msg: ClientMessage) => void;
  mask: (playerId: string) => GameState;
  nSims?: number;
};

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

  addBot(idFactory?: () => string): Player {
    const takenNames = new Set(this.opts.getState().players.map((p) => p.name));
    const name = pickBotName(takenNames);
    const pid = (idFactory && idFactory()) || `bot-${crypto.randomUUID()}`;
    const connId = `bot:${pid}`;
    const player: Player = {
      id: pid,
      connId,
      name,
      isCreator: false,
      ready: false,
      connected: true,
    };
    const { traits, archetype } = randomTraits();
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
    return player;
  }

  removeBot(playerId: string): void {
    const rec = this.bots.get(playerId);
    if (!rec) return;
    if (rec.timer) clearTimeout(rec.timer);
    this.bots.delete(playerId);
  }

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

  private tick(playerId: string): void {
    if (this.disposed) return;
    const rec = this.bots.get(playerId);
    if (!rec) return;
    const masked = this.opts.mask(playerId);
    const msg = decideAction(masked, playerId, rec.traits, rec.memo, {
      nSims: this.opts.nSims,
    });
    if (msg) {
      // Hesitation: occasionally cancel the emit and reschedule — looks like
      // a bot reconsidering. Only for non-critical actions.
      const hesitated =
        msg.type !== "ready" &&
        msg.type !== "flip" &&
        Math.random() < rec.traits.hesitationProb;
      const botBotTrade = this.isBotBotTradeMsg(playerId, msg);
      if (hesitated) {
        const cooldown = Math.round(thinkDelayMs(rec.traits, 0.5) / 2);
        rec.earliestNextActionAt = Date.now() + cooldown;
        // Reschedule self — don't rely on notifyStateChanged; if no other bot
        // acts we'd freeze indefinitely.
        if (!rec.pending) {
          rec.pending = true;
          rec.timer = setTimeout(() => {
            rec.pending = false;
            rec.timer = null;
            this.tick(playerId);
          }, cooldown);
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

  dispose(): void {
    this.disposed = true;
    for (const rec of Array.from(this.bots.values())) {
      if (rec.timer) clearTimeout(rec.timer);
    }
    this.bots.clear();
  }
}
