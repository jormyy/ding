import { describe, it, expect } from "vitest";
import { decideAction, newBotMemo } from "../../src/lib/ai/strategy";
import { randomTraits } from "../../src/lib/ai/personality";
import type { Card, GameState, Hand, Player } from "../../src/lib/types";

function makeCard(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

function makeHand(id: string, playerId: string, cards: Card[] = []): Hand {
  return { id, playerId, cards, flipped: false };
}

const players: Player[] = [
  { id: "me", connId: "c1", name: "Me", isCreator: false, ready: false, connected: true, isBot: true },
  { id: "p1", connId: "c2", name: "P1", isCreator: false, ready: false, connected: true, isBot: true },
];

function baseState(opts: Partial<GameState>): GameState {
  return {
    phase: "river",
    players,
    handsPerPlayer: 1,
    hands: [],
    communityCards: [],
    ranking: [],
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

describe("Stubbornness trait", () => {
  it("is jittered into a [0,1] window", () => {
    for (let i = 0; i < 50; i++) {
      const { traits } = randomTraits();
      expect(traits.stubbornness).toBeGreaterThanOrEqual(0);
      expect(traits.stubbornness).toBeLessThanOrEqual(1);
    }
  });
});

describe("Stubborn bots and decideAction integration", () => {
  // We can't reliably assert exact reject rates because softmax + traits
  // jitter mask single-axis effects. Instead verify decideAction runs end-
  // to-end on a stubborn bot without throwing and emits some valid msg type.
  it("decideAction handles a high-stubbornness incoming-proposal scenario without error", () => {
    const myCards = [makeCard("8", "S"), makeCard("7", "H")];
    const myHand = makeHand("h-me", "me", myCards);
    const oppHand = makeHand("h-p1", "p1", []);

    const state = baseState({
      phase: "flop",
      hands: [myHand, oppHand],
      ranking: ["h-me", "h-p1"],
      acquireRequests: [
        { kind: "swap", initiatorId: "p1", initiatorHandId: "h-p1", recipientHandId: "h-me" },
      ],
      communityCards: [makeCard("2", "C"), makeCard("3", "D"), makeCard("Q", "S")],
    });

    const { traits } = randomTraits();
    traits.stubbornness = 0.95;
    const memo = newBotMemo();
    memo.prevAcquireRequests = [...state.acquireRequests];
    const msg = decideAction(state, "me", traits, memo, { nSims: 20 });
    // Bot must produce SOME message — accept, reject, propose, or ready.
    expect(msg).not.toBeNull();
    expect(["acceptChipMove", "rejectChipMove", "proposeChipMove", "ready", "ding", "fuckoff"])
      .toContain(msg!.type);
  });
});
