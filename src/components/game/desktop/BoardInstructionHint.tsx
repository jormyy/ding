"use client";

/**
 * Top-center pill that surfaces a short instruction for the player based on
 * what's currently selected (their hand, an empty slot, or nothing).
 */

import { memo } from "react";
import type { GameState } from "@/lib/types";
import { findHandById } from "@/lib/utils";

export interface BoardInstructionHintProps {
  gameState: GameState;
  selectedHandId: string | null;
  selectedSlot: number | null;
  localRanking: (string | null)[];
}

function BoardInstructionHintImpl({
  gameState,
  selectedHandId,
  selectedSlot,
  localRanking,
}: BoardInstructionHintProps) {
  if (selectedHandId !== null) {
    const selHand = findHandById(gameState.hands, selectedHandId);
    const isRanked = localRanking.indexOf(selectedHandId) !== -1;
    let text = "Place your chip or tap a teammate's hand";
    if (selHand && isRanked) {
      text =
        "Tap your other hand to move the chip — or tap a teammate's hand to offer/swap";
    } else if (selHand && !isRanked) {
      text = "Tap a board slot to place — or tap a teammate's chip to request it";
    }
    return (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="bg-yellow-500/90 text-yellow-950 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          {text}
        </div>
      </div>
    );
  }
  if (selectedSlot !== null) {
    return (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="bg-yellow-500/90 text-yellow-950 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          Click your hand to claim this slot
        </div>
      </div>
    );
  }
  return null;
}

export const BoardInstructionHint = memo(BoardInstructionHintImpl);
