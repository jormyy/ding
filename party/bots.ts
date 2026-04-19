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
      if (hesitated) {
        const cooldown = Math.round(thinkDelayMs(rec.traits, 0.5) / 2);
        rec.earliestNextActionAt = Date.now() + cooldown;
      } else {
        const cooldown = thinkDelayMs(rec.traits, 0.3);
        rec.earliestNextActionAt = Date.now() + cooldown;
        this.opts.dispatch(playerId, msg);
      }
    } else {
      const state = this.opts.getState();
      if (state.phase === "lobby") return;
      if (state.phase === "reveal" && state.score !== null) return;
      if (rec.pending) return;
      rec.pending = true;
      const delay = thinkDelayMs(rec.traits, 0.3);
      const now = Date.now();
      const wait = Math.max(delay, rec.earliestNextActionAt - now);
      rec.timer = setTimeout(() => {
        rec.pending = false;
        rec.timer = null;
        this.tick(playerId);
      }, wait);
    }
  }

  dispose(): void {
    this.disposed = true;
    for (const rec of Array.from(this.bots.values())) {
      if (rec.timer) clearTimeout(rec.timer);
    }
    this.bots.clear();
  }
}
