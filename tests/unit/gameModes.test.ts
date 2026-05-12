import { describe, expect, it, vi } from "vitest";
import { buildClientState, createInitialState } from "../../party/state";
import { start } from "../../party/handlers/lobby";
import { chooseDealCards, mulliganHand } from "../../party/handlers/dealChoice";
import { advancePhaseIfAllReady, flip, ready } from "../../party/handlers/lifecycle";
import { applyModePhaseEffects } from "../../party/handlers/phaseEffects";
import type { HandlerCtx } from "../../party/handlers/types";
import { dealCardsForMode, createDeckForMode } from "../../src/lib/gameModeDeal";
import {
  getGameModeDefinition,
  getMaxHandsPerPlayerForMode,
  listGameModes,
  visibleCommunityCardCount,
  visibleCommunityCardDetail,
  visibleCommunityCardDetails,
  visibleHoleCardCount,
  visibleHoleCardDetail,
  visibleHoleCardIndexes,
} from "../../src/lib/gameModes";
import {
  computeShowdownForMode,
  countInversionsForRanks,
} from "../../src/lib/gameModeShowdown";
import type { Card, Rank, Suit } from "../../src/lib/types";

function c(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

function rankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    T: 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  };
  return values[rank];
}

const unusedCtx = {} as HandlerCtx;

function phaseEffectState(modeId: string, phase: ReturnType<typeof createInitialState>["phase"]) {
  const state = createInitialState();
  state.modeId = modeId;
  state.phase = phase;
  state.players = [
    { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
    { id: "p2", connId: "c2", name: "B", isCreator: false, ready: false, connected: true },
  ];
  state.hands = [
    { id: "p1-0", playerId: "p1", cards: [c("A", "H"), c("K", "D")], flipped: false },
    { id: "p2-0", playerId: "p2", cards: [c("2", "C"), c("3", "S")], flipped: false },
  ];
  state.ranking = state.hands.map((hand) => hand.id);
  return state;
}

function advanceReadyState(state: ReturnType<typeof createInitialState>) {
  for (const player of state.players) {
    ready(state, player, { type: "ready", ready: true }, unusedCtx);
  }
}

describe("game modes", () => {
  it("exposes the default mode plus two hundred five variants", () => {
    const modes = listGameModes();
    expect(modes).toHaveLength(206);
    expect(modes[0].id).toBe("ding");
    expect(new Set(modes.map((mode) => mode.id)).size).toBe(modes.length);
  });

  it("deals every mode within its deck capacity", () => {
    for (const mode of listGameModes()) {
      const playerIds = ["p1", "p2"];
      const handsPerPlayer = getMaxHandsPerPlayerForMode(mode.id, playerIds.length);
      const result = dealCardsForMode(
        createDeckForMode(mode.id),
        playerIds,
        handsPerPlayer,
        mode.id
      );

      expect(result.hands).toHaveLength(playerIds.length * handsPerPlayer);
      expect(result.burnCards.length).toBeLessThanOrEqual(3);
      if (mode.deal.discardedCardsToCommunity) {
        expect(result.communityCards.length).toBeGreaterThanOrEqual(mode.deal.communityCards);
      } else {
        expect(result.communityCards).toHaveLength(mode.deal.communityCards);
      }
      for (const hand of result.hands) {
        const expectedHandCards = mode.deal.dealChoice?.selectionPhase
          ? mode.deal.dealChoice.dealtCards
          : mode.deal.dealChoice?.keepCards ?? mode.deal.keepCards ?? mode.deal.holeCards;
        expect(hand.cards).toHaveLength(expectedHandCards);
        expect(hand.cardCount).toBe(hand.cards.length);
        expect(hand.publicCards ?? []).toHaveLength(mode.deal.publicCards ?? 0);
      }
    }
  });

  it("implements draw three discard one as an automatic best-two-card keep", () => {
    const deck = [
      c("A", "H"),
      c("A", "D"),
      c("2", "C"),
      c("3", "C"),
      c("4", "C"),
      c("5", "C"),
      c("6", "C"),
      c("7", "C"),
      c("8", "C"),
    ];

    const result = dealCardsForMode(deck, ["p1"], 1, "draw-three");
    expect(result.hands[0].cards).toEqual([c("A", "H"), c("A", "D")]);
  });

  it("builds mode-specific deck families", () => {
    expect(createDeckForMode("short-deck")).toHaveLength(36);
    expect(createDeckForMode("stripped")).toHaveLength(28);
    expect(createDeckForMode("stripped").every((card) => rankValue(card.rank) >= 8)).toBe(true);
    expect(createDeckForMode("bottom-half")).toHaveLength(32);
    expect(createDeckForMode("bottom-half").every((card) => rankValue(card.rank) <= 9)).toBe(true);
    expect(createDeckForMode("double-deck")).toHaveLength(104);
    expect(createDeckForMode("triple-deck")).toHaveLength(156);
    expect(createDeckForMode("half-deck")).toHaveLength(26);
    expect(createDeckForMode("pinochle")).toHaveLength(48);
    expect(createDeckForMode("pinochle").every((card) => rankValue(card.rank) >= 9)).toBe(true);
    expect(createDeckForMode("tarot")).toHaveLength(54);
    expect(createDeckForMode("tarot").filter((card) => card.meta === "tarot")).toHaveLength(2);
    expect(createDeckForMode("suit-heavy")).toHaveLength(65);
    expect(createDeckForMode("suit-heavy").filter((card) => card.suit === "H")).toHaveLength(26);
    expect(createDeckForMode("suit-light")).toHaveLength(45);
    expect(createDeckForMode("suit-light").filter((card) => card.suit === "H")).toHaveLength(6);
    expect(createDeckForMode("jokers-in")).toHaveLength(54);
    expect(createDeckForMode("jokers-in").filter((card) => card.meta === "joker")).toHaveLength(2);
    expect(createDeckForMode("cursed-card").filter((card) => card.meta === "cursed")).toHaveLength(1);
    expect(createDeckForMode("blessed-card").filter((card) => card.meta === "blessed")).toHaveLength(1);
    expect(createDeckForMode("glitch-card").filter((card) => card.meta === "glitched")).toHaveLength(1);
    expect(createDeckForMode("two-suited-card").filter((card) => card.meta === "twoSuited")).toHaveLength(1);
    expect(createDeckForMode("marked-deck").filter((card) => card.meta === "marked")).toHaveLength(1);
    expect(createDeckForMode("trickster-card").filter((card) => card.meta === "trickster")).toHaveLength(1);
  });

  it("deals echo hands as pocket pairs", () => {
    const result = dealCardsForMode(createDeckForMode("echo"), ["p1", "p2", "p3"], 2, "echo");

    expect(result.hands).toHaveLength(6);
    for (const hand of result.hands) {
      expect(hand.cards).toHaveLength(2);
      expect(hand.cards[0].rank).toBe(hand.cards[1].rank);
      expect(hand.cards[0].suit).not.toBe(hand.cards[1].suit);
    }
    expect(new Set(result.hands.flatMap((hand) => hand.cards.map((card) => `${card.rank}${card.suit}`))).size).toBe(12);
  });

  it("deals mirror match hands with a shared first hole card", () => {
    const result = dealCardsForMode(
      createDeckForMode("mirror-match"),
      ["p1", "p2", "p3"],
      2,
      "mirror-match"
    );

    expect(result.hands).toHaveLength(6);
    const shared = result.hands[0].cards[0];
    for (const hand of result.hands) {
      expect(hand.cards).toHaveLength(2);
      expect(hand.cards[0]).toEqual(shared);
    }
    expect(result.communityCards).not.toContainEqual(shared);
    expect(result.remainingDeck).not.toContainEqual(shared);
  });

  it("deals rainbow hole hands with different suits", () => {
    const result = dealCardsForMode(
      createDeckForMode("rainbow-hole"),
      ["p1", "p2", "p3"],
      2,
      "rainbow-hole"
    );

    expect(result.hands).toHaveLength(6);
    for (const hand of result.hands) {
      expect(hand.cards).toHaveLength(2);
      expect(hand.cards[0].suit).not.toBe(hand.cards[1].suit);
    }
    expect(new Set(result.hands.flatMap((hand) => hand.cards.map((card) => `${card.rank}${card.suit}`))).size).toBe(12);
  });

  it("deals suited hole hands with matching suits", () => {
    const result = dealCardsForMode(
      createDeckForMode("suited-hole"),
      ["p1", "p2", "p3"],
      2,
      "suited-hole"
    );

    expect(result.hands).toHaveLength(6);
    for (const hand of result.hands) {
      expect(hand.cards).toHaveLength(2);
      expect(hand.cards[0].suit).toBe(hand.cards[1].suit);
    }
    expect(new Set(result.hands.flatMap((hand) => hand.cards.map((card) => `${card.rank}${card.suit}`))).size).toBe(12);
  });

  it("deals connected hole hands with adjacent ranks", () => {
    const rankValue: Record<Rank, number> = {
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      T: 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
    };
    const result = dealCardsForMode(
      createDeckForMode("connected-hole"),
      ["p1", "p2", "p3"],
      2,
      "connected-hole"
    );

    expect(result.hands).toHaveLength(6);
    for (const hand of result.hands) {
      expect(hand.cards).toHaveLength(2);
      expect(Math.abs(rankValue[hand.cards[0].rank] - rankValue[hand.cards[1].rank])).toBe(1);
    }
    expect(new Set(result.hands.flatMap((hand) => hand.cards.map((card) => `${card.rank}${card.suit}`))).size).toBe(12);
  });

  it("deals gapped hole hands with a two-rank gap", () => {
    const rankValue: Record<Rank, number> = {
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      T: 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
    };
    const result = dealCardsForMode(
      createDeckForMode("gapped-hole"),
      ["p1", "p2", "p3"],
      2,
      "gapped-hole"
    );

    expect(result.hands).toHaveLength(6);
    for (const hand of result.hands) {
      expect(hand.cards).toHaveLength(2);
      expect(Math.abs(rankValue[hand.cards[0].rank] - rankValue[hand.cards[1].rank])).toBe(2);
    }
    expect(new Set(result.hands.flatMap((hand) => hand.cards.map((card) => `${card.rank}${card.suit}`))).size).toBe(12);
  });

  it("deals polar hole hands with one high and one low rank", () => {
    const rankValue: Record<Rank, number> = {
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      T: 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
    };
    const result = dealCardsForMode(
      createDeckForMode("polar-hole"),
      ["p1", "p2", "p3"],
      2,
      "polar-hole"
    );

    expect(result.hands).toHaveLength(6);
    for (const hand of result.hands) {
      expect(hand.cards).toHaveLength(2);
      expect(hand.cards.some((card) => rankValue[card.rank] >= 8)).toBe(true);
      expect(hand.cards.some((card) => rankValue[card.rank] <= 7)).toBe(true);
    }
    expect(new Set(result.hands.flatMap((hand) => hand.cards.map((card) => `${card.rank}${card.suit}`))).size).toBe(12);
  });

  it("deals twin spark hands with both cards in the low rank band", () => {
    const rankValue: Record<Rank, number> = {
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      T: 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
    };
    const result = dealCardsForMode(
      createDeckForMode("twin-spark"),
      ["p1", "p2", "p3"],
      2,
      "twin-spark"
    );

    expect(result.hands).toHaveLength(6);
    for (const hand of result.hands) {
      expect(hand.cards).toHaveLength(2);
      expect(hand.cards.every((card) => rankValue[card.rank] <= 7)).toBe(true);
    }
    expect(new Set(result.hands.flatMap((hand) => hand.cards.map((card) => `${card.rank}${card.suit}`))).size).toBe(12);
  });

  it("deals royal spark hands with both cards in the high rank band", () => {
    const rankValue: Record<Rank, number> = {
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      T: 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
    };
    const result = dealCardsForMode(
      createDeckForMode("royal-spark"),
      ["p1", "p2", "p3"],
      2,
      "royal-spark"
    );

    expect(result.hands).toHaveLength(6);
    for (const hand of result.hands) {
      expect(hand.cards).toHaveLength(2);
      expect(hand.cards.every((card) => rankValue[card.rank] >= 8)).toBe(true);
    }
    expect(new Set(result.hands.flatMap((hand) => hand.cards.map((card) => `${card.rank}${card.suit}`))).size).toBe(12);
  });

  it("exposes each brightest-out hand's highest hole card", () => {
    const deck = [
      c("3", "H"),
      c("K", "S"),
      c("A", "D"),
      c("8", "C"),
      c("2", "H"),
      c("4", "H"),
      c("5", "H"),
      c("6", "H"),
      c("7", "H"),
    ];

    const result = dealCardsForMode(deck, ["p1", "p2"], 1, "brightest-out");

    expect(result.hands[0].cards).toEqual([c("3", "H"), c("A", "D")]);
    expect(result.hands[0].publicCards).toEqual([c("A", "D")]);
    expect(result.hands[1].cards).toEqual([c("K", "S"), c("8", "C")]);
    expect(result.hands[1].publicCards).toEqual([c("K", "S")]);
  });

  it("exposes each darkest-out hand's lowest hole card", () => {
    const deck = [
      c("3", "H"),
      c("K", "S"),
      c("A", "D"),
      c("8", "C"),
      c("2", "H"),
      c("4", "H"),
      c("5", "H"),
      c("6", "H"),
      c("7", "H"),
    ];

    const result = dealCardsForMode(deck, ["p1", "p2"], 1, "darkest-out");

    expect(result.hands[0].cards).toEqual([c("3", "H"), c("A", "D")]);
    expect(result.hands[0].publicCards).toEqual([c("3", "H")]);
    expect(result.hands[1].cards).toEqual([c("K", "S"), c("8", "C")]);
    expect(result.hands[1].publicCards).toEqual([c("8", "C")]);
  });

  it("masks private cards while preserving public cards and card counts", () => {
    const state = createInitialState();
    state.modeId = "one-up";
    state.phase = "preflop";
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
      { id: "p2", connId: "c2", name: "B", isCreator: false, ready: false, connected: true },
    ];
    const dealt = dealCardsForMode(createDeckForMode("one-up"), ["p1", "p2"], 1, "one-up");
    state.hands = dealt.hands;
    state.ranking = Array(dealt.hands.length).fill(null);
    state.allCommunityCards = dealt.communityCards;

    const p1View = buildClientState(state, "p1");
    const p2Hand = p1View.hands.find((hand) => hand.playerId === "p2")!;
    expect(p2Hand.cards).toHaveLength(0);
    expect(p2Hand.cardCount).toBe(2);
    expect(p2Hand.publicCards).toHaveLength(1);
  });

  it("makes late-light hole cards public only from river onward", () => {
    const state = createInitialState();
    state.modeId = "late-light";
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
      { id: "p2", connId: "c2", name: "B", isCreator: false, ready: false, connected: true },
    ];
    const dealt = dealCardsForMode(createDeckForMode("late-light"), ["p1", "p2"], 1, "late-light");
    state.hands = dealt.hands;
    state.ranking = Array(dealt.hands.length).fill(null);
    state.allCommunityCards = dealt.communityCards;

    for (const phase of ["preflop", "flop", "turn"] as const) {
      state.phase = phase;
      const p2Hand = buildClientState(state, "p1").hands.find((hand) => hand.playerId === "p2")!;
      expect(p2Hand.cards).toHaveLength(0);
      expect(p2Hand.cardCount).toBe(2);
      expect(p2Hand.publicCards).toHaveLength(0);
    }

    state.phase = "river";
    const opponentAtRiver = buildClientState(state, "p1").hands.find((hand) => hand.playerId === "p2")!;
    expect(opponentAtRiver.cards).toHaveLength(0);
    expect(opponentAtRiver.cardCount).toBe(2);
    expect(opponentAtRiver.publicCards).toEqual(state.hands.find((hand) => hand.playerId === "p2")!.cards);

    const ownHandAtRiver = buildClientState(state, "p1").hands.find((hand) => hand.playerId === "p1")!;
    expect(ownHandAtRiver.cards).toHaveLength(2);
    expect(ownHandAtRiver.publicCards).toHaveLength(2);
  });

  it("shows only opponent hole-card suits in suit-showing", () => {
    const state = createInitialState();
    state.modeId = "suit-showing";
    state.phase = "preflop";
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
      { id: "p2", connId: "c2", name: "B", isCreator: false, ready: false, connected: true },
    ];
    state.hands = [
      { id: "p1-0", playerId: "p1", cards: [c("A", "H"), c("K", "D")], cardCount: 2, publicCards: [], flipped: false },
      { id: "p2-0", playerId: "p2", cards: [c("Q", "C"), c("J", "S")], cardCount: 2, publicCards: [], flipped: false },
    ];
    state.ranking = Array(state.hands.length).fill(null);

    const p2Hand = buildClientState(state, "p1").hands.find((hand) => hand.playerId === "p2")!;
    expect(p2Hand.cards).toHaveLength(0);
    expect(p2Hand.publicCards).toHaveLength(0);
    expect(p2Hand.publicCardHints).toEqual([{ suit: "C" }, { suit: "S" }]);

    const ownHand = buildClientState(state, "p1").hands.find((hand) => hand.playerId === "p1")!;
    expect(ownHand.cards).toEqual([c("A", "H"), c("K", "D")]);
    expect(ownHand.publicCardHints).toEqual([{ suit: "H" }, { suit: "D" }]);
  });

  it("shows only opponent hole-card ranks in rank-showing", () => {
    const state = createInitialState();
    state.modeId = "rank-showing";
    state.phase = "preflop";
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
      { id: "p2", connId: "c2", name: "B", isCreator: false, ready: false, connected: true },
    ];
    state.hands = [
      { id: "p1-0", playerId: "p1", cards: [c("A", "H"), c("K", "D")], cardCount: 2, publicCards: [], flipped: false },
      { id: "p2-0", playerId: "p2", cards: [c("Q", "C"), c("J", "S")], cardCount: 2, publicCards: [], flipped: false },
    ];
    state.ranking = Array(state.hands.length).fill(null);

    const p2Hand = buildClientState(state, "p1").hands.find((hand) => hand.playerId === "p2")!;
    expect(p2Hand.cards).toHaveLength(0);
    expect(p2Hand.publicCards).toHaveLength(0);
    expect(p2Hand.publicCardHints).toEqual([{ rank: "Q" }, { rank: "J" }]);

    const ownHand = buildClientState(state, "p1").hands.find((hand) => hand.playerId === "p1")!;
    expect(ownHand.cards).toEqual([c("A", "H"), c("K", "D")]);
    expect(ownHand.publicCardHints).toEqual([{ rank: "A" }, { rank: "K" }]);
  });

  it("shows only opponent hole-card colors in color-showing", () => {
    const state = createInitialState();
    state.modeId = "color-showing";
    state.phase = "preflop";
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
      { id: "p2", connId: "c2", name: "B", isCreator: false, ready: false, connected: true },
    ];
    state.hands = [
      { id: "p1-0", playerId: "p1", cards: [c("A", "H"), c("K", "S")], cardCount: 2, publicCards: [], flipped: false },
      { id: "p2-0", playerId: "p2", cards: [c("Q", "D"), c("J", "C")], cardCount: 2, publicCards: [], flipped: false },
    ];
    state.ranking = Array(state.hands.length).fill(null);

    const p2Hand = buildClientState(state, "p1").hands.find((hand) => hand.playerId === "p2")!;
    expect(p2Hand.cards).toHaveLength(0);
    expect(p2Hand.publicCards).toHaveLength(0);
    expect(p2Hand.publicCardHints).toEqual([{ color: "red" }, { color: "black" }]);

    const ownHand = buildClientState(state, "p1").hands.find((hand) => hand.playerId === "p1")!;
    expect(ownHand.cards).toEqual([c("A", "H"), c("K", "S")]);
    expect(ownHand.publicCardHints).toEqual([{ color: "red" }, { color: "black" }]);
  });

  it("shows only community suits in eclipse-suit until reveal", () => {
    const state = createInitialState();
    state.modeId = "eclipse-suit";
    state.phase = "flop";
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
    ];
    state.allCommunityCards = [c("A", "H"), c("K", "D"), c("Q", "S"), c("J", "C"), c("T", "H")];

    const flopView = buildClientState(state, "p1");
    expect(flopView.communityCards).toEqual([{ suit: "H" }, { suit: "D" }, { suit: "S" }]);

    state.phase = "reveal";
    const revealView = buildClientState(state, "p1");
    expect(revealView.communityCards).toEqual(state.allCommunityCards);
  });

  it("shows only community ranks in eclipse-rank until reveal", () => {
    const state = createInitialState();
    state.modeId = "eclipse-rank";
    state.phase = "turn";
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
    ];
    state.allCommunityCards = [c("A", "H"), c("K", "D"), c("Q", "S"), c("J", "C"), c("T", "H")];

    const view = buildClientState(state, "p1");
    expect(view.communityCards).toEqual([{ rank: "A" }, { rank: "K" }, { rank: "Q" }, { rank: "J" }]);
  });

  it("shows only community colors in eclipse-color until reveal", () => {
    const state = createInitialState();
    state.modeId = "eclipse-color";
    state.phase = "river";
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
    ];
    state.allCommunityCards = [c("A", "H"), c("K", "D"), c("Q", "S"), c("J", "C"), c("T", "H")];

    const view = buildClientState(state, "p1");
    expect(view.communityCards).toEqual([
      { color: "red" },
      { color: "red" },
      { color: "black" },
      { color: "black" },
      { color: "red" },
    ]);
  });

  it("shows only the river-card suit in dark-river until reveal", () => {
    const state = createInitialState();
    state.modeId = "dark-river";
    state.phase = "river";
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
    ];
    state.allCommunityCards = [c("A", "H"), c("K", "D"), c("Q", "S"), c("J", "C"), c("T", "H")];

    const riverView = buildClientState(state, "p1");
    expect(riverView.communityCards).toEqual([
      c("A", "H"),
      c("K", "D"),
      c("Q", "S"),
      c("J", "C"),
      { suit: "H" },
    ]);

    state.phase = "reveal";
    const revealView = buildClientState(state, "p1");
    expect(revealView.communityCards).toEqual(state.allCommunityCards);
  });

  it("masks deal-choice card indexes for non-owners while keeping submitted status", () => {
    const state = createInitialState();
    state.modeId = "players-choice";
    state.phase = "dealChoice";
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
      { id: "p2", connId: "c2", name: "B", isCreator: false, ready: false, connected: true },
    ];
    const dealt = dealCardsForMode(createDeckForMode("players-choice"), ["p1", "p2"], 1, "players-choice");
    state.hands = dealt.hands;
    state.ranking = Array(dealt.hands.length).fill(null);
    state.dealChoices = Object.fromEntries(
      dealt.hands.map((hand) => [
        hand.id,
        { keepCards: 2, selectedIndexes: [0, 2], submitted: true },
      ])
    );

    const p1View = buildClientState(state, "p1");
    expect(p1View.dealChoices["p1-0"].selectedIndexes).toEqual([0, 2]);
    expect(p1View.dealChoices["p2-0"].selectedIndexes).toBeNull();
    expect(p1View.dealChoices["p2-0"].submitted).toBe(true);
  });

  it("allows one mulligan redraw before locking deal-choice cards", () => {
    const state = createInitialState();
    state.modeId = "mulligan";
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
      { id: "p2", connId: "c2", name: "B", isCreator: false, ready: false, connected: true },
    ];

    expect(start(state, state.players[0], { type: "start" }, unusedCtx).kind).toBe("broadcast");
    expect(state.phase).toBe("dealChoice");
    const originalCards = state.hands[0].cards;
    const deckBefore = state.dealDeck.length;

    expect(
      mulliganHand(state, state.players[0], { type: "mulliganHand", handId: "p1-0" }, unusedCtx).kind
    ).toBe("broadcast");
    expect(state.hands[0].cards).toHaveLength(2);
    expect(state.hands[0].cards).not.toBe(originalCards);
    expect(state.dealChoices["p1-0"].mulliganUsed).toBe(true);
    expect(state.dealDeck).toHaveLength(deckBefore - 2);

    const redrawnCards = state.hands[0].cards;
    expect(
      mulliganHand(state, state.players[0], { type: "mulliganHand", handId: "p1-0" }, unusedCtx).kind
    ).toBe("ignore");
    expect(state.hands[0].cards).toBe(redrawnCards);
  });

  it("trades selected deal cards left before preflop", () => {
    const state = createInitialState();
    state.modeId = "trade-up";
    state.phase = "dealChoice";
    state.handsPerPlayer = 1;
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
      { id: "p2", connId: "c2", name: "B", isCreator: false, ready: false, connected: true },
      { id: "p3", connId: "c3", name: "C", isCreator: false, ready: false, connected: true },
    ];
    state.hands = [
      { id: "p1-0", playerId: "p1", cards: [c("A", "H"), c("K", "H")], cardCount: 2, publicCards: [], flipped: false },
      { id: "p2-0", playerId: "p2", cards: [c("Q", "D"), c("J", "D")], cardCount: 2, publicCards: [], flipped: false },
      { id: "p3-0", playerId: "p3", cards: [c("9", "C"), c("8", "C")], cardCount: 2, publicCards: [], flipped: false },
    ];
    state.ranking = Array(state.hands.length).fill(null);
    state.dealChoices = Object.fromEntries(
      state.hands.map((hand) => [
        hand.id,
        { keepCards: 1, selectedIndexes: null, submitted: false, tradeUp: true },
      ])
    );

    expect(
      chooseDealCards(state, state.players[0], { type: "chooseDealCards", handId: "p1-0", indexes: [0] }, unusedCtx).kind
    ).toBe("broadcast");
    expect(
      chooseDealCards(state, state.players[1], { type: "chooseDealCards", handId: "p2-0", indexes: [1] }, unusedCtx).kind
    ).toBe("broadcast");
    expect(
      chooseDealCards(state, state.players[2], { type: "chooseDealCards", handId: "p3-0", indexes: [0] }, unusedCtx).kind
    ).toBe("broadcast");

    expect(state.phase).toBe("preflop");
    expect(state.hands[0].cards).toEqual([c("9", "C"), c("K", "H")]);
    expect(state.hands[1].cards).toEqual([c("Q", "D"), c("A", "H")]);
    expect(state.hands[2].cards).toEqual([c("J", "D"), c("8", "C")]);
  });

  it("inherits right-neighbor discards before preflop", () => {
    const state = createInitialState();
    state.modeId = "inheritance";
    state.phase = "dealChoice";
    state.handsPerPlayer = 1;
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
      { id: "p2", connId: "c2", name: "B", isCreator: false, ready: false, connected: true },
      { id: "p3", connId: "c3", name: "C", isCreator: false, ready: false, connected: true },
    ];
    state.hands = [
      { id: "p1-0", playerId: "p1", cards: [c("A", "H"), c("K", "H")], cardCount: 2, publicCards: [], flipped: false },
      { id: "p2-0", playerId: "p2", cards: [c("Q", "D"), c("J", "D")], cardCount: 2, publicCards: [], flipped: false },
      { id: "p3-0", playerId: "p3", cards: [c("9", "C"), c("8", "C")], cardCount: 2, publicCards: [], flipped: false },
    ];
    state.ranking = Array(state.hands.length).fill(null);
    state.dealChoices = Object.fromEntries(
      state.hands.map((hand) => [
        hand.id,
        { keepCards: 1, selectedIndexes: null, submitted: false, inheritance: true },
      ])
    );

    expect(
      chooseDealCards(state, state.players[0], { type: "chooseDealCards", handId: "p1-0", indexes: [0] }, unusedCtx).kind
    ).toBe("broadcast");
    expect(
      chooseDealCards(state, state.players[1], { type: "chooseDealCards", handId: "p2-0", indexes: [1] }, unusedCtx).kind
    ).toBe("broadcast");
    expect(
      chooseDealCards(state, state.players[2], { type: "chooseDealCards", handId: "p3-0", indexes: [0] }, unusedCtx).kind
    ).toBe("broadcast");

    expect(state.phase).toBe("preflop");
    expect(state.hands[0].cards).toEqual([c("A", "H"), c("8", "C")]);
    expect(state.hands[1].cards).toEqual([c("J", "D"), c("K", "H")]);
    expect(state.hands[2].cards).toEqual([c("9", "C"), c("Q", "D")]);
  });

  it("applies mode-specific community-card schedules", () => {
    expect(visibleCommunityCardCount("flash-flop", "preflop")).toBe(3);
    expect(visibleCommunityCardCount("blackout", "turn")).toBe(0);
    expect(visibleCommunityCardCount("double-river", "turn")).toBe(4);
    expect(visibleCommunityCardCount("double-river", "river")).toBe(6);
    expect(visibleCommunityCardCount("big-sky", "river")).toBe(7);
    expect(visibleCommunityCardCount("tiny-board", "flop")).toBe(3);
    expect(visibleCommunityCardCount("tiny-board", "river")).toBe(3);
    expect(visibleCommunityCardCount("mini-board", "turn")).toBe(4);
    expect(visibleCommunityCardCount("mini-board", "river")).toBe(4);
    expect(visibleCommunityCardCount("behemoth", "turn")).toBe(4);
    expect(visibleCommunityCardCount("behemoth", "river")).toBe(9);
    expect(visibleCommunityCardCount("two-boards", "flop")).toBe(6);
    expect(visibleCommunityCardCount("two-boards", "turn")).toBe(8);
    expect(visibleCommunityCardCount("two-boards", "river")).toBe(10);
    expect(visibleCommunityCardCount("split-board", "flop")).toBe(6);
    expect(visibleCommunityCardCount("split-board", "river")).toBe(6);
    expect(visibleCommunityCardCount("tower", "turn")).toBe(3);
    expect(visibleCommunityCardCount("tower", "river")).toBe(5);
    expect(visibleCommunityCardCount("cross", "flop")).toBe(3);
    expect(visibleCommunityCardCount("cross", "river")).toBe(5);
    expect(visibleCommunityCardCount("l-board", "flop")).toBe(4);
    expect(visibleCommunityCardCount("l-board", "river")).toBe(7);
    expect(visibleCommunityCardCount("flash-river", "preflop")).toBe(5);
    expect(visibleCommunityCardCount("crawl", "preflop")).toBe(1);
    expect(visibleCommunityCardCount("crawl", "turn")).toBe(3);
    expect(visibleCommunityCardDetail("eclipse-suit", "river")).toBe("suit");
    expect(visibleCommunityCardDetail("eclipse-rank", "river")).toBe("rank");
    expect(visibleCommunityCardDetail("eclipse-color", "river")).toBe("color");
    expect(visibleCommunityCardDetail("eclipse-color", "reveal")).toBe("full");
    expect(visibleCommunityCardDetails("dark-river", "river")).toEqual({ 4: "suit" });
    expect(visibleCommunityCardDetails("dark-river", "reveal")).toEqual({});
    expect(visibleCommunityCardCount("dark-flop", "flop")).toBe(0);
    expect(visibleCommunityCardCount("dark-flop", "turn")).toBe(4);
    expect(visibleCommunityCardCount("hidden-turn", "turn")).toBe(3);
    expect(visibleCommunityCardCount("hidden-turn", "river")).toBe(5);
    expect(visibleCommunityCardCount("confirm-flop", "flop")).toBe(0);
    expect(visibleCommunityCardCount("confirm-flop", "turn")).toBe(4);
    expect(visibleCommunityCardCount("two-step-river", "river")).toBe(5);
    expect(visibleCommunityCardCount("two-step-river", "reveal")).toBe(6);
    expect(visibleCommunityCardCount("mirror-board", "river")).toBe(10);
    expect(visibleCommunityCardCount("mirror-board", "reveal")).toBe(10);
    expect(visibleCommunityCardCount("vault-card", "river")).toBe(5);
    expect(visibleCommunityCardCount("vault-card", "reveal")).toBe(6);
    expect(visibleCommunityCardCount("phoenix-board", "river")).toBe(5);
    expect(visibleCommunityCardCount("phoenix-board", "reveal")).toBe(22);
    expect(visibleCommunityCardDetails("cascade", "river")).toEqual({
      0: "hidden",
      1: "hidden",
      2: "hidden",
    });
    expect(visibleHoleCardCount("late-light", "turn")).toBe(0);
    expect(visibleHoleCardCount("late-light", "river")).toBe(2);
    expect(visibleHoleCardCount("suit-showing", "preflop")).toBe(2);
    expect(visibleHoleCardDetail("suit-showing")).toBe("suit");
    expect(visibleHoleCardCount("rank-showing", "preflop")).toBe(2);
    expect(visibleHoleCardDetail("rank-showing")).toBe("rank");
    expect(visibleHoleCardCount("color-showing", "preflop")).toBe(2);
    expect(visibleHoleCardDetail("color-showing")).toBe("color");
    expect(visibleHoleCardCount("whisper-chain", "preflop")).toBe(1);
    expect(visibleHoleCardCount("periscope", "river")).toBe(1);
    expect(visibleHoleCardCount("spotlight-rotation", "flop")).toBe(2);
    expect(visibleHoleCardCount("half-lit-holes", "flop")).toBe(1);
    expect(visibleHoleCardIndexes("half-lit-holes", "flop")).toEqual([1]);
    expect(visibleHoleCardIndexes("half-lit-holes", "turn")).toEqual([0]);
    expect(visibleHoleCardCount("group-mind", "river")).toBe(1);
    expect(visibleHoleCardCount("tag-team", "preflop")).toBe(2);
    expect(visibleHoleCardDetail("smoke-hole", "preflop")).toBe("suit");
    expect(visibleHoleCardDetail("smoke-hole", "turn")).toBe("full");
    expect(visibleHoleCardCount("communal-glance", "preflop")).toBe(1);
    expect(visibleHoleCardCount("late-hand-reveal", "turn")).toBe(0);
    expect(visibleHoleCardCount("late-hand-reveal", "river")).toBe(2);
    expect(visibleCommunityCardCount("avalanche", "flop")).toBe(3);
    expect(visibleCommunityCardCount("avalanche", "turn")).toBe(5);
    expect(visibleCommunityCardCount("avalanche", "river")).toBe(7);
    expect(visibleCommunityCardDetail("fog-bank", "flop")).toBe("color");
    expect(visibleCommunityCardDetail("fog-bank", "reveal")).toBe("full");
    expect(visibleCommunityCardCount("quantum-flop", "flop")).toBe(9);
    expect(visibleCommunityCardCount("card-multiverse", "river")).toBe(20);
    expect(visibleCommunityCardDetail("photographic-negative", "turn")).toBe("color");
    expect(visibleCommunityCardDetail("synesthesia", "flop")).toBe("rank");
    expect(visibleCommunityCardDetail("synesthesia", "turn")).toBe("suit");
    expect(visibleCommunityCardDetail("synesthesia", "river")).toBe("color");
    expect(visibleCommunityCardCount("anti-memory", "preflop")).toBe(5);
    expect(visibleCommunityCardCount("anti-memory", "river")).toBe(0);
    expect(visibleCommunityCardCount("photographic-memory", "flop")).toBe(3);
    expect(visibleCommunityCardCount("photographic-memory", "turn")).toBe(0);
    expect(visibleCommunityCardDetails("memory-hole", "turn")).toEqual({ 0: "hidden" });
    expect(visibleCommunityCardCount("recursive-board", "turn")).toBe(10);
    expect(visibleCommunityCardCount("twin-universes", "turn")).toBe(10);
    expect(visibleCommunityCardCount("mirror-world", "river")).toBe(10);
    expect(visibleCommunityCardCount("card-memorial", "reveal")).toBe(6);
    expect(visibleCommunityCardCount("card-decoy", "river")).toBe(6);
  });

  it("surfaces visibility-mode information payloads", () => {
    const state = createInitialState();
    state.phase = "turn";
    state.allCommunityCards = [c("A", "H"), c("K", "D"), c("Q", "S"), c("J", "C"), c("T", "H")];
    state.dealDeck = [c("2", "H"), c("3", "D"), c("4", "C"), c("5", "S")];
    state.burnCards = [c("6", "H"), c("7", "D"), c("8", "C")];

    state.modeId = "card-counters";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toBe("4 cards remain");
    state.modeId = "suit-census";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toBe("H1 D1 C1 S1");
    state.modeId = "rank-census";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toContain("21");
    state.modeId = "burn-reveal";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toBe("6H 7D 8C");
    state.modeId = "hint-card";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toBe("2H");

    state.phase = "flop";
    state.modeId = "lying-mirror";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toContain("Fake flop");
    state.modeId = "decoy";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("decoy");
    state.modeId = "whisper-chain";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("whisper-chain");
    state.phase = "river";
    state.modeId = "periscope";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("periscope");
    state.modeId = "spotlight-rotation";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("spotlight");

    state.modeId = "heat-map";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toContain("low-skewed");
    state.modeId = "suit-heat";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toContain("C leads");
    state.modeId = "sample-draw";
    expect(buildClientState(state, "p1").modeInfo).toEqual([{ id: "sample-draw", label: "Sample", value: "2H 3D 4C" }]);
    state.modeId = "tell";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toBe("Board card 1 is AH");
    state.hands = [
      { id: "p1-0", playerId: "p1", cards: [c("A", "H"), c("K", "D")], flipped: false },
    ];
    state.modeId = "suit-whisper";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toContain("does not hold C");
    state.modeId = "rank-whisper";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toContain("does not hold 2");
    state.modeId = "phantom-card";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toBe("2 is not in at least one hand");
    state.modeId = "late-hand-reveal";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("late-hand-reveal");
    state.modeId = "mirror-hole";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("mirror-hole");
    state.modeId = "past-trace";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("past-trace");
    state.modeId = "earthquake";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("earthquake");
    state.modeId = "flood";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toContain("wild");
    state.modeId = "quantum-shuffle";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("quantum-shuffle");
    state.modeId = "schrodingers-hole";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("schrodingers-hole");
    state.modeId = "card-multiverse";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toContain("Four board outcomes");
    state.modeId = "reality-tear";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("reality-tear");
    state.modeId = "synesthesia";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("synesthesia");
    state.modeId = "card-theatre";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("card-theatre");
    state.modeId = "card-conscience";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toContain("is unused");
    state.modeId = "reality-skip";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("reality-skip");
    state.modeId = "card-singularity";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("card-singularity");
    state.modeId = "card-halo";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toContain("synthetic pair");
    state.modeId = "card-drift";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("card-drift");
    state.modeId = "hex-card";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toContain("bottom");
    state.modeId = "card-cipher";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("card-cipher");
    state.modeId = "card-decoy";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.value).toContain("does not score");
    state.modeId = "cell-division";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("cell-division");
    state.modeId = "card-whisper";
    state.phase = "river";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("card-whisper");
    state.modeId = "pandemonium";
    expect(buildClientState(state, "p1").modeInfo?.[0]?.id).toBe("pandemonium");
  });

  it("deals possible card identities and resolves the strongest identity at showdown", () => {
    const dealt = dealCardsForMode(createDeckForMode("schrodingers-hole"), ["p1", "p2"], 1, "schrodingers-hole");
    expect(dealt.hands[0].cards[0].possibleIdentities).toHaveLength(2);
    expect(dealt.communityCards[0].possibleIdentities).toBeUndefined();

    const hands = [
      {
        id: "cloud",
        playerId: "p1",
        cards: [
          { rank: "2", suit: "H", possibleIdentities: [c("2", "H"), c("A", "H")] },
          c("3", "H"),
        ],
        cardCount: 2,
        publicCards: [],
        flipped: false,
      },
      { id: "plain", playerId: "p2", cards: [c("K", "C"), c("K", "D")], cardCount: 2, publicCards: [], flipped: false },
    ];
    const board = [c("4", "H"), c("5", "H"), c("6", "H"), c("9", "C"), c("T", "D")];
    const showdown = computeShowdownForMode("schrodingers-hole", hands, board);
    expect(showdown.trueRanking[0]).toBe("cloud");
    expect(showdown.madeHandNames.cloud).toContain("Identity");

    const boardDeal = dealCardsForMode(createDeckForMode("probability-cloud"), ["p1", "p2"], 1, "probability-cloud");
    expect(boardDeal.communityCards[0].possibleIdentities).toHaveLength(2);
  });

  it("applies mid-game event phase effects", () => {
    const state = createInitialState();
    state.modeId = "earthquake";
    state.allCommunityCards = [c("A", "H"), c("K", "D"), c("Q", "S"), c("J", "C"), c("T", "H")];
    applyModePhaseEffects(state, "turn");
    expect(state.allCommunityCards.map((card) => card.rank)).toEqual(["K", "Q", "J", "T", "A"]);

    state.modeId = "tornado";
    state.hands = [
      { id: "p1-0", playerId: "p1", cards: [c("A", "H"), c("K", "D")], flipped: false },
      { id: "p2-0", playerId: "p2", cards: [c("2", "C"), c("3", "S")], flipped: false },
    ];
    applyModePhaseEffects(state, "turn");
    expect(state.hands[0].cards).toEqual([c("2", "C"), c("3", "S")]);
    expect(state.hands[1].cards).toEqual([c("A", "H"), c("K", "D")]);

    state.modeId = "drought";
    applyModePhaseEffects(state, "turn");
    expect(state.hands[1].cards).toEqual([c("A", "H")]);
    expect(state.allCommunityCards.some((card) => card.rank === "K" || card.rank === "Q" || card.rank === "J")).toBe(false);

    state.modeId = "heat-wave";
    state.hands[0].cards = [c("J", "C"), c("Q", "S")];
    applyModePhaseEffects(state, "turn");
    expect(state.hands[0].cards.map((card) => card.rank)).toEqual(["A", "A"]);

    state.modeId = "cold-snap";
    state.hands[0].cards = [c("J", "C"), c("Q", "S")];
    applyModePhaseEffects(state, "turn");
    expect(state.hands[0].cards.map((card) => card.rank)).toEqual(["2", "2"]);

    state.modeId = "quantum-shuffle";
    state.hands = [
      { id: "p1-0", playerId: "p1", cards: [c("A", "H"), c("K", "D")], flipped: false },
      { id: "p2-0", playerId: "p2", cards: [c("2", "C"), c("3", "S")], flipped: false },
    ];
    applyModePhaseEffects(state, "turn");
    expect(state.hands[0].cards).toEqual([c("K", "D"), c("2", "C")]);
    expect(state.hands[1].cards).toEqual([c("3", "S"), c("A", "H")]);

    state.modeId = "identity-crisis";
    state.hands = [
      { id: "p1-0", playerId: "p1", cards: [c("A", "H"), c("K", "D")], flipped: false },
    ];
    state.allCommunityCards = [c("2", "C"), c("3", "S"), c("4", "H")];
    applyModePhaseEffects(state, "turn");
    expect(state.hands[0].cards[0]).toEqual(c("2", "C"));
    expect(state.allCommunityCards[0]).toEqual(c("A", "H"));

    state.modeId = "shapeshifter";
    state.allCommunityCards = [c("2", "C"), c("3", "S"), c("4", "H")];
    applyModePhaseEffects(state, "flop");
    expect(state.allCommunityCards[0]).toEqual(c("3", "C"));

    state.modeId = "card-festival";
    state.allCommunityCards = [c("2", "C"), c("3", "S"), c("4", "H")];
    applyModePhaseEffects(state, "river");
    expect(state.allCommunityCards[0]).toEqual(c("A", "C"));

    state.modeId = "time-echo";
    state.allCommunityCards = [c("A", "H"), c("K", "D"), c("Q", "S"), c("J", "C"), c("T", "H")];
    applyModePhaseEffects(state, "river");
    expect(state.allCommunityCards).toEqual([c("A", "H"), c("K", "D"), c("Q", "S")]);

    state.modeId = "reverse-universe";
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
      { id: "p2", connId: "c2", name: "B", isCreator: false, ready: false, connected: true },
    ];
    state.allCommunityCards = [c("A", "H"), c("K", "D"), c("Q", "S")];
    applyModePhaseEffects(state, "river");
    expect(state.allCommunityCards).toEqual([c("Q", "S"), c("K", "D"), c("A", "H")]);
    expect(state.players.map((player) => player.id)).toEqual(["p2", "p1"]);

    state.modeId = "card-singularity";
    state.hands = [
      { id: "p1-0", playerId: "p1", cards: [c("2", "H"), c("A", "D")], flipped: false },
    ];
    applyModePhaseEffects(state, "turn");
    expect(state.hands[0].cards).toEqual([c("8", "H")]);

    state.modeId = "card-convergence";
    state.hands[0].cards = [c("7", "H"), c("K", "D")];
    state.allCommunityCards = [c("7", "C")];
    applyModePhaseEffects(state, "river");
    expect(state.hands[0].cards[0]).toEqual(c("A", "H"));
    expect(state.allCommunityCards[0]).toEqual(c("A", "C"));

    state.modeId = "card-eclipse-total";
    state.hands[0].cards = [c("A", "H"), c("K", "D")];
    state.allCommunityCards = [c("A", "C"), c("Q", "S")];
    applyModePhaseEffects(state, "river");
    expect(state.hands[0].cards).toEqual([c("K", "D")]);
    expect(state.allCommunityCards).toEqual([c("Q", "S")]);

    state.modeId = "card-diaspora";
    state.hands = [
      { id: "p1-0", playerId: "p1", cards: [c("A", "H"), c("K", "D")], flipped: false },
      { id: "p2-0", playerId: "p2", cards: [c("2", "C"), c("3", "S")], flipped: false },
    ];
    applyModePhaseEffects(state, "turn");
    expect(state.hands[0].cards[0]).toEqual(c("2", "C"));
    expect(state.hands[1].cards[0]).toEqual(c("A", "H"));

    state.modeId = "card-tide";
    state.allCommunityCards = [c("2", "C")];
    applyModePhaseEffects(state, "flop");
    expect(state.allCommunityCards[0]).toEqual(c("3", "C"));
    expect(state.hands[0].cards[0].rank).toBe("3");

    state.modeId = "card-drift";
    state.allCommunityCards = [c("2", "C")];
    applyModePhaseEffects(state, "flop");
    expect(state.allCommunityCards[0]).toEqual(c("2", "C"));
    expect(state.hands[0].cards[0].rank).toBe("4");

    state.modeId = "card-cipher";
    state.hands = [
      { id: "p1-0", playerId: "p1", cards: [c("2", "H")], flipped: false },
    ];
    state.allCommunityCards = [c("2", "C"), c("3", "D"), c("4", "S"), c("5", "H"), c("4", "C")];
    applyModePhaseEffects(state, "river");
    expect(state.hands[0].cards[0]).toEqual(c("4", "H"));
    expect(state.allCommunityCards[0]).toEqual(c("4", "C"));

    state.modeId = "card-static";
    state.hands[0].cards = [c("2", "H")];
    state.allCommunityCards = [c("2", "C")];
    applyModePhaseEffects(state, "flop");
    expect(state.hands[0].cards[0]).toEqual(c("3", "H"));
    expect(state.allCommunityCards[0]).toEqual(c("3", "C"));

    state.modeId = "card-schism";
    state.dealDeck = [c("2", "H"), c("8", "D"), c("A", "S")];
    applyModePhaseEffects(state, "turn");
    expect(state.dealDeck).toEqual([c("8", "D"), c("A", "S")]);

    state.modeId = "cell-division";
    state.hands = [
      { id: "p1-0", playerId: "p1", cards: [c("A", "H"), c("K", "D")], flipped: false },
      { id: "p2-0", playerId: "p2", cards: [c("2", "C"), c("3", "S")], flipped: false },
    ];
    state.ranking = ["p1-0", "p2-0"];
    applyModePhaseEffects(state, "reveal");
    expect(state.hands.map((hand) => hand.id)).toEqual(["p1-0", "p1-0-split", "p2-0", "p2-0-split"]);
    expect(state.ranking).toEqual(["p1-0", "p1-0-split", "p2-0", "p2-0-split"]);
  });

  it("records typed chaos events for phase effects", () => {
    const state = phaseEffectState("lightning", "turn");
    state.players.forEach((player) => {
      player.ready = true;
    });
    state.allCommunityCards = [c("A", "H"), c("K", "D"), c("Q", "S"), c("J", "C"), c("T", "H")];

    expect(advancePhaseIfAllReady(state)).toBe(true);
    expect(state.phase).toBe("river");
    expect(state.pendingChaosEvents).toEqual([
      {
        event: "incrementFirstHolePerHand",
        affected: ["community", "p1-0", "p2-0"],
        phase: "river",
        modeId: "lightning",
      },
    ]);
    expect(state.botActionLog.at(-1)?.action).toEqual({
      type: "chaos-event",
      event: "incrementFirstHolePerHand",
      affected: ["community", "p1-0", "p2-0"],
    });
  });

  it("supports recursive and hidden-absolute modes", () => {
    const recursive = phaseEffectState("recursive-board", "turn");
    recursive.allCommunityCards = [c("A", "H"), c("K", "D"), c("Q", "S"), c("J", "C"), c("T", "H")];
    applyModePhaseEffects(recursive, "turn");
    expect(recursive.allCommunityCards).toHaveLength(10);

    const resurrection = dealCardsForMode(createDeckForMode("card-resurrection"), ["p1", "p2"], 1, "card-resurrection");
    expect(resurrection.hands[0].cards).toHaveLength(2);
    expect(resurrection.communityCards.length).toBeGreaterThan(5);

    const hexHands = [
      { id: "hex", playerId: "p1", cards: [{ rank: "A", suit: "H", meta: "cursed" } satisfies Card, c("A", "D")], cardCount: 2, publicCards: [], flipped: false },
      { id: "plain", playerId: "p2", cards: [c("2", "C"), c("3", "S")], cardCount: 2, publicCards: [], flipped: false },
    ];
    expect(computeShowdownForMode("hex-card", hexHands, [c("4", "H"), c("5", "D"), c("6", "S"), c("8", "C"), c("9", "H")]).trueRanking.at(-1)).toBe("hex");

    const blessedHands = [
      { id: "blessed", playerId: "p1", cards: [{ rank: "2", suit: "H", meta: "blessed" } satisfies Card, c("3", "D")], cardCount: 2, publicCards: [], flipped: false },
      { id: "plain", playerId: "p2", cards: [c("A", "C"), c("A", "S")], cardCount: 2, publicCards: [], flipped: false },
    ];
    expect(computeShowdownForMode("blessed-card-absolute", blessedHands, [c("4", "H"), c("5", "D"), c("6", "S"), c("8", "C"), c("9", "H")]).trueRanking[0]).toBe("blessed");
  });

  it("masks phase-indexed hole-card hints", () => {
    const state = createInitialState();
    state.modeId = "half-lit-holes";
    state.phase = "flop";
    state.players = [
      { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
      { id: "p2", connId: "c2", name: "B", isCreator: false, ready: false, connected: true },
    ];
    state.hands = [
      { id: "p1-0", playerId: "p1", cards: [c("A", "H"), c("K", "D")], flipped: false },
      { id: "p2-0", playerId: "p2", cards: [c("2", "C"), c("3", "S")], flipped: false },
    ];

    const p1View = buildClientState(state, "p1");
    expect(p1View.hands[1].publicCards).toEqual([c("3", "S")]);

    state.modeId = "smoke-hole";
    state.phase = "preflop";
    const smokeView = buildClientState(state, "p1");
    expect(smokeView.hands[1].publicCards).toEqual([]);
    expect(smokeView.hands[1].publicCardHints).toEqual([{ suit: "C" }, { suit: "S" }]);
  });

  it("adds phoenix auto-discards as bonus community cards", () => {
    const deck = [
      c("A", "H"),
      c("K", "H"),
      c("2", "C"),
      c("3", "C"),
      c("4", "D"),
      c("5", "D"),
      c("6", "S"),
      c("7", "S"),
      c("8", "S"),
      c("9", "S"),
      c("T", "S"),
      c("J", "S"),
      c("Q", "S"),
      c("A", "S"),
    ];

    const result = dealCardsForMode(deck, ["p1", "p2"], 1, "phoenix-board");

    expect(result.hands[0].cards).toEqual([c("A", "H"), c("4", "D")]);
    expect(result.hands[1].cards).toEqual([c("K", "H"), c("5", "D")]);
    expect(result.communityCards).toHaveLength(7);
    expect(result.communityCards.slice(-2)).toEqual([c("2", "C"), c("3", "C")]);
  });

  it("applies turn random-replace phase effects before broadcasting turn", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const state = phaseEffectState("random-replace", "flop");
      state.allCommunityCards = [c("2", "H"), c("3", "H"), c("4", "H"), c("5", "H"), c("6", "H")];
      state.dealDeck = [c("A", "S")];
      advanceReadyState(state);

      expect(state.phase).toBe("turn");
      expect(state.allCommunityCards[0]).toEqual(c("A", "S"));
      expect(state.dealDeck).toHaveLength(0);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("applies river board mutation phase effects before reveal scoring", () => {
    const reversed = phaseEffectState("reversal", "turn");
    reversed.allCommunityCards = [c("2", "H"), c("3", "H"), c("4", "H"), c("5", "H"), c("6", "H")];
    advanceReadyState(reversed);
    expect(reversed.phase).toBe("river");
    expect(reversed.allCommunityCards).toEqual([c("6", "H"), c("5", "H"), c("4", "H"), c("3", "H"), c("2", "H")]);

    const mirrored = phaseEffectState("mirror-board", "turn");
    mirrored.allCommunityCards = [c("2", "H"), c("3", "H"), c("4", "H"), c("5", "H"), c("6", "H")];
    advanceReadyState(mirrored);
    expect(mirrored.phase).toBe("river");
    expect(mirrored.allCommunityCards).toEqual([
      c("2", "H"),
      c("3", "H"),
      c("4", "H"),
      c("5", "H"),
      c("6", "H"),
      c("2", "H"),
      c("3", "H"),
      c("4", "H"),
      c("5", "H"),
      c("6", "H"),
    ]);
  });

  it("inverts showdown order for lowball", () => {
    const hands = [
      { id: "strong", playerId: "p1", cards: [c("A", "H"), c("A", "D")], flipped: false },
      { id: "weak", playerId: "p2", cards: [c("2", "C"), c("3", "S")], flipped: false },
    ];
    const board = [c("K", "H"), c("Q", "D"), c("J", "C"), c("9", "S"), c("8", "H")];

    const showdown = computeShowdownForMode("lowball", hands, board);
    expect(showdown.trueRanking[0]).toBe("weak");
    expect(showdown.trueRanks.weak).toBe(1);
    expect(countInversionsForRanks(["strong", "weak"], showdown.trueRanks)).toBe(1);
  });

  it("scores two-boards hands against each hand's better board", () => {
    const hands = [
      { id: "royal", playerId: "p1", cards: [c("T", "H"), c("8", "C")], cardCount: 2, publicCards: [], flipped: false },
      { id: "trips", playerId: "p2", cards: [c("A", "C"), c("A", "D")], cardCount: 2, publicCards: [], flipped: false },
    ];
    const board = [
      c("2", "C"),
      c("3", "D"),
      c("4", "S"),
      c("9", "C"),
      c("Q", "D"),
      c("A", "H"),
      c("K", "H"),
      c("Q", "H"),
      c("J", "H"),
      c("2", "D"),
    ];

    const showdown = computeShowdownForMode("two-boards", hands, board);

    expect(showdown.trueRanking[0]).toBe("royal");
    expect(showdown.trueRanks).toEqual({ royal: 1, trips: 2 });
    expect(showdown.madeHandNames.royal).toContain("Board 2");
  });

  it("scores split-board hands against each hand's better half", () => {
    const hands = [
      { id: "left", playerId: "p1", cards: [c("A", "H"), c("A", "D")], cardCount: 2, publicCards: [], flipped: false },
      { id: "right", playerId: "p2", cards: [c("2", "S"), c("3", "S")], cardCount: 2, publicCards: [], flipped: false },
    ];
    const board = [
      c("A", "C"),
      c("K", "D"),
      c("9", "H"),
      c("4", "S"),
      c("5", "S"),
      c("6", "S"),
    ];

    const showdown = computeShowdownForMode("split-board", hands, board);

    expect(showdown.trueRanking[0]).toBe("right");
    expect(showdown.madeHandNames.right).toContain("Board 2");
  });

  it("scores cross hands against the better row or column", () => {
    const hands = [
      { id: "row", playerId: "p1", cards: [c("A", "H"), c("A", "D")], cardCount: 2, publicCards: [], flipped: false },
      { id: "column", playerId: "p2", cards: [c("T", "S"), c("9", "S")], cardCount: 2, publicCards: [], flipped: false },
    ];
    const board = [
      c("A", "C"),
      c("J", "S"),
      c("Q", "S"),
      c("K", "S"),
      c("2", "D"),
    ];

    const showdown = computeShowdownForMode("cross", hands, board);

    expect(showdown.trueRanking[0]).toBe("column");
    expect(showdown.madeHandNames.column).toContain("Board 2");
  });

  it("scores l-board hands against the best five-card path", () => {
    const hands = [
      { id: "early", playerId: "p1", cards: [c("A", "H"), c("A", "D")], cardCount: 2, publicCards: [], flipped: false },
      { id: "late", playerId: "p2", cards: [c("T", "S"), c("9", "S")], cardCount: 2, publicCards: [], flipped: false },
    ];
    const board = [
      c("A", "C"),
      c("2", "D"),
      c("3", "H"),
      c("Q", "S"),
      c("J", "S"),
      c("K", "S"),
      c("8", "C"),
    ];

    const showdown = computeShowdownForMode("l-board", hands, board);

    expect(showdown.trueRanking[0]).toBe("late");
    expect(showdown.madeHandNames.late).toContain("Board 2");
  });

  it("scores duplicate-deck hands without crashing pokersolver", () => {
    const hands = [
      { id: "copy-a", playerId: "p1", cards: [c("A", "H"), c("A", "H")], cardCount: 2, publicCards: [], flipped: false },
      { id: "copy-k", playerId: "p2", cards: [c("K", "D"), c("K", "D")], cardCount: 2, publicCards: [], flipped: false },
    ];
    const board = [c("A", "H"), c("K", "D"), c("Q", "S"), c("J", "C"), c("T", "H")];

    const showdown = computeShowdownForMode("double-deck", hands, board);

    expect(showdown.trueRanking).toHaveLength(2);
    expect(showdown.madeHandNames["copy-a"]).not.toBe("Incomplete");
  });

  it("scores tarot and joker wild cards as best available identities", () => {
    const hands = [
      { id: "wild", playerId: "p1", cards: [c("2", "C"), { rank: "A", suit: "H", meta: "joker" }], cardCount: 2, publicCards: [], flipped: false },
      { id: "plain", playerId: "p2", cards: [c("A", "D"), c("K", "D")], cardCount: 2, publicCards: [], flipped: false },
    ];
    const board = [c("A", "C"), c("A", "S"), c("9", "H"), c("4", "D"), c("3", "C")];

    const jokerShowdown = computeShowdownForMode("jokers-in", hands, board);
    const tarotShowdown = computeShowdownForMode(
      "tarot",
      [{ ...hands[0], cards: [c("2", "C"), { rank: "A", suit: "H", meta: "tarot" }] }, hands[1]],
      board
    );

    expect(jokerShowdown.trueRanking[0]).toBe("wild");
    expect(jokerShowdown.madeHandNames.wild).toContain("Wild:");
    expect(tarotShowdown.trueRanking[0]).toBe("wild");
    expect(tarotShowdown.madeHandNames.wild).toContain("Wild:");
  });

  it("scores rank and suit wild-card modes", () => {
    const strongPlain = { id: "plain", playerId: "p2", cards: [c("A", "D"), c("K", "D")], cardCount: 2, publicCards: [], flipped: false };
    const strongBoard = [c("A", "C"), c("A", "S"), c("9", "H"), c("4", "D"), c("3", "C")];
    const pairPlain = { id: "plain", playerId: "p2", cards: [c("8", "D"), c("8", "C")], cardCount: 2, publicCards: [], flipped: false };
    const pairBoard = [c("9", "C"), c("9", "S"), c("5", "H"), c("4", "D"), c("3", "C")];
    const cases = [
      ["wild-suit", { id: "wild", playerId: "p1", cards: [c("2", "C"), c("5", "H")], cardCount: 2, publicCards: [], flipped: false }, strongPlain, strongBoard],
      ["wild-rank", { id: "wild", playerId: "p1", cards: [c("2", "C"), c("7", "H")], cardCount: 2, publicCards: [], flipped: false }, strongPlain, strongBoard],
      ["wild-rank-roulette", { id: "wild", playerId: "p1", cards: [c("2", "C"), c("7", "H")], cardCount: 2, publicCards: [], flipped: false }, strongPlain, strongBoard],
      ["wild-aces", { id: "wild", playerId: "p1", cards: [c("2", "C"), c("A", "H")], cardCount: 2, publicCards: [], flipped: false }, pairPlain, pairBoard],
      ["wild-faces", { id: "wild", playerId: "p1", cards: [c("2", "C"), c("K", "H")], cardCount: 2, publicCards: [], flipped: false }, pairPlain, pairBoard],
    ] as const;

    for (const [modeId, wildHand, plainHand, board] of cases) {
      const showdown = computeShowdownForMode(modeId, [wildHand, plainHand], board);
      expect(showdown.trueRanking[0]).toBe("wild");
      expect(showdown.madeHandNames.wild).toContain("Wild:");
    }
  });

  it("excludes anti-wild ranks from showdown scoring", () => {
    const hands = [
      { id: "banned", playerId: "p1", cards: [c("7", "H"), c("7", "D")], cardCount: 2, publicCards: [], flipped: false },
      { id: "plain", playerId: "p2", cards: [c("A", "D"), c("K", "D")], cardCount: 2, publicCards: [], flipped: false },
    ];
    const board = [c("7", "C"), c("2", "D"), c("3", "S"), c("4", "H"), c("9", "C")];

    const showdown = computeShowdownForMode("anti-wild", hands, board);

    expect(showdown.trueRanking[0]).toBe("plain");
    expect(showdown.madeHandNames.banned).toBe("Incomplete");
  });

  it("applies cursed and blessed forced reveal rank metadata", () => {
    const cursedHands = [
      { id: "cursed", playerId: "p1", cards: [{ rank: "A", suit: "H", meta: "cursed" }, c("A", "D")], cardCount: 2, publicCards: [], flipped: false },
      { id: "plain", playerId: "p2", cards: [c("2", "C"), c("3", "S")], cardCount: 2, publicCards: [], flipped: false },
    ];
    const blessedHands = [
      { id: "blessed", playerId: "p1", cards: [{ rank: "2", suit: "H", meta: "blessed" }, c("3", "D")], cardCount: 2, publicCards: [], flipped: false },
      { id: "plain", playerId: "p2", cards: [c("A", "C"), c("A", "S")], cardCount: 2, publicCards: [], flipped: false },
    ];
    const board = [c("K", "H"), c("Q", "D"), c("J", "C"), c("9", "S"), c("8", "H")];

    expect(computeShowdownForMode("cursed-card", cursedHands, board).trueRanking.at(-1)).toBe("cursed");
    expect(computeShowdownForMode("blessed-card", blessedHands, board).trueRanking[0]).toBe("blessed");
  });

  it("marks counterfeit hole cards and excludes them from showdown", () => {
    const dealt = dealCardsForMode(createDeckForMode("counterfeit"), ["p1", "p2"], 1, "counterfeit");
    for (const hand of dealt.hands) {
      expect(hand.cards[0].meta).toBe("counterfeit");
    }

    const hands = [
      { id: "counterfeit", playerId: "p1", cards: [{ rank: "A", suit: "H", meta: "counterfeit" }, c("2", "D")], cardCount: 2, publicCards: [], flipped: false },
      { id: "plain", playerId: "p2", cards: [c("K", "C"), c("K", "S")], cardCount: 2, publicCards: [], flipped: false },
    ];
    const board = [c("A", "C"), c("K", "H"), c("9", "D"), c("4", "S"), c("3", "C")];
    const showdown = computeShowdownForMode("counterfeit", hands, board);

    expect(showdown.trueRanking[0]).toBe("plain");
  });

  it("supports glitch and two-suited marked wild metadata", () => {
    const plain = { id: "plain", playerId: "p2", cards: [c("A", "D"), c("K", "D")], cardCount: 2, publicCards: [], flipped: false };
    const board = [c("A", "C"), c("A", "S"), c("9", "H"), c("4", "D"), c("3", "C")];
    const cases = [
      ["glitch-card", { id: "wild", playerId: "p1", cards: [c("2", "C"), { rank: "A", suit: "H", meta: "glitched" }], cardCount: 2, publicCards: [], flipped: false }],
      ["two-suited-card", { id: "wild", playerId: "p1", cards: [c("2", "C"), { rank: "A", suit: "H", meta: "twoSuited" }], cardCount: 2, publicCards: [], flipped: false }],
    ] as const;

    for (const [modeId, hand] of cases) {
      const showdown = computeShowdownForMode(modeId, [hand, plain], board);
      expect(showdown.trueRanking[0]).toBe("wild");
      expect(showdown.madeHandNames.wild).toContain("Wild:");
    }
  });

  it("scores connector, spread, edge, trickster, marked, and twin-suit modes", () => {
    const connector = computeShowdownForMode(
      "wild-connector",
      [
        { id: "connected", playerId: "p1", cards: [c("8", "H"), c("9", "D")], cardCount: 2, publicCards: [], flipped: false },
        { id: "plain", playerId: "p2", cards: [c("A", "C"), c("5", "S")], cardCount: 2, publicCards: [], flipped: false },
      ],
      [c("2", "C"), c("4", "D"), c("6", "S"), c("T", "H"), c("Q", "C")]
    );
    expect(connector.trueRanking[0]).toBe("connected");

    const spread = computeShowdownForMode(
      "wild-spread",
      [
        { id: "spread", playerId: "p1", cards: [c("2", "H"), c("K", "D")], cardCount: 2, publicCards: [], flipped: false },
        { id: "plain", playerId: "p2", cards: [c("7", "C"), c("8", "S")], cardCount: 2, publicCards: [], flipped: false },
      ],
      [c("3", "C"), c("4", "D"), c("6", "S"), c("8", "H"), c("T", "C")]
    );
    expect(spread.trueRanking[0]).toBe("spread");

    const edge = computeShowdownForMode(
      "wild-edge",
      [
        { id: "edge", playerId: "p1", cards: [c("2", "H"), c("3", "D")], cardCount: 2, publicCards: [], flipped: false },
        { id: "plain", playerId: "p2", cards: [c("K", "C"), c("K", "S")], cardCount: 2, publicCards: [], flipped: false },
      ],
      [c("9", "C"), c("9", "S"), c("5", "H"), c("4", "D"), c("3", "C")]
    );
    expect(edge.trueRanking[0]).toBe("edge");

    const trickster = computeShowdownForMode(
      "trickster-card",
      [
        { id: "trick", playerId: "p1", cards: [{ rank: "A", suit: "H", meta: "trickster" }, c("A", "D")], cardCount: 2, publicCards: [], flipped: false },
        { id: "plain", playerId: "p2", cards: [c("2", "C"), c("3", "S")], cardCount: 2, publicCards: [], flipped: false },
      ],
      [c("K", "H"), c("Q", "D"), c("J", "C"), c("9", "S"), c("8", "H")]
    );
    expect(trickster.trueRanking.at(-1)).toBe("trick");

    const marked = computeShowdownForMode(
      "marked-deck",
      [
        { id: "marked", playerId: "p1", cards: [{ rank: "A", suit: "H", meta: "marked" }, c("A", "D")], cardCount: 2, publicCards: [], flipped: false },
        { id: "plain", playerId: "p2", cards: [c("2", "C"), c("3", "S")], cardCount: 2, publicCards: [], flipped: false },
      ],
      [c("K", "H"), c("Q", "D"), c("J", "C"), c("9", "S"), c("8", "H")]
    );
    expect(marked.trueRanking[0]).toBe("marked");

    const twin = computeShowdownForMode(
      "twin-suits",
      [
        { id: "red", playerId: "p1", cards: [c("2", "H"), c("4", "D")], cardCount: 2, publicCards: [], flipped: false },
        { id: "plain", playerId: "p2", cards: [c("A", "C"), c("A", "S")], cardCount: 2, publicCards: [], flipped: false },
      ],
      [c("6", "H"), c("8", "D"), c("T", "H"), c("3", "S"), c("5", "C")]
    );
    expect(twin.trueRanking[0]).toBe("red");
  });

  it("scores inverted deck with twos above aces", () => {
    const hands = [
      { id: "two", playerId: "p1", cards: [c("2", "C"), c("7", "H")], cardCount: 2, publicCards: [], flipped: false },
      { id: "ace", playerId: "p2", cards: [c("A", "D"), c("K", "D")], cardCount: 2, publicCards: [], flipped: false },
    ];
    const board = [c("9", "C"), c("8", "S"), c("6", "H"), c("4", "D"), c("3", "C")];

    const showdown = computeShowdownForMode("inverted-deck", hands, board);

    expect(showdown.trueRanking[0]).toBe("two");
    expect(showdown.madeHandNames.two).toContain("Inverted:");
  });

  it("uses objective scoring modes before poker tiebreakers", () => {
    const hands = [
      { id: "flushy", playerId: "p1", cards: [c("A", "H"), c("2", "H")], flipped: false },
      { id: "plain", playerId: "p2", cards: [c("A", "S"), c("A", "C")], flipped: false },
    ];
    const board = [c("3", "H"), c("4", "H"), c("5", "H"), c("9", "D"), c("T", "C")];

    const showdown = computeShowdownForMode("flush-hunt", hands, board);
    expect(showdown.trueRanking[0]).toBe("flushy");
    expect(showdown.madeHandNames.flushy).toContain("heart");
  });

  it("falls back to classic mode for unknown ids", () => {
    expect(getGameModeDefinition("missing").id).toBe("ding");
  });

  it("can complete a full server lifecycle in every mode", () => {
    for (const mode of listGameModes()) {
      const state = createInitialState();
      state.modeId = mode.id;
      state.players = [
        { id: "p1", connId: "c1", name: "A", isCreator: true, ready: false, connected: true },
        { id: "p2", connId: "c2", name: "B", isCreator: false, ready: false, connected: true },
      ];

      expect(start(state, state.players[0], { type: "start" }, unusedCtx).kind).toBe("broadcast");
      if (mode.deal.dealChoice?.selectionPhase) {
        expect(state.phase).toBe("dealChoice");
        for (const hand of state.hands) {
          const actor = state.players.find((candidate) => candidate.id === hand.playerId)!;
          const indexes = Array.from(
            { length: mode.deal.dealChoice.keepCards },
            (_, index) => index
          );
          chooseDealCards(
            state,
            actor,
            { type: "chooseDealCards", handId: hand.id, indexes },
            unusedCtx
          );
        }
      }
      expect(state.phase).toBe("preflop");
      expect(state.hands.length).toBeGreaterThan(0);

      while (state.phase !== "reveal") {
        state.ranking = state.hands.map((hand) => hand.id);
        for (const player of state.players) {
          ready(state, player, { type: "ready", ready: true }, unusedCtx);
        }
      }

      expect(state.trueRanking).toHaveLength(state.hands.length);
      expect(state.trueRanks).not.toBeNull();

      while (state.score === null) {
        const handId = state.ranking[state.ranking.length - 1 - state.revealIndex];
        const hand = state.hands.find((candidate) => candidate.id === handId);
        const actor = state.players.find((player) => player.id === hand?.playerId) ?? state.players[0];
        flip(state, actor, { type: "flip", handId: handId ?? "" }, unusedCtx);
      }

      expect(state.score).toBeGreaterThanOrEqual(0);
    }
  });
});
