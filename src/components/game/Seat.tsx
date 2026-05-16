"use client";

/**
 * Seat — composes the seat sub-components (SeatNameRow, SeatFlipPrompt,
 * SeatHandSlot per hand). Memoized so a per-tick game-state update doesn't
 * re-render every seat.
 */

import { memo, useMemo } from "react";
import type { AcquireRequest, Hand, Player } from "@/lib/types";
import { shades, surfaces } from "@/lib/tokens";
import { SeatNameRow } from "./seat/SeatNameRow";
import { SeatFlipPrompt } from "./seat/SeatFlipPrompt";
import { SeatHandSlot } from "./seat/SeatHandSlot";

export interface SeatProps {
  player: Player;
  hands: Hand[];
  isMe: boolean;
  rankMap: Map<string, number>;
  totalHands: number;
  handsPerPlayer: number;
  isReveal: boolean;
  selectedHandId: string | null;
  hasSelection: boolean;
  onHandClick: (handId: string) => void;
  onUnclaim: (handId: string) => void;
  currentFlipHandId: string | null;
  onFlip: ((handId: string) => void) | null;
  isMobile: boolean;
  rankHistory: Record<string, (number | null)[]>;
  acquireRequests: AcquireRequest[];
  stackHands?: boolean;
}

function SeatImpl({
  player,
  hands,
  isMe,
  rankMap,
  totalHands,
  handsPerPlayer,
  isReveal,
  selectedHandId,
  hasSelection,
  onHandClick,
  onUnclaim,
  currentFlipHandId,
  onFlip,
  isMobile,
  rankHistory,
  acquireRequests,
  stackHands = true,
}: SeatProps) {
  const isFlipTurn =
    currentFlipHandId !== null && hands.some((h) => h.id === currentFlipHandId);
  // Owner flips their own hand. If owner is disconnected, any other connected
  // player can flip on their behalf so reveal doesn't stall — the server
  // enforces the same rule.
  const canFlip = isFlipTurn && (isMe || !player.connected);

  const tightPadding = isMobile && handsPerPlayer > 1;
  const showHandIndex = handsPerPlayer > 1 && !isMobile;

  // Pre-bucket requests by hand id once per render so each SeatHandSlot
  // receives only its own requests — keeps SeatHandSlot's memo from busting
  // every time an unrelated request mutates.
  const requestsByHand = useMemo(() => {
    const map = new Map<string, AcquireRequest[]>();
    for (const req of acquireRequests) {
      const ids = [req.initiatorHandId, req.recipientHandId];
      for (const id of ids) {
        const arr = map.get(id) ?? [];
        arr.push(req);
        map.set(id, arr);
      }
    }
    return map;
  }, [acquireRequests]);

  const renderSlot = (hand: Hand, handIdx: number) => (
    <SeatHandSlot
      key={hand.id}
      hand={hand}
      handIdx={handIdx}
      isMe={isMe}
      isReveal={isReveal}
      isMobile={isMobile}
      showHandIndex={showHandIndex}
      rankMap={rankMap}
      totalHands={totalHands}
      selectedHandId={selectedHandId}
      hasSelection={hasSelection}
      currentFlipHandId={currentFlipHandId}
      onHandClick={onHandClick}
      onUnclaim={onUnclaim}
      rankHistory={rankHistory[hand.id] ?? []}
      handRequests={requestsByHand.get(hand.id) ?? EMPTY_REQUESTS}
    />
  );

  // Opponents with 3+ hands use a 2-row grid; everyone else is a single row.
  const useDoubleRow = !isMe && stackHands && hands.length >= 3;
  const split = useDoubleRow ? Math.ceil(hands.length / 2) : hands.length;
  const gap = tightPadding ? "gap-0.5" : "gap-1";

  return (
    <div
      className={[
        "flex flex-col items-center rounded-xl transition-all",
        tightPadding
          ? "gap-0.5 px-1 py-1"
          : isMobile
          ? "gap-1 px-1.5 py-1.5"
          : "gap-1.5 px-2 py-2",
        isFlipTurn ? "animate-[pulse_2s_ease-in-out_infinite]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: isMe
          ? "linear-gradient(180deg, rgba(20,70,40,0.85) 0%, rgba(8,34,20,0.95) 100%)"
          : "rgba(6,28,16,0.72)",
        border: isFlipTurn
          ? "1.5px solid rgba(255,215,0,0.8)"
          : isMe
          ? "1.5px solid #c9a54a"
          : `1.5px solid ${surfaces.subtleBorder}`,
        boxShadow: isMe
          ? `0 6px 18px ${surfaces.goldMid}`
          : `0 2px 6px ${shades.shadowSoft}`,
        backdropFilter: "blur(4px)",
      }}
    >
      <SeatNameRow player={player} isMe={isMe} isReveal={isReveal} isMobile={isMobile} />

      {isReveal && isFlipTurn && (
        <SeatFlipPrompt
          canFlip={canFlip}
          currentFlipHandId={currentFlipHandId}
          onFlip={onFlip}
        />
      )}

      {useDoubleRow ? (
        <div className="flex flex-col gap-0.5 items-center">
          <div className={`flex flex-row ${gap}`}>
            {hands.slice(0, split).map((h, i) => renderSlot(h, i))}
          </div>
          <div className={`flex flex-row ${gap}`}>
            {hands.slice(split).map((h, i) => renderSlot(h, split + i))}
          </div>
        </div>
      ) : (
        <div className={`flex flex-row ${gap}`}>
          {hands.map((hand, handIdx) => renderSlot(hand, handIdx))}
        </div>
      )}
    </div>
  );
}

const EMPTY_REQUESTS: AcquireRequest[] = [];

const Seat = memo(SeatImpl);
export default Seat;
