"use client";

/**
 * One full hand within a seat: index label + cards + chip + history strip.
 * Composes SeatHand, SeatRankChip, and SeatHistoryStrip.
 */

import { memo } from "react";
import type { AcquireRequest, Hand } from "@/lib/types";
import { SeatHand } from "./SeatHand";
import { SeatRankChip } from "./SeatRankChip";
import { SeatHistoryStrip } from "./SeatHistoryStrip";

export interface SeatHandSlotProps {
  hand: Hand;
  handIdx: number;
  isMe: boolean;
  isReveal: boolean;
  isMobile: boolean;
  showHandIndex: boolean;
  rankMap: Map<string, number>;
  totalHands: number;
  selectedHandId: string | null;
  hasSelection: boolean;
  currentFlipHandId: string | null;
  onHandClick: (handId: string) => void;
  onUnclaim: (handId: string) => void;
  rankHistory: (number | null)[];
  /** Pre-filtered requests where this hand is initiator or recipient. */
  handRequests: AcquireRequest[];
}

function SeatHandSlotImpl({
  hand,
  handIdx,
  isMe,
  isReveal,
  isMobile,
  showHandIndex,
  rankMap,
  totalHands,
  selectedHandId,
  hasSelection,
  currentFlipHandId,
  onHandClick,
  onUnclaim,
  rankHistory,
  handRequests,
}: SeatHandSlotProps) {
  const rank = rankMap.get(hand.id) ?? null;
  const isSelected = selectedHandId === hand.id;
  const isDropTarget = hasSelection && !isSelected;
  const isHighlighted = hand.id === currentFlipHandId;
  const isClickableArea = !isReveal && (isMe || hasSelection);

  return (
    <div className="flex flex-col items-center gap-1">
      {showHandIndex && (
        <div className="text-[9px] text-gray-600 font-medium">#{handIdx + 1}</div>
      )}

      <SeatHand
        hand={hand}
        isMe={isMe}
        isReveal={isReveal}
        isHighlighted={isHighlighted}
        isClickableArea={isClickableArea}
        isDropTarget={isDropTarget}
        rankIsNull={rank === null}
        isMobile={isMobile}
        onHandClick={onHandClick}
      />

      {!isReveal && (
        <div className="flex flex-col items-center gap-0.5">
          <SeatRankChip
            handId={hand.id}
            rank={rank}
            totalHands={totalHands}
            isMe={isMe}
            isSelected={isSelected}
            hasSelection={hasSelection}
            isMobile={isMobile}
            onHandClick={onHandClick}
            onUnclaim={onUnclaim}
            rankMap={rankMap}
            handRequests={handRequests}
          />
          <SeatHistoryStrip history={rankHistory} totalHands={totalHands} />
        </div>
      )}

      {isReveal && (
        <SeatHistoryStrip history={rankHistory} totalHands={totalHands} />
      )}
    </div>
  );
}

export const SeatHandSlot = memo(SeatHandSlotImpl);
