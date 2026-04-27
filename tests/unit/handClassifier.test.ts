import { describe, it, expect } from "vitest";
import { classifyHand } from "../../src/lib/ai/handClassifier";
import type { Card } from "../../src/lib/types";

function c(rank: string, suit: string): Card {
  return { rank: rank as Card["rank"], suit: suit as Card["suit"] };
}

describe("classifyHand", () => {
  it("classifies a made flush", () => {
    const hole = [c("K", "H"), c("2", "H")];
    const board = [c("A", "H"), c("Q", "H"), c("T", "H")];
    const cls = classifyHand(hole, board);
    expect(cls.madeHandType).toBe("flush");
    expect(cls.handName).toContain("Flush");
    expect(cls.draws).toHaveLength(0);
    expect(cls.isSpeculative).toBe(false);
  });

  it("classifies a flush draw", () => {
    const hole = [c("K", "H"), c("2", "H")];
    const board = [c("A", "H"), c("Q", "H"), c("T", "C")];
    const cls = classifyHand(hole, board);
    expect(cls.madeHandType).toMatch(/high-card|pair/);
    expect(cls.draws).toContain("flush-draw");
    expect(cls.isSpeculative).toBe(true);
  });

  it("classifies a straight draw (open-ended)", () => {
    const hole = [c("J", "S"), c("T", "D")];
    const board = [c("Q", "H"), c("9", "C"), c("3", "S")];
    const cls = classifyHand(hole, board);
    expect(cls.draws).toContain("open-ended-straight-draw");
    expect(cls.isSpeculative).toBe(true);
  });

  it("classifies a made set", () => {
    const hole = [c("A", "H"), c("A", "D")];
    const board = [c("A", "S"), c("K", "C"), c("2", "H")];
    const cls = classifyHand(hole, board);
    expect(cls.madeHandType).toBe("three-of-a-kind");
  });

  it("classifies a pair", () => {
    const hole = [c("A", "H"), c("9", "D")];
    const board = [c("A", "S"), c("K", "C"), c("2", "H")];
    const cls = classifyHand(hole, board);
    expect(cls.madeHandType).toBe("pair");
    expect(cls.isSpeculative).toBe(false);
  });

  it("classifies overcards as speculative on flop+", () => {
    const hole = [c("A", "H"), c("K", "D")];
    const board = [c("Q", "C"), c("J", "S"), c("2", "H")];
    const cls = classifyHand(hole, board);
    // Both A and K are above Q, J, 2 → overcards
    expect(cls.draws).toContain("overcards");
    expect(cls.isSpeculative).toBe(true);
  });

  it("classifies high card with no draws as non-speculative", () => {
    const hole = [c("2", "H"), c("7", "D")];
    const board = [c("A", "S"), c("K", "C"), c("Q", "H")];
    const cls = classifyHand(hole, board);
    expect(cls.madeHandType).toBe("high-card");
    expect(cls.isSpeculative).toBe(false);
    expect(cls.draws).toHaveLength(0);
  });

  it("classifies preflop hands", () => {
    const hole = [c("A", "S"), c("K", "S")];
    const cls = classifyHand(hole, []);
    expect(cls.madeHandType).toBe("high-card");
    expect(cls.isCoordinated).toBe(true);
    expect(cls.draws).toHaveLength(0);
    expect(cls.highCardRank).toBe(14);
  });

  it("classifies empty hand gracefully", () => {
    const cls = classifyHand([], []);
    expect(cls.handName).toBe("Unknown");
    expect(cls.madeHandType).toBeNull();
    expect(cls.isSpeculative).toBe(false);
  });

  it("classifies two pair", () => {
    const hole = [c("A", "H"), c("K", "D")];
    const board = [c("A", "S"), c("K", "C"), c("2", "H")];
    const cls = classifyHand(hole, board);
    expect(cls.madeHandType).toBe("two-pair");
    expect(cls.strengthStability).toBeGreaterThan(0.5);
  });

  it("classifies full house", () => {
    const hole = [c("A", "H"), c("A", "D")];
    const board = [c("A", "S"), c("K", "C"), c("K", "H")];
    const cls = classifyHand(hole, board);
    expect(cls.madeHandType).toBe("full-house");
    expect(cls.strengthStability).toBeGreaterThan(0.85);
  });

  it("speculative hands have lower stability", () => {
    const flushDraw = classifyHand(
      [c("K", "H"), c("2", "H")],
      [c("A", "H"), c("Q", "H"), c("T", "C")]
    );
    const madeFlush = classifyHand(
      [c("K", "H"), c("2", "H")],
      [c("A", "H"), c("Q", "H"), c("T", "H")]
    );
    expect(flushDraw.strengthStability).toBeLessThan(madeFlush.strengthStability);
  });
});
