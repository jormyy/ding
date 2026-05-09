import { describe, expect, it } from "vitest";
import { auditBotActionLog } from "../../party/botAudit";
import type { BotActionLogEntry, Card, ClientMessage, Player } from "../../src/lib/types";
import type { ServerGameState } from "../../party/state";
import { createServerGameState } from "../shared/factories";

function c(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

function bot(id: string): Player {
  return {
    id,
    connId: `bot:${id}`,
    name: id,
    isCreator: false,
    ready: false,
    connected: true,
    isBot: true,
  };
}

function entry(
  overrides: Partial<BotActionLogEntry> & { action: ClientMessage }
): BotActionLogEntry {
  return {
    id: overrides.id ?? "e1",
    ts: overrides.ts ?? 1,
    phaseElapsedMs: overrides.phaseElapsedMs ?? 2500,
    phase: overrides.phase ?? "preflop",
    playerId: overrides.playerId ?? "bot-a",
    playerName: overrides.playerName ?? "bot-a",
    action: overrides.action,
    applied: overrides.applied ?? true,
    communityCards: overrides.communityCards ?? [],
    actorHoleCards: overrides.actorHoleCards ?? {},
    rankingBefore: overrides.rankingBefore ?? [null, null, null],
    rankingAfter: overrides.rankingAfter ?? [null, null, null],
    acquireRequestsBefore: overrides.acquireRequestsBefore ?? [],
    acquireRequestsAfter: overrides.acquireRequestsAfter ?? [],
  };
}

function baseState(entries: BotActionLogEntry[]): ServerGameState {
  return createServerGameState({
    phase: "reveal",
    players: [bot("bot-a"), bot("bot-b")],
    hands: [
      { id: "bot-a-0", playerId: "bot-a", cards: [c("A", "H"), c("A", "D")], flipped: true },
      { id: "bot-b-0", playerId: "bot-b", cards: [c("2", "C"), c("3", "S")], flipped: true },
      { id: "human-0", playerId: "human", cards: [c("K", "H"), c("Q", "D")], flipped: true },
    ],
    ranking: ["bot-a-0", "human-0", "bot-b-0"],
    trueRanking: ["bot-a-0", "human-0", "bot-b-0"],
    trueRanks: { "bot-a-0": 1, "human-0": 2, "bot-b-0": 3 },
    score: 0,
    botActionLog: entries,
    allCommunityCards: [],
  });
}

describe("bot action audit", () => {
  it("flags a bot opening an empty phase too quickly", () => {
    const state = baseState([
      entry({
        action: { type: "move", handId: "bot-a-0", toIndex: 0 },
        phaseElapsedMs: 200,
        actorHoleCards: { "bot-a-0": [c("A", "H"), c("A", "D")] },
        rankingBefore: [null, null, null],
        rankingAfter: ["bot-a-0", null, null],
      }),
    ]);

    auditBotActionLog(state);

    expect(state.botActionLog[0].audit?.verdict).toBe("deviation");
    expect(state.botActionLog[0].audit?.explanation).toContain("too quickly");
  });

  it("flags same-phase chip churn even when each slot is individually plausible", () => {
    const entries = [
      entry({
        id: "e1",
        action: { type: "move", handId: "bot-a-0", toIndex: 0 },
        actorHoleCards: { "bot-a-0": [c("A", "H"), c("9", "D")] },
        rankingBefore: [null, null, null],
        rankingAfter: ["bot-a-0", null, null],
      }),
      entry({
        id: "e2",
        ts: 2,
        action: { type: "move", handId: "bot-a-0", toIndex: 1 },
        actorHoleCards: { "bot-a-0": [c("A", "H"), c("9", "D")] },
        rankingBefore: ["bot-a-0", null, null],
        rankingAfter: [null, "bot-a-0", null],
      }),
    ];
    const state = baseState(entries);

    auditBotActionLog(state);

    expect(state.botActionLog[0].audit?.verdict).toBe("deviation");
    expect(state.botActionLog[0].audit?.explanation).toContain("later moved");
    expect(state.botActionLog[1].audit?.verdict).toBe("deviation");
    expect(state.botActionLog[1].audit?.explanation).toContain("churned");
  });

  it("flags lopsided acquire proposals", () => {
    const state = baseState([
      entry({
        action: { type: "proposeChipMove", initiatorHandId: "bot-a-0", recipientHandId: "bot-b-0" },
        actorHoleCards: { "bot-a-0": [c("A", "H"), c("A", "D")] },
        rankingBefore: ["bot-a-0", "human-0", "x-0", "x-1", "x-2", "bot-b-0"],
        rankingAfter: ["bot-b-0", "human-0", "x-0", "x-1", "x-2", "bot-a-0"],
      }),
    ]);

    auditBotActionLog(state);

    expect(state.botActionLog[0].audit?.verdict).toBe("deviation");
    expect(state.botActionLog[0].audit?.explanation).toContain("lopsided");
  });

  it("flags ready actions that happen before any phase review", () => {
    const state = baseState([
      entry({
        action: { type: "ready", ready: true },
        rankingBefore: ["bot-a-0", "human-0", "bot-b-0"],
        rankingAfter: ["bot-a-0", "human-0", "bot-b-0"],
      }),
    ]);

    auditBotActionLog(state);

    expect(state.botActionLog[0].audit?.verdict).toBe("deviation");
    expect(state.botActionLog[0].audit?.explanation).toContain("without any logged placement");
  });

  it("does not flag rejecting a human-originated pending request as missing proposal context", () => {
    const state = baseState([
      entry({
        action: { type: "rejectChipMove", initiatorHandId: "human-0", recipientHandId: "bot-a-0" },
        rankingBefore: ["human-0", "bot-a-0", "bot-b-0"],
        rankingAfter: ["human-0", "bot-a-0", "bot-b-0"],
        actorHoleCards: { "bot-a-0": [c("A", "H"), c("A", "D")] },
        acquireRequestsBefore: [{
          kind: "swap",
          initiatorId: "human",
          initiatorHandId: "human-0",
          recipientHandId: "bot-a-0",
        }],
      }),
    ]);

    auditBotActionLog(state);

    expect(state.botActionLog[0].audit?.verdict).toBe("plausible");
    expect(state.botActionLog[0].audit?.explanation).toContain("rejection is plausible");
  });
});
