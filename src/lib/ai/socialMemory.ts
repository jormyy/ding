import type { GameState, Phase, SocialSignal } from "../types";
import type { ClassifiedHand } from "./handClassifier";

/**
 * Per-bot social signal memory and interpretation.
 *
 * Bots track dings/fuckoffs from other players, classify their social style,
 * and use recent signals to adjust trading behavior and hand-strength beliefs.
 */

export type PlayerSocialProfile = {
  playerId: string;
  /** Total dings observed from this player. */
  dingCount: number;
  /** Dings observed at phase start (first 8s of a phase). */
  dingAtPhaseStart: number;
  /** Total fuckoffs observed. */
  fuckoffCount: number;
  /** Fuckoffs observed within 3 ticks of a proposal rejection/response. */
  fuckoffAfterProposal: number;
  /** How many times this player rejected one of our proposals. */
  ourRejections: number;
  /** How many times this player proposed to us. */
  proposalsToUs: number;
  /** Heuristic style: strategic signals are trustworthy; chaotic are noise. */
  style: "unknown" | "strategic" | "chaotic" | "expressive" | "quiet";
  /** 0-1: how much we should trust their dings as strength indicators. */
  dingReliability: number;
  /** 0-1: how defensive / stubborn they are in trades. */
  defensiveness: number;
  /** playerId → handId → tick count since last fuckoff defending this hand. */
  handDefenseCooldown: Map<string, number>;
};

export type SocialMemory = {
  /** playerId → profile */
  profiles: Map<string, PlayerSocialProfile>;
  /** Last processed dingLog length (to detect new entries). */
  processedDingLen: number;
  /** Last processed fuckoffLog length. */
  processedFuckoffLen: number;
  /** Phase of last processing (reset on boundary). */
  lastPhase: string;
  /** Tick counter within phase for timing context. */
  phaseTick: number;
  /** handId → classification from previous phase (for improvement detection). */
  prevClassifications: Map<string, ClassifiedHand>;
  /** handId → estimated strength from previous phase. */
  prevEstimates: Map<string, number>;
  /** handId → slot index from previous phase end. */
  prevSlots: Map<string, number>;
};

export function newSocialMemory(): SocialMemory {
  return {
    profiles: new Map(),
    processedDingLen: 0,
    processedFuckoffLen: 0,
    lastPhase: "",
    phaseTick: 0,
    prevClassifications: new Map(),
    prevEstimates: new Map(),
    prevSlots: new Map(),
  };
}

function getOrInitProfile(mem: SocialMemory, pid: string): PlayerSocialProfile {
  let p = mem.profiles.get(pid);
  if (!p) {
    p = {
      playerId: pid,
      dingCount: 0,
      dingAtPhaseStart: 0,
      fuckoffCount: 0,
      fuckoffAfterProposal: 0,
      ourRejections: 0,
      proposalsToUs: 0,
      style: "unknown",
      dingReliability: 0.5,
      defensiveness: 0.5,
      handDefenseCooldown: new Map(),
    };
    mem.profiles.set(pid, p);
  }
  return p;
}

/**
 * Called at phase boundary: snapshot current classifications/estimates/slots
 * so next phase can detect improvements, and reset tick counter.
 */
export function socialOnPhaseBoundary(
  mem: SocialMemory,
  state: GameState,
  myPlayerId: string,
  classifiedHands: Map<string, ClassifiedHand>,
  estimates: Map<string, number>
): void {
  mem.lastPhase = state.phase;
  mem.phaseTick = 0;
  mem.prevClassifications.clear();
  mem.prevEstimates.clear();
  mem.prevSlots.clear();
  for (const [hid, cls] of classifiedHands) {
    mem.prevClassifications.set(hid, cls);
  }
  for (const [hid, est] of estimates) {
    mem.prevEstimates.set(hid, est);
  }
  for (let i = 0; i < state.ranking.length; i++) {
    const hid = state.ranking[i];
    if (hid) mem.prevSlots.set(hid, i);
  }
  // Decay defense cooldowns.
  for (const prof of mem.profiles.values()) {
    const next = new Map<string, number>();
    for (const [handKey, ticks] of prof.handDefenseCooldown) {
      if (ticks > 1) next.set(handKey, ticks - 1);
    }
    prof.handDefenseCooldown = next;
  }
}

/**
 * Process new dings/fuckoffs from state logs and update profiles + return
 * interpreted adjustments for the bot's decision pipeline.
 */
export type SocialAdjustments = {
  /** handId → strength boost from interpreting teammate dings. */
  strengthBoosts: Map<string, number>;
  /** playerId → defensiveness multiplier (1.0 = normal). */
  defenseMultipliers: Map<string, number>;
  /** playerId → trust penalty for trades with this player. */
  trustPenalties: Map<string, number>;
};

export function processSocialSignals(
  mem: SocialMemory,
  state: GameState,
  myPlayerId: string
): SocialAdjustments {
  mem.phaseTick++;
  const boosts = new Map<string, number>();
  const defenseMults = new Map<string, number>();
  const trustPenalties = new Map<string, number>();

  // === Process new dings ===
  const newDings = state.dingLog.slice(mem.processedDingLen);
  mem.processedDingLen = state.dingLog.length;

  for (const sig of newDings) {
    if (sig.playerId === myPlayerId) continue;
    const prof = getOrInitProfile(mem, sig.playerId);
    prof.dingCount++;
    const isPhaseStart = mem.phaseTick <= 3;
    if (isPhaseStart) prof.dingAtPhaseStart++;

    // Try to infer which hand improved.
    const theirHands = state.hands.filter((h) => h.playerId === sig.playerId);
    let bestCandidate: string | null = null;
    let bestJump = 0;
    for (const h of theirHands) {
      const prevSlot = mem.prevSlots.get(h.id);
      const curSlot = state.ranking.indexOf(h.id);
      if (prevSlot !== undefined && prevSlot !== -1 && curSlot !== -1 && curSlot < prevSlot) {
        const jump = prevSlot - curSlot; // negative slot = better rank
        if (jump > bestJump) {
          bestJump = jump;
          bestCandidate = h.id;
        }
      }
    }
    // If no slot jump, but it's phase start, they probably got a strong hand
    // and placed it high immediately.
    if (!bestCandidate && isPhaseStart) {
      for (const h of theirHands) {
        const curSlot = state.ranking.indexOf(h.id);
        if (curSlot !== -1 && curSlot <= 1) {
          bestCandidate = h.id;
          break;
        }
      }
    }

    if (bestCandidate) {
      // Boost belief for the dinged hand. Strength of boost depends on
      // player's ding reliability (learned over time).
      const boost = 0.05 + 0.1 * prof.dingReliability;
      boosts.set(bestCandidate, (boosts.get(bestCandidate) ?? 0) + boost);
    }

    // Update reliability estimate heuristically.
    // Strategic = dings mostly at phase start. Chaotic = dings mid-phase.
    if (prof.dingCount >= 3) {
      const strategicRate = prof.dingAtPhaseStart / prof.dingCount;
      if (strategicRate > 0.6) {
        prof.style = "strategic";
        prof.dingReliability = Math.min(1, prof.dingReliability + 0.08);
      } else if (strategicRate < 0.3) {
        prof.style = "chaotic";
        prof.dingReliability = Math.max(0, prof.dingReliability - 0.1);
      } else {
        prof.style = "expressive";
      }
    }
  }

  // === Process new fuckoffs ===
  const newFuckoffs = state.fuckoffLog.slice(mem.processedFuckoffLen);
  mem.processedFuckoffLen = state.fuckoffLog.length;

  for (const sig of newFuckoffs) {
    if (sig.playerId === myPlayerId) continue;
    const prof = getOrInitProfile(mem, sig.playerId);
    prof.fuckoffCount++;

    // Check if this fuckoff happened right after a proposal interaction.
    const recentProposal = state.acquireRequests.some(
      (r) =>
        (r.initiatorId === sig.playerId || state.hands.find((h) => h.id === r.recipientHandId)?.playerId === sig.playerId)
    );
    // Also consider if there were recently-resolved proposals (we can't see
    // history, so use the existence of ANY pending proposal involving them
    // as weak signal; stronger signal is if they just rejected something).
    if (recentProposal || mem.phaseTick <= 2) {
      prof.fuckoffAfterProposal++;
    }

    // Defensiveness bump.
    prof.defensiveness = Math.min(1, prof.defensiveness + 0.12);
    defenseMults.set(sig.playerId, 1.0 + prof.defensiveness * 0.5);
    trustPenalties.set(sig.playerId, prof.defensiveness * 0.25);

    // If the fuckoff is from a player who just had a proposal directed at
    // them, mark their hands as defended.
    for (const r of state.acquireRequests) {
      const recipientHand = state.hands.find((h) => h.id === r.recipientHandId);
      if (recipientHand && recipientHand.playerId === sig.playerId) {
        prof.handDefenseCooldown.set(r.recipientHandId, 5);
      }
    }

    // Style update.
    if (prof.fuckoffCount >= 2) {
      const proposalRate = prof.fuckoffAfterProposal / prof.fuckoffCount;
      if (proposalRate > 0.5 && prof.style !== "chaotic") {
        prof.style = "strategic";
      } else if (proposalRate < 0.3 && prof.fuckoffCount > 3) {
        prof.style = "chaotic";
      }
    }
  }

  return { strengthBoosts: boosts, defenseMultipliers: defenseMults, trustPenalties };
}

/**
 * Should this bot send a ding? Returns true if there's a compelling
 * strength-based or improvement-based reason to signal.
 */
export function shouldSemanticDing(
  state: GameState,
  myPlayerId: string,
  classifiedHands: Map<string, ClassifiedHand>,
  estimates: Map<string, number>,
  mem: SocialMemory,
  traits: { extraversion: number; conscientiousness: number }
): boolean {
  const myHands = state.hands.filter((h) => h.playerId === myPlayerId);
  if (myHands.length === 0) return false;

  // Cooldown: max 1 ding per phase per bot, and only within first 6 ticks.
  if (mem.phaseTick > 6) return false;
  const alreadyDingedThisPhase = state.dingLog.some(
    (s) => s.playerId === myPlayerId && s.phase === state.phase
  );
  if (alreadyDingedThisPhase) return false;

  for (const h of myHands) {
    const est = estimates.get(h.id) ?? 0.5;
    const cls = classifiedHands.get(h.id);
    const prevCls = mem.prevClassifications.get(h.id);
    const prevEst = mem.prevEstimates.get(h.id);

    // 1. Preflop premium.
    if (state.phase === "preflop" && est > 0.78) {
      // Extraversion gates willingness to show strength; conscientiousness
      // gates impulse control (low = more likely to blurt it out).
      const threshold = 0.55 - traits.extraversion * 0.15 + traits.conscientiousness * 0.1;
      if (Math.random() > threshold) return true;
    }

    // 2. Hand improved from last phase.
    if (prevCls && cls) {
      const improved = handRankValue(cls.madeHandType) > handRankValue(prevCls.madeHandType);
      const bigJump = prevEst !== undefined && est - prevEst > 0.2;
      if (improved || bigJump) {
        const threshold = 0.45 - traits.extraversion * 0.2 + traits.conscientiousness * 0.1;
        if (Math.random() > threshold) return true;
      }
    }

    // 3. Strong made hand on current board (two-pair+).
    if (cls && cls.madeHandType && !["high-card", "pair"].includes(cls.madeHandType) && est > 0.65) {
      const threshold = 0.6 - traits.extraversion * 0.2 + traits.conscientiousness * 0.15;
      if (Math.random() > threshold) return true;
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
  memo: {
    myRejectedKeys: Set<string>;
    ticksSinceProgress: number;
  },
  mem: SocialMemory,
  traits: { agreeableness: number; extraversion: number; neuroticism: number }
): { targetPlayerId?: string; reason: "reject" | "repeat" | "defense" | "mood" } | null {
  // Cooldown: max 1 fuckoff per phase, and not in first tick.
  if (mem.phaseTick <= 1) return null;
  const alreadyFuckedOff = state.fuckoffLog.some(
    (s) => s.playerId === myPlayerId && s.phase === state.phase
  );
  if (alreadyFuckedOff) return null;

  // 1. Hard reject: we just rejected a proposal and it's a clearly bad offer.
  // We detect this by checking if a proposal to us vanished and we did NOT
  // accept it (meaning we rejected). The strategy layer handles the actual
  // reject; this just checks if we should ALSO fuckoff.
  // For simplicity: if we have any recently-rejected keys and we're feeling
  // disagreeable, fuckoff at the proposer.
  if (memo.myRejectedKeys.size > 0) {
    const disagree = (1 - traits.agreeableness) * 0.3 + traits.neuroticism * 0.15;
    if (Math.random() < disagree) {
      // Find the most recent proposer to us.
      for (const r of state.acquireRequests) {
        const rh = state.hands.find((h) => h.id === r.recipientHandId);
        if (rh && rh.playerId === myPlayerId) {
          return { targetPlayerId: r.initiatorId, reason: "reject" };
        }
      }
    }
  }

  // 2. Repeat offender: same player proposed to us again after we already
  // rejected a key this phase.
  for (const r of state.acquireRequests) {
    const rh = state.hands.find((h) => h.id === r.recipientHandId);
    if (!rh || rh.playerId !== myPlayerId) continue;
    const key = r.initiatorHandId + "|" + r.recipientHandId;
    if (memo.myRejectedKeys.has(key)) {
      if (Math.random() < 0.5 + traits.neuroticism * 0.3) {
        return { targetPlayerId: r.initiatorId, reason: "repeat" };
      }
    }
  }

  // 3. Defense: someone is trying to take a very strong hand of ours.
  for (const r of state.acquireRequests) {
    const rh = state.hands.find((h) => h.id === r.recipientHandId);
    if (!rh || rh.playerId !== myPlayerId) continue;
    // If our hand is placed in a top-2 slot, it's likely strong.
    const slot = state.ranking.indexOf(rh.id);
    if (slot !== -1 && slot <= 1) {
      if (Math.random() < (1 - traits.agreeableness) * 0.25 + traits.neuroticism * 0.1) {
        return { targetPlayerId: r.initiatorId, reason: "defense" };
      }
    }
  }

  return null;
}

/** Numeric ranking for made-hand types, for improvement comparison. */
function handRankValue(type: string | null): number {
  if (!type) return 0;
  const map: Record<string, number> = {
    "high-card": 1,
    pair: 2,
    "two-pair": 3,
    "three-of-a-kind": 4,
    straight: 5,
    flush: 6,
    "full-house": 7,
    quads: 8,
    "straight-flush": 9,
  };
  return map[type] ?? 0;
}
