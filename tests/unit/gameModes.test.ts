import { describe, expect, it } from "vitest";
import { buildClientState, createInitialState } from "../../party/state";
import { start } from "../../party/handlers/lobby";
import { flip, ready } from "../../party/handlers/lifecycle";
import type { HandlerCtx } from "../../party/handlers/types";
import { dealCardsForMode, createDeckForMode } from "../../src/lib/gameModeDeal";
import {
  getGameModeDefinition,
  getMaxHandsPerPlayerForMode,
  listGameModes,
  visibleCommunityCardCount,
} from "../../src/lib/gameModes";
import {
  computeShowdownForMode,
  countInversionsForRanks,
} from "../../src/lib/gameModeShowdown";
import type { Card, Rank, Suit } from "../../src/lib/types";

function c(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

const unusedCtx = {} as HandlerCtx;

describe("game modes", () => {
  it("exposes the default mode plus nineteen variants", () => {
    const modes = listGameModes();
    expect(modes).toHaveLength(20);
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
      expect(result.communityCards).toHaveLength(mode.deal.communityCards);
      for (const hand of result.hands) {
        expect(hand.cards).toHaveLength(mode.deal.keepCards ?? mode.deal.holeCards);
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

  it("applies mode-specific community-card schedules", () => {
    expect(visibleCommunityCardCount("flash-flop", "preflop")).toBe(3);
    expect(visibleCommunityCardCount("blackout", "turn")).toBe(0);
    expect(visibleCommunityCardCount("big-sky", "river")).toBe(7);
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
