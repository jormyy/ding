"use client";

/**
 * Reveal-phase flip prompt — shows the FLIP button when this seat owns the
 * next hand to flip; otherwise shows a small "flipping..." indicator.
 */

import { memo } from "react";

export interface SeatFlipPromptProps {
  canFlip: boolean;
  currentFlipHandId: string | null;
  onFlip: ((handId: string) => void) | null;
}

function SeatFlipPromptImpl({
  canFlip,
  currentFlipHandId,
  onFlip,
}: SeatFlipPromptProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      {canFlip && currentFlipHandId ? (
        <button
          type="button"
          onClick={() => onFlip?.(currentFlipHandId)}
          aria-label="Flip the next hand"
          className="text-[10px] font-black bg-yellow-500 hover:bg-yellow-400 text-black px-2 py-0.5 rounded-full transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          FLIP!
        </button>
      ) : (
        <div className="text-[8px] text-yellow-400 font-semibold">flipping...</div>
      )}
    </div>
  );
}

export const SeatFlipPrompt = memo(SeatFlipPromptImpl);
