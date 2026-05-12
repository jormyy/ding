"use client";

/**
 * Cards-pair display for one hand within a seat: the pair of card faces (or
 * card backs depending on visibility) plus the wrapper that handles selection
 * highlighting and click routing.
 */

import { memo } from "react";
import type { Hand } from "@/lib/types";
import { CardFace, CardBack } from "../../CardFace";

export interface SeatHandProps {
  hand: Hand;
  isMe: boolean;
  isReveal: boolean;
  isHighlighted: boolean;
  isClickableArea: boolean;
  isDropTarget: boolean;
  rankIsNull: boolean;
  isMobile: boolean;
  onHandClick: (handId: string) => void;
}

function SeatHandImpl({
  hand,
  isMe,
  isReveal,
  isHighlighted,
  isClickableArea,
  isDropTarget,
  rankIsNull,
  isMobile,
  onHandClick,
}: SeatHandProps) {
  const cardProps = isMobile ? { tiny: true as const } : { small: true as const };
  const showOwnFaces = isMe && hand.cards.length > 0;
  const showRevealFaces = isReveal && hand.flipped && hand.cards.length > 0;
  const publicCards = hand.publicCards ?? [];
  const publicCardHints = hand.publicCardHints ?? [];
  const cardCount = hand.cardCount ?? hand.cards.length;
  const publicDisplayCards = publicCards.length > 0 ? publicCards : publicCardHints;
  const hiddenBacks = Math.max(0, cardCount - publicDisplayCards.length);
  const shouldShowPublicFaces = !isMe && !showRevealFaces && publicDisplayCards.length > 0;
  return (
    <div
      className={[
        "flex gap-0.5 rounded-lg p-0.5 transition-all",
        isHighlighted ? "ring-2 ring-yellow-400 bg-yellow-400/10" : "",
        isDropTarget && !isReveal
          ? "cursor-pointer ring-1 ring-yellow-400/40 hover:ring-yellow-400/60"
          : "",
        isClickableArea && rankIsNull && !isReveal
          ? "cursor-pointer hover:ring-1 hover:ring-green-500/40"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={
        !isReveal && (isDropTarget || (isClickableArea && rankIsNull))
          ? () => onHandClick(hand.id)
          : undefined
      }
    >
      {(isReveal && showRevealFaces) || (!isReveal && showOwnFaces) ? (
        hand.cards.map((card, i) => <CardFace key={i} card={card} {...cardProps} />)
      ) : shouldShowPublicFaces ? (
        <>
          {publicDisplayCards.map((card, i) => <CardFace key={`public-${i}`} card={card} {...cardProps} />)}
          {Array.from({ length: hiddenBacks }).map((_, i) => <CardBack key={`hidden-${i}`} {...cardProps} />)}
        </>
      ) : (
        Array.from({ length: Math.max(1, cardCount) }).map((_, i) => <CardBack key={i} {...cardProps} />)
      )}
    </div>
  );
}

export const SeatHand = memo(SeatHandImpl);
