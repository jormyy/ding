/**
 * Score modifiers — small per-candidate utility tweaks applied on top of the
 * base team-EV score (`scoreAction.teamInversionDelta`). Lifted from the
 * monolithic strategy.ts so each modifier is independently testable and the
 * tuning surface is centralized.
 *
 * The modifier set today: utility blend, anchor bonus, spread penalty,
 * order-preservation bonus, proportionate-proposal gate.
 */

import type { GameState } from "../../../types";
import { clamp } from "../../../utils";
import type { Traits } from "../../personality";
import type { ActionScore } from "../../ev";
import type { Candidate } from "../../strategy";

/**
 * Blend score, traits, and per-action bonuses into a single utility number.
 * Helpfulness amplifies team-only benefits; selfBenefit is a tiny tiebreaker.
 */
export function utilityFor(
  score: ActionScore,
  traits: Traits,
  bonuses: { selfBenefit?: number; teamOnlyBenefit?: number } = {}
): number {
  const base = score.teamInversionDelta * (0.4 + 0.6 * score.confidence);
  const helper = (bonuses.teamOnlyBenefit ?? 0) * traits.helpfulness * 0.3;
  const self = (bonuses.selfBenefit ?? 0) * 0.1;
  return base + helper + self;
}

/**
 * Anchor bonus: when our own hand is at the strength extremes, give a
 * placement bump for the matching slot. Top-1 and bottom slot are high-value
 * commitments per the strategy guide.
 *
 * Thresholds scale with the board prior: on a wet board where the average
 * hand is strong we need a higher absolute strength to anchor top, and vice
 * versa. We also relax the gate compared to the old hard 0.85/0.15 cutoffs,
 * which missed top pairs and high cards on small tables.
 */
export function anchorBonus(
  ownStrength: number,
  targetSlot: number,
  totalSlots: number,
  leadsConsensus: number,
  boardPrior: number
): number {
  if (totalSlots <= 1) return 0;
  const lead = 1 + leadsConsensus * 0.4;
  // Top anchor: strong hand relative to the board's average. Min floor of 0.65
  // so noise around boardPrior doesn't over-trigger; max cap of 0.85 for very
  // wet boards.
  const topThresh = clamp(boardPrior + 0.25, 0.65, 0.85);
  const bottomThresh = clamp(boardPrior - 0.25, 0.10, 0.30);
  if (ownStrength >= topThresh && targetSlot === 0) return 0.45 * lead;
  if (ownStrength >= topThresh && targetSlot === 1) return 0.38 * lead;
  if (ownStrength <= bottomThresh && targetSlot === totalSlots - 1) return 0.20 * lead;
  return 0;
}

export function isAnchorMoveCandidate(c: Candidate): boolean {
  if (c.msg.type !== "move") return false;
  const meta = c.meta as { anchor?: number } | undefined;
  return (meta?.anchor ?? 0) > 0;
}

/**
 * Spread penalty: discourage placing two of our own hands in adjacent slots
 * when we believe their strengths are nearly equal. Pure tie-breaker —
 * dominated by any real signal in the score.
 */
export function spreadPenalty(
  ownPlacements: Array<{ slot: number; strength: number }>,
  candidateSlot: number,
  candidateStrength: number
): number {
  for (const p of ownPlacements) {
    if (
      Math.abs(p.slot - candidateSlot) === 1 &&
      Math.abs(p.strength - candidateStrength) < 0.02
    ) {
      return 0.05;
    }
  }
  return 0;
}

/**
 * Order-preservation bonus: pay a small bump for placements that don't
 * jump far from the previous-phase rank, unless current strength is clearly
 * above/below thresholds (in which case a jump is justified).
 */
export function orderPreservationBonus(
  state: GameState,
  handId: string,
  candidateSlot: number,
  currentStrength: number
): number {
  if (state.phase === "preflop") return 0;
  const history = state.rankHistory[handId] ?? [];
  const previousRank = history[history.length - 1];
  if (previousRank === null || previousRank === undefined) return 0;

  const isClearlyImproved = currentStrength >= 0.62;
  const isClearlyWeak = currentStrength <= 0.25;
  if (isClearlyImproved || isClearlyWeak) return 0;

  const previousSlot = previousRank - 1;
  const distance = Math.abs(candidateSlot - previousSlot);
  const normalized = 1 - distance / Math.max(1, state.ranking.length - 1);
  return Math.max(0, normalized) * 0.22;
}

/**
 * Gate for whether to *propose* a chip move at all. Both the slot gap (before
 * AND after) must stay proportionate and the score's expected EV must clear a
 * confidence-weighted bar.
 */
export function isProportionateProposal(
  state: GameState,
  initiatorHandId: string,
  recipientHandId: string,
  after: (string | null)[],
  score: ActionScore
): boolean {
  const beforeInitiator = state.ranking.indexOf(initiatorHandId);
  const beforeRecipient = state.ranking.indexOf(recipientHandId);
  const afterInitiator = after.indexOf(initiatorHandId);
  const afterRecipient = after.indexOf(recipientHandId);
  const n = Math.max(1, state.ranking.length - 1);
  const beforeGap =
    beforeInitiator === -1 || beforeRecipient === -1
      ? 0
      : Math.abs(beforeInitiator - beforeRecipient) / n;
  const afterGap =
    afterInitiator === -1 || afterRecipient === -1
      ? 0
      : Math.abs(afterInitiator - afterRecipient) / n;
  const lopsided = Math.max(beforeGap, afterGap) > 0.45;
  if (lopsided && score.teamInversionDelta * score.confidence < 1.2) return false;
  return score.teamInversionDelta > 0.25 && score.confidence >= 0.45;
}
