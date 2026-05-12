/**
 * Server-side types — concepts that live in `party/` and are not part of the
 * client/server wire contract. Anything imported by client code should live in
 * `src/lib/types.ts` instead.
 *
 * `BotActionLogEntry` and `BotActionAudit` cross the wire (clients render
 * `RevealResults`/`BotActionAuditPanel` from the broadcast state) but are
 * conceptually owned by the server: the server is the only producer, clients
 * are read-only consumers. We keep their canonical definitions here per the
 * GameMode-engine architecture and re-export them through `src/lib/types.ts`
 * for backwards-compatible client imports.
 */

import type { ClientMessage, Card, Phase, AcquireRequest, ChaosEventAction } from "../src/lib/types";

export type BotActionAudit = {
  verdict: "plausible" | "deviation";
  explanation: string;
};

export type BotActionLogEntry = {
  id: string;
  ts: number;
  phaseElapsedMs: number | null;
  phase: Phase;
  playerId: string;
  playerName: string;
  action: ClientMessage | ChaosEventAction;
  applied: boolean;
  communityCards: Card[];
  /**
   * Hole cards owned by the actor at the time of the action. Masked to `[]`
   * for non-actors before reveal phase.
   */
  actorHoleCards: Record<string, Card[]>;
  rankingBefore: (string | null)[];
  rankingAfter: (string | null)[];
  acquireRequestsBefore: AcquireRequest[];
  acquireRequestsAfter: AcquireRequest[];
  audit?: BotActionAudit;
};
