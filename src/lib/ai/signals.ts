import type { GameState } from "../types";
import type { BeliefState } from "./belief";

export type TeammateSignals = {
  playerId: string;
  confidence: number; // 0..1 — how settled they look
  uncertainty: number; // 0..1 — inverse of confidence; separated for clarity
  churnRate: number;
};

// Public-history signal extraction. Uses belief state (which already tracks
// slot stability + churn) plus current ready flags.
export function extractSignals(
  state: GameState,
  belief: BeliefState,
  myPlayerId: string
): TeammateSignals[] {
  const out: TeammateSignals[] = [];
  for (const p of state.players) {
    if (p.id === myPlayerId) continue;
    const tb = belief.perTeammate.get(p.id);
    const churn = tb?.churnRate ?? 0;

    // Stability across their placed hands.
    let stable = 0;
    let placed = 0;
    if (tb) {
      for (const hb of tb.hands.values()) {
        placed++;
        stable += Math.min(3, hb.slotStableFor) / 3;
      }
    }
    const stability = placed === 0 ? 0.3 : stable / placed;

    // Ready = strong "I'm done" signal.
    const readyBoost = p.ready ? 0.2 : 0;

    const confidence = Math.max(0, Math.min(1, 0.2 + 0.6 * stability - 0.4 * churn + readyBoost));
    out.push({
      playerId: p.id,
      confidence,
      uncertainty: 1 - confidence,
      churnRate: churn,
    });
  }
  return out;
}

// Given a teammate hand id, how "defer-worthy" is their placement?
export function deferralWeight(
  belief: BeliefState,
  signals: TeammateSignals[],
  handId: string
): number {
  const conf = belief.handConfidence.get(handId) ?? 0;
  const h = Array.from(belief.perTeammate.entries()).find(([, tb]) => tb.hands.has(handId));
  if (!h) return conf;
  const sig = signals.find((s) => s.playerId === h[0]);
  const teammateConf = sig?.confidence ?? 0.3;
  return Math.min(1, conf * 0.6 + teammateConf * 0.4);
}
