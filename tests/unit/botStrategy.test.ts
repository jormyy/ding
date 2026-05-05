import { describe, expect, it, vi } from "vitest";
import { decideAction, newBotMemo } from "../../src/lib/ai/strategy";
import type { Card, GameState, Hand, Player } from "../../src/lib/types";
import type { Traits } from "../../src/lib/ai/personality";

function c(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

function hand(id: string, playerId: string, cards: Card[] = []): Hand {
  return { id, playerId, cards, flipped: false };
}

function player(id: string, ready = false): Player {
  return { id, connId: id + "-conn", name: id, isCreator: false, ready, connected: true, isBot: true };
}

function traits(overrides: Partial<Traits> = {}): Traits {
  return {
    openness: 0.5,
    conscientiousness: 0.7,
    extraversion: 0.4,
    agreeableness: 0.5,
    neuroticism: 0.2,
    skill: 1,
    decisiveness: 0.4,
    trustInTeammates: 0.5,
    helpfulness: 0.5,
    stubbornness: 0.55,
    baseThinkMs: 0,
    thinkPerDifficultyMs: 0,
    hesitationProb: 0,
    quirks: {},
    ...overrides,
  };
}

function state(opts: Partial<GameState>): GameState {
  return {
    phase: "preflop",
    players: [player("me"), player("p1")],
    handsPerPlayer: 2,
    gameTimerSeconds: 0,
    roundTimerSeconds: 0,
    phaseStartedAt: 0,
    gameStartedAt: 0,
    communityCards: [],
    ranking: [],
    hands: [],
    revealIndex: 0,
    trueRanking: null,
    trueRanks: null,
    score: null,
    rankHistory: {},
    acquireRequests: [],
    chatMessages: [],
    dingLog: [],
    fuckoffLog: [],
    ...opts,
  };
}

describe("bot strategy guide contract", () => {
  it("anchors a known premium preflop hand before weaker own hands", () => {
    const memo = newBotMemo();
    const aa = hand("me-aa", "me", [c("A", "H"), c("A", "D")]);
    const trash = hand("me-23", "me", [c("2", "C"), c("3", "S")]);
    const oppA = hand("p1-a", "p1");
    const oppB = hand("p1-b", "p1");

    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const msg = decideAction(
      state({
        hands: [aa, trash, oppA, oppB],
        ranking: [null, null, null, null],
      }),
      "me",
      traits({ quirks: { leadsConsensus: 0.6 } }),
      memo,
    );
    random.mockRestore();

    expect(msg).toEqual({ type: "move", handId: "me-aa", toIndex: 0 });
  });

  it("places the strongest unranked own hand first even when rank 1 is occupied", () => {
    const memo = newBotMemo();
    const aa = hand("me-aa", "me", [c("A", "H"), c("A", "D")]);
    const trash = hand("me-23", "me", [c("2", "C"), c("3", "S")]);
    const opp = hand("p1-a", "p1");

    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const msg = decideAction(
      state({
        hands: [aa, trash, opp],
        ranking: ["p1-a", null, null],
      }),
      "me",
      traits({ quirks: { leadsConsensus: 0.6 } }),
      memo,
    );
    random.mockRestore();

    expect(msg).toEqual({ type: "move", handId: "me-aa", toIndex: 1 });
  });

  it("does not treat ding or fuckoff logs as hand-strength evidence", () => {
    const memo = newBotMemo();
    const msg = decideAction(
      state({
        phase: "flop",
        hands: [
          hand("me-a", "me", [c("K", "H"), c("9", "D")]),
          hand("p1-a", "p1"),
        ],
        communityCards: [c("2", "C"), c("7", "D"), c("Q", "S")],
        ranking: [null, null],
        dingLog: [{ playerId: "p1", playerName: "p1", phase: "flop", ts: 1, handId: "p1-a" }],
        fuckoffLog: [{ playerId: "p1", playerName: "p1", phase: "flop", ts: 2, handId: "p1-a" }],
      }),
      "me",
      traits(),
      memo,
    );

    expect(msg?.type).toBe("move");
    expect(memo.belief.handStrength.has("p1-a")).toBe(false);
    expect(memo.belief.handConfidence.has("p1-a")).toBe(false);
  });

  it("chooses a meaningful own-hand improvement over ready", () => {
    const memo = newBotMemo();
    memo.ticksSinceProgress = 10;
    const weak = hand("me-23", "me", [c("2", "C"), c("3", "S")]);
    const strong = hand("me-aa", "me", [c("A", "H"), c("A", "D")]);

    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const msg = decideAction(
      state({
        phase: "preflop",
        players: [player("me"), player("p1", true)],
        hands: [weak, strong],
        communityCards: [],
        ranking: ["me-23", "me-aa"],
      }),
      "me",
      traits({ decisiveness: 0.1 }),
      memo,
    );
    random.mockRestore();

    expect(msg).toEqual({ type: "swap", handIdA: "me-23", handIdB: "me-aa" });
  });

  it("does not ready while a strong own anchor is stranded in the middle", () => {
    const memo = newBotMemo();
    memo.ticksSinceProgress = 10;
    const offline = player("p2");
    offline.connected = false;

    const msg = decideAction(
      state({
        phase: "preflop",
        players: [player("me"), player("p1", true), offline],
        hands: [
          hand("me-aa", "me", [c("A", "H"), c("A", "D")]),
          hand("p1-a", "p1"),
          hand("p1-b", "p1"),
          hand("p2-a", "p2"),
        ],
        communityCards: [],
        ranking: ["p1-a", null, "me-aa", "p1-b"],
      }),
      "me",
      traits(),
      memo,
    );

    expect(msg).toEqual({ type: "move", handId: "me-aa", toIndex: 1 });
  });

  it("can ready when an extreme own anchor is stranded but no empty legal anchor slot exists", () => {
    const memo = newBotMemo();
    memo.ticksSinceProgress = 10;

    const msg = decideAction(
      state({
        phase: "preflop",
        players: [player("me"), player("p1", true)],
        hands: [
          hand("me-23", "me", [c("2", "C"), c("3", "S")]),
          hand("p1-a", "p1"),
          hand("p1-b", "p1"),
          hand("p1-c", "p1"),
        ],
        communityCards: [],
        ranking: ["p1-a", "me-23", "p1-b", "p1-c"],
      }),
      "me",
      traits({ decisiveness: 1 }),
      memo,
    );

    expect(msg).toEqual({ type: "ready", ready: true });
  });
});
