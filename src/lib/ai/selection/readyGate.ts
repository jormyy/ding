/**
 * Gate that decides whether a bot is allowed to *propose* a trade this tick,
 * given personality, decision-cap, recent activity, and the score it just
 * computed.
 *
 * Pulled out of the strategy.ts monolith so policy tuning lives separately
 * from the candidate-generation loop.
 */

import type { BotMemo } from "../strategy";

export function canPropose(
  memo: BotMemo,
  resignation: number,
  overDecisionCap: boolean,
  teamInversionDelta: number,
  tableSize: number,
  stubbornness: number,
  confidence: number
): boolean {
  if (overDecisionCap) return false;
  if (resignation >= 0.85) return false;
  const cap = Math.max(2, Math.ceil(tableSize * 0.4));
  if (memo.myProposalsThisPhase >= cap) return false;
  const proposeBar = Math.max(0.75, 0.45 + resignation * 1.2 + stubbornness * 0.3);
  const effectiveDelta = teamInversionDelta * confidence;
  return effectiveDelta > proposeBar;
}
