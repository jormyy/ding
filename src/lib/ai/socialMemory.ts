import type { GameState } from "../types";

/**
 * Slim social-signal memory.
 *
 * The strategy guide only requires: "if a teammate dings, they probably have
 * something strong; reconsider." So we just bump belief on the teammate's
 * most-recently-improved hand when we observe a new ding.
 */
export type SocialMemory = {
  /** Last processed dingLog length (to detect new entries). */
  processedDingLen: number;
  /** Last processed fuckoffLog length (kept for parity, used for cooldowns). */
  processedFuckoffLen: number;
  /** Tick counter within phase for timing context. */
  phaseTick: number;
  /** handId → slot index from previous phase end (used to detect improvements). */
  prevSlots: Map<string, number>;
  /** playerId → tick of last processed ding (anti-spam guard). */
  lastDingTickByPlayer: Map<string, number>;
};

export function newSocialMemory(): SocialMemory {
  return {
    processedDingLen: 0,
    processedFuckoffLen: 0,
    phaseTick: 0,
    prevSlots: new Map(),
    lastDingTickByPlayer: new Map(),
  };
}

/**
 * Snapshot slots and reset tick counter at phase boundary.
 */
export function socialOnPhaseBoundary(
  mem: SocialMemory,
  state: GameState,
): void {
  mem.phaseTick = 0;
  mem.prevSlots.clear();
  for (let i = 0; i < state.ranking.length; i++) {
    const hid = state.ranking[i];
    if (hid) mem.prevSlots.set(hid, i);
  }
  mem.lastDingTickByPlayer.clear();
}

export type SocialAdjustments = {
  /** handId → strength boost from interpreting teammate dings. */
  strengthBoosts: Map<string, number>;
};

/**
 * Process new dings: each one bumps belief on the teammate's most-recently-
 * improved hand by a small fixed amount. Anti-spam guard rejects rapid repeats.
 */
export function processSocialSignals(
  mem: SocialMemory,
  state: GameState,
  myPlayerId: string
): SocialAdjustments {
  mem.phaseTick++;
  const boosts = new Map<string, number>();

  const newDings = state.dingLog.slice(mem.processedDingLen);
  mem.processedDingLen = state.dingLog.length;

  for (const sig of newDings) {
    if (sig.playerId === myPlayerId) continue;
    // Anti-spam: ignore a ding from the same player within 2 ticks of the last.
    const lastTick = mem.lastDingTickByPlayer.get(sig.playerId) ?? -10;
    if (mem.phaseTick - lastTick < 2) continue;
    mem.lastDingTickByPlayer.set(sig.playerId, mem.phaseTick);

    // Pick the teammate's hand most likely meant by the ding: the one that
    // moved up most since last phase, falling back to a top-2 placement at
    // phase start.
    const theirHands = state.hands.filter((h) => h.playerId === sig.playerId);
    let candidate: string | null = null;
    let bestJump = 0;
    for (const h of theirHands) {
      const prevSlot = mem.prevSlots.get(h.id);
      const curSlot = state.ranking.indexOf(h.id);
      if (prevSlot !== undefined && prevSlot !== -1 && curSlot !== -1 && curSlot < prevSlot) {
        const jump = prevSlot - curSlot;
        if (jump > bestJump) {
          bestJump = jump;
          candidate = h.id;
        }
      }
    }
    if (!candidate && mem.phaseTick <= 3) {
      for (const h of theirHands) {
        const curSlot = state.ranking.indexOf(h.id);
        if (curSlot !== -1 && curSlot <= 1) {
          candidate = h.id;
          break;
        }
      }
    }

    if (candidate) {
      boosts.set(candidate, (boosts.get(candidate) ?? 0) + 0.10);
    }
  }

  return { strengthBoosts: boosts };
}

/**
 * Should this bot send a ding? True for premium hands or fresh improvements.
 */
export function shouldSemanticDing(
  state: GameState,
  myPlayerId: string,
  estimates: Map<string, number>,
  mem: SocialMemory,
  traits: { extraversion: number; conscientiousness: number; dingTendency?: number }
): boolean {
  const myHands = state.hands.filter((h) => h.playerId === myPlayerId);
  if (myHands.length === 0) return false;

  if (mem.phaseTick > 6) return false;
  const alreadyDinged = state.dingLog.some(
    (s) => s.playerId === myPlayerId && s.phase === state.phase
  );
  if (alreadyDinged) return false;

  const tendency = traits.dingTendency ?? 1.0;

  for (const h of myHands) {
    const est = estimates.get(h.id) ?? 0.5;
    // Premium hand on current phase.
    if (est > 0.75) {
      const threshold = 0.55 - traits.extraversion * 0.15 + traits.conscientiousness * 0.1;
      // Higher dingTendency → easier to clear the random gate.
      if (Math.random() > threshold * (2 - tendency)) return true;
    }
  }

  return false;
}

/**
 * Should this bot send a fuckoff? True for hard-reject scenarios.
 */
export function shouldSemanticFuckoff(
  state: GameState,
  myPlayerId: string,
  memo: { myRejectedKeys: Set<string> },
  mem: SocialMemory,
  traits: { agreeableness: number; neuroticism: number; fuckoffTendency?: number }
): { targetPlayerId?: string; reason: "reject" | "repeat" | "defense" } | null {
  if (mem.phaseTick <= 1) return null;
  const alreadyFuckedOff = state.fuckoffLog.some(
    (s) => s.playerId === myPlayerId && s.phase === state.phase
  );
  if (alreadyFuckedOff) return null;

  const tendency = traits.fuckoffTendency ?? 1.0;

  // 1. Repeat offender: same player proposed to us again after we rejected.
  for (const r of state.acquireRequests) {
    const rh = state.hands.find((h) => h.id === r.recipientHandId);
    if (!rh || rh.playerId !== myPlayerId) continue;
    const key = r.initiatorHandId + "|" + r.recipientHandId;
    if (memo.myRejectedKeys.has(key)) {
      if (Math.random() < (0.4 + traits.neuroticism * 0.2) * tendency) {
        return { targetPlayerId: r.initiatorId, reason: "repeat" };
      }
    }
  }

  // 2. Defense: someone targeting our top-2 slot.
  for (const r of state.acquireRequests) {
    const rh = state.hands.find((h) => h.id === r.recipientHandId);
    if (!rh || rh.playerId !== myPlayerId) continue;
    const slot = state.ranking.indexOf(rh.id);
    if (slot !== -1 && slot <= 1) {
      const p = ((1 - traits.agreeableness) * 0.20 + traits.neuroticism * 0.08) * tendency;
      if (Math.random() < p) {
        return { targetPlayerId: r.initiatorId, reason: "defense" };
      }
    }
  }

  // 3. Hard reject: just rejected something egregious.
  if (memo.myRejectedKeys.size > 0) {
    const p = ((1 - traits.agreeableness) * 0.20 + traits.neuroticism * 0.10) * tendency;
    if (Math.random() < p) {
      for (const r of state.acquireRequests) {
        const rh = state.hands.find((h) => h.id === r.recipientHandId);
        if (rh && rh.playerId === myPlayerId) {
          return { targetPlayerId: r.initiatorId, reason: "reject" };
        }
      }
    }
  }

  return null;
}
