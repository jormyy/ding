import { registerPhaseEffect } from "./registry";

registerPhaseEffect("glitchCopyNeighbor", (state) => {
  const board = state.allCommunityCards;
  for (let index = 0; index < board.length; index++) {
    if (board[index].meta === "glitched") {
      const neighbor = board[index + 1] ?? board[index - 1];
      if (neighbor) board[index] = { ...board[index], rank: neighbor.rank, suit: neighbor.suit };
      return;
    }
  }
});

export {};
