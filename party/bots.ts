import type { ClientMessage, GameState, Player } from "../src/lib/types";
import { decideAction, newBotMemo, type BotMemo } from "../src/lib/ai/strategy";
import { pickBotName, randomPersonality, type Personality } from "../src/lib/ai/personality";

type BotRecord = {
  player: Player;
  personality: Personality;
  memo: BotMemo;
  timer: ReturnType<typeof setTimeout> | null;
  pending: boolean; // a tick is currently scheduled
};

export type BotControllerOptions = {
  getState: () => GameState;
  dispatch: (playerId: string, msg: ClientMessage) => void;
  mask: (playerId: string) => GameState;
  nSims?: number;
};

export class BotController {
  private bots: Map<string, BotRecord> = new Map(); // playerId -> record
  private disposed = false;

  constructor(private opts: BotControllerOptions) {}

  listPlayerIds(): string[] {
    return Array.from(this.bots.keys());
  }

  isBot(playerId: string): boolean {
    return this.bots.has(playerId);
  }

  addBot(idFactory?: () => string): Player {
    const takenNames = new Set(
      this.opts.getState().players.map((p) => p.name)
    );
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
    this.bots.set(pid, {
      player,
      personality: randomPersonality(),
      memo: newBotMemo(),
      timer: null,
      pending: false,
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
    // Clean up bots the server removed
    for (const pid of Array.from(this.bots.keys())) {
      if (!livePids.has(pid)) this.removeBot(pid);
    }
    // Schedule each bot to think
    for (const [pid, rec] of Array.from(this.bots.entries())) {
      if (rec.pending) continue;
      rec.pending = true;
      const [lo, hi] = rec.personality.thinkMs;
      const delay = lo + Math.random() * (hi - lo);
      rec.timer = setTimeout(() => {
        rec.pending = false;
        rec.timer = null;
        this.tick(pid);
      }, delay);
    }
  }

  private tick(playerId: string): void {
    if (this.disposed) return;
    const rec = this.bots.get(playerId);
    if (!rec) return;
    const masked = this.opts.mask(playerId);
    const msg = decideAction(masked, playerId, rec.personality, rec.memo, {
      nSims: this.opts.nSims,
    });
    if (msg) {
      this.opts.dispatch(playerId, msg);
      // dispatch triggers notifyStateChanged → next tick scheduled there
    } else {
      // Reschedule a follow-up tick so we keep nudging forward.
      // Only in game phases where action may still be needed.
      const state = this.opts.getState();
      if (state.phase === "lobby") return;
      if (state.phase === "reveal" && state.score !== null) return;
      if (rec.pending) return;
      rec.pending = true;
      const [lo, hi] = rec.personality.thinkMs;
      const delay = 2 * (lo + Math.random() * (hi - lo));
      rec.timer = setTimeout(() => {
        rec.pending = false;
        rec.timer = null;
        this.tick(playerId);
      }, delay);
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
