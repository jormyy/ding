import { describe, it, expect } from "vitest";
import {
  newBeliefState,
  perceiveState,
  reconcileTrades,
  phaseTrust,
  updateFromPlacement,
} from "../../src/lib/ai/belief";
import type { AcquireRequest, GameState, Hand, Player } from "../../src/lib/types";

const players: Player[] = [
  { id: "me", connId: "c1", name: "Me", isCreator: true, ready: false, connected: true },
  { id: "p1", connId: "c2", name: "P1", isCreator: false, ready: false, connected: true, isBot: true },
  { id: "p2", connId: "c3", name: "P2", isCreator: false, ready: false, connected: true, isBot: true },
];

function makeHand(id: string, playerId: string): Hand {
  return { id, playerId, cards: [], flipped: false };
}

function makeState(opts: Partial<GameState>): GameState {
  return {
    phase: "river",
    players,
    hands: [],
    communityCards: [],
    ranking: [],
    revealIndex: 0,
    score: null,
    chats: [],
    acquireRequests: [],
    ...opts,
  } as GameState;
}

describe("phaseTrust", () => {
  it("gives lower weight to preflop than river", () => {
    expect(phaseTrust("preflop")).toBeLessThan(phaseTrust("flop"));
    expect(phaseTrust("flop")).toBeLessThan(phaseTrust("turn"));
    expect(phaseTrust("turn")).toBeLessThan(phaseTrust("river"));
    expect(phaseTrust("river")).toBe(1.0);
  });
});

describe("perceiveState with phase trust", () => {
  it("preflop placement has weaker effect on belief than river placement", () => {
    // Use 3 hands so impliedStrength is non-degenerate (totalHands > 1).
    const handA = makeHand("a", "p1");
    const handB = makeHand("b", "p2");
    const handC = makeHand("c", "p2");
    const baseState = makeState({
      hands: [handA, handB, handC],
      ranking: ["a", "b", "c"],
    });

    const bPre = newBeliefState();
    perceiveState(bPre, { ...baseState, phase: "preflop" }, "me");
    const meanPre = bPre.handStrength.get("a") ?? 0.5;
    const concPre = bPre.perTeammate.get("p1")?.hands.get("a")?.concentration ?? 0;

    const bRiver = newBeliefState();
    perceiveState(bRiver, { ...baseState, phase: "river" }, "me");
    const meanRiv = bRiver.handStrength.get("a") ?? 0.5;
    const concRiv = bRiver.perTeammate.get("p1")?.hands.get("a")?.concentration ?? 0;

    // Both update mean toward implied 1.0 (slot 0 of 3) but river updates
    // more aggressively because phase trust is higher.
    expect(meanRiv).toBeGreaterThan(meanPre);
    expect(concRiv).toBeGreaterThan(concPre);
  });
});

describe("reconcileTrades — accepted swap", () => {
  it("boosts concentration on both hands when a pending swap completes", () => {
    const handA = makeHand("a", "p1");
    const handB = makeHand("b", "p2");

    // Step 1: both hands placed, p1's hand at slot 1, p2's at slot 0.
    const state1 = makeState({
      hands: [handA, handB],
      ranking: ["b", "a"],
    });
    const belief = newBeliefState();
    perceiveState(belief, state1, "me");

    const concBeforeA = belief.perTeammate.get("p1")?.hands.get("a")?.concentration ?? 0;
    const concBeforeB = belief.perTeammate.get("p2")?.hands.get("b")?.concentration ?? 0;

    const pendingSwap: AcquireRequest[] = [
      { kind: "swap", initiatorId: "p1", initiatorHandId: "a", recipientHandId: "b" },
    ];

    // Step 2: swap accepted — ranking inverted.
    const state2 = makeState({
      hands: [handA, handB],
      ranking: ["a", "b"], // a now at slot 0, b at slot 1
    });

    reconcileTrades(belief, state2, pendingSwap, "me");
    perceiveState(belief, state2, "me");

    const concAfterA = belief.perTeammate.get("p1")?.hands.get("a")?.concentration ?? 0;
    const concAfterB = belief.perTeammate.get("p2")?.hands.get("b")?.concentration ?? 0;

    // Both should have a concentration jump beyond what perceiveState alone would do.
    expect(concAfterA).toBeGreaterThan(concBeforeA);
    expect(concAfterB).toBeGreaterThan(concBeforeB);
    // Specifically the consensus bump should be visible (we add 2 each).
    expect(concAfterA - concBeforeA).toBeGreaterThanOrEqual(2);
  });
});

describe("reconcileTrades — rejected proposal", () => {
  it("affirms recipient placement on rejection", () => {
    const handA = makeHand("a", "p1");
    const handB = makeHand("b", "p2");

    // Both placed, request pending.
    const state1 = makeState({
      hands: [handA, handB],
      ranking: ["b", "a"],
    });
    const belief = newBeliefState();
    perceiveState(belief, state1, "me");
    const concBefore = belief.perTeammate.get("p2")?.hands.get("b")?.concentration ?? 0;

    const pending: AcquireRequest[] = [
      { kind: "swap", initiatorId: "p1", initiatorHandId: "a", recipientHandId: "b" },
    ];

    // Rejected: ranking unchanged, request gone.
    const state2 = makeState({
      hands: [handA, handB],
      ranking: ["b", "a"],
      acquireRequests: [],
    });
    reconcileTrades(belief, state2, pending, "me");
    const concAfter = belief.perTeammate.get("p2")?.hands.get("b")?.concentration ?? 0;

    // Recipient (b) gets a small consensus bump.
    expect(concAfter).toBeGreaterThan(concBefore);
  });
});

describe("updateFromPlacement honors phaseTrustWeight", () => {
  it("low trust weight = smaller mean shift", () => {
    const bLow = newBeliefState();
    updateFromPlacement(bLow, "p1", "h1", 0, 5, 0.5, 0.25);
    const bHigh = newBeliefState();
    updateFromPlacement(bHigh, "p1", "h1", 0, 5, 0.5, 1.0);
    const meanLow = bLow.handStrength.get("h1")!;
    const meanHigh = bHigh.handStrength.get("h1")!;
    // Implied strength at slot 0 of 5 = 1.0. Higher trust = mean closer to 1.0.
    expect(meanHigh).toBeGreaterThan(meanLow);
  });
});
