"use client";

/**
 * Rank chip for a seat hand (or empty slot indicator), with the trade-request
 * badge overlay and the unclaim "↺" affordance when selected.
 */

import { memo } from "react";
import type { AcquireRequest } from "@/lib/types";
import RankChip from "../../RankChip";

export interface SeatRankChipProps {
  handId: string;
  rank: number | null;
  totalHands: number;
  isMe: boolean;
  isSelected: boolean;
  hasSelection: boolean;
  isMobile: boolean;
  onHandClick: (handId: string) => void;
  onUnclaim: (handId: string) => void;
  rankMap: Map<string, number>;
  /** Acquire requests where THIS hand is the initiator or recipient. */
  handRequests: AcquireRequest[];
}

function SeatRankChipImpl({
  handId,
  rank,
  totalHands,
  isMe,
  isSelected,
  hasSelection,
  isMobile,
  onHandClick,
  onUnclaim,
  rankMap,
  handRequests,
}: SeatRankChipProps) {
  if (rank === null) {
    return (
      <div
        className={[
          "rounded-full border-2 border-dashed flex items-center justify-center transition-all",
          isMobile ? "w-6 h-6" : "w-8 h-8",
          hasSelection && isMe
            ? "border-yellow-400/60 cursor-pointer hover:border-yellow-400 hover:bg-yellow-400/10"
            : "border-gray-700/40",
        ].join(" ")}
        onClick={hasSelection && isMe ? () => onHandClick(handId) : undefined}
        aria-label={`Empty slot for hand ${handId}`}
      />
    );
  }

  const badge = (() => {
    if (handRequests.length === 0) return null;
    const req = handRequests[0];
    const initRank = rankMap.get(req.initiatorHandId);
    const recRank = rankMap.get(req.recipientHandId);
    if (req.kind === "swap" && initRank && recRank) return `${initRank}↔${recRank}`;
    if (req.kind === "offer" && initRank) return `${initRank}→`;
    if (req.kind === "acquire" && recRank) return `→${recRank}`;
    return "!";
  })();

  return (
    <div className="relative">
      <RankChip
        rank={rank}
        total={totalHands}
        isOwn={isMe}
        isSelected={isSelected}
        hasSelection={hasSelection}
        onClick={() => onHandClick(handId)}
        onDoubleClick={isMe ? () => onUnclaim(handId) : undefined}
        small={isMobile}
      />
      {badge !== null && (
        <div
          className="absolute -top-1.5 -right-1.5 min-w-[13px] h-[13px] bg-orange-500 rounded-full text-[7px] font-black text-white flex items-center justify-center px-0.5 pointer-events-none"
          aria-label="Pending trade"
        >
          {badge}
        </div>
      )}
      {isMe && isSelected && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnclaim(handId);
          }}
          title="Return to board"
          aria-label="Return chip to the board"
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-500 text-[9px] text-white font-bold flex items-center justify-center shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          ↺
        </button>
      )}
    </div>
  );
}

export const SeatRankChip = memo(SeatRankChipImpl);
