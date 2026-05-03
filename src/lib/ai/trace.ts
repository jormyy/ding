/**
 * Per-decision trace types for bot audit tooling.
 *
 * decideAction can be passed a TraceSink. When provided, every decision the
 * bot makes is emitted as a DecisionTrace including top candidates, the picked
 * action, a one-line reason tag, and a snapshot of the bot's belief vs the
 * placement on the board. simulateFast.ts (or any harness) is responsible for
 * adding gameId/tick context and writing the result somewhere durable.
 *
 * The audit script (scripts/audit-decisions.ts) consumes the resulting JSONL
 * stream and flags illogical-looking decisions against ground truth.
 */
import type { AcquireRequest, ClientMessage } from "../types";

export type TraceCandidate = {
  msgType: string;
  utility: number;
  teamInversionDelta: number;
  confidence: number;
  /** Optional per-action context — handId, slot, blendedDelta, etc. */
  meta?: Record<string, unknown>;
};

export type DecisionTrace = {
  type: "decision";
  phase: string;
  myPlayerId: string;
  decisionCount: number;
  resignation: number;
  candidates: TraceCandidate[];
  pickedIndex: number;
  picked: ClientMessage;
  reason: string;
  myHands: Array<{ handId: string; ownStrength: number; slot: number }>;
  ranking: (string | null)[];
  beliefSnapshot: Array<{ handId: string; mean: number; confidence: number }>;
  acquireRequests: AcquireRequest[];
  /** Top action's blended-delta context if it's an accept/reject. */
  pickedMeta?: Record<string, unknown>;
};

export type PhaseBoundaryTrace = {
  type: "phaseBoundary";
  phase: string;
  myPlayerId: string;
  beliefs: Array<{ handId: string; mean: number; confidence: number }>;
};

export type TruthTrace = {
  type: "truth";
  phase: string;
  trueRanking: string[];
  /** handId → percentile in [0,1], 1 = strongest. */
  truePercentile: Record<string, number>;
  ranking: (string | null)[];
  handPlayers: Record<string, string>;
  /** handId → currentHandStrength on full info board. */
  trueStrength: Record<string, number>;
};

export type TraceEvent = DecisionTrace | PhaseBoundaryTrace | TruthTrace;

/**
 * Sink for decision/phase-boundary events emitted by `decideAction`. The
 * harness wrapping this sink is responsible for adding `gameId` / `tick`
 * context and persisting the events.
 */
export type TraceSink = (event: DecisionTrace | PhaseBoundaryTrace) => void;
