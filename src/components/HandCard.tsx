"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Hand, Player } from "@/lib/types";
import { CardFace, CardBack } from "./CardFace";

interface HandCardProps {
  hand: Hand;
  position: number; // 0 = best
  isOwn: boolean;
  isDraggable: boolean;
  playerName: string;
  handLabel: string; // e.g. "Alice" or "Alice (2)"
  totalHands: number;
}

export function HandCard({
  hand,
  position,
  isOwn,
  isDraggable,
  playerName,
  handLabel,
}: HandCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: hand.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
        isOwn
          ? "bg-green-900/20 border-green-700/40 hover:border-green-600/60"
          : "bg-gray-800/50 border-gray-700/40"
      } ${isDragging ? "shadow-2xl shadow-green-900/50" : ""}`}
    >
      {/* Position badge */}
      <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
        {position + 1}
      </div>

      {/* Drag handle (own hands only) */}
      {isDraggable && (
        <div
          {...attributes}
          {...listeners}
          className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        >
          <svg
            width="14"
            height="20"
            viewBox="0 0 14 20"
            fill="currentColor"
          >
            <circle cx="4" cy="4" r="1.5" />
            <circle cx="10" cy="4" r="1.5" />
            <circle cx="4" cy="10" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="4" cy="16" r="1.5" />
            <circle cx="10" cy="16" r="1.5" />
          </svg>
        </div>
      )}

      {/* Cards */}
      <div className="flex gap-1.5">
        {isOwn && hand.cards.length > 0
          ? hand.cards.map((card, i) => (
              <CardFace key={i} card={card} />
            ))
          : [0, 1].map((i) => <CardBack key={i} />)}
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">
          {handLabel}
        </div>
        {isOwn && (
          <div className="text-xs text-green-400">Your hand</div>
        )}
      </div>
    </div>
  );
}

interface StaticHandCardProps {
  hand: Hand;
  position: number;
  playerName: string;
  handLabel: string;
  isOwn: boolean;
  highlighted?: boolean;
  onFlip?: () => void;
  canFlip?: boolean;
  flipperName?: string;
}

export function StaticHandCard({
  hand,
  position,
  handLabel,
  isOwn,
  highlighted,
  onFlip,
  canFlip,
  flipperName,
}: StaticHandCardProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        highlighted
          ? "border-yellow-400 bg-yellow-400/5 shadow-lg shadow-yellow-400/20"
          : isOwn
          ? "bg-green-900/20 border-green-700/40"
          : "bg-gray-800/50 border-gray-700/40"
      } ${highlighted ? "animate-[pulse_border_1.5s_ease-in-out_infinite]" : ""}`}
      style={
        highlighted
          ? {
              boxShadow: "0 0 0 2px rgba(234, 179, 8, 0.5)",
              animation: "pulse-border 1.5s ease-in-out infinite",
            }
          : undefined
      }
    >
      {/* Position badge */}
      <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
        {position + 1}
      </div>

      {/* Cards */}
      <div className="flex gap-1.5">
        {hand.flipped && hand.cards.length > 0
          ? hand.cards.map((card, i) => (
              <CardFace key={i} card={card} />
            ))
          : [0, 1].map((i) => <CardBack key={i} />)}
      </div>

      {/* Label + action */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">
          {handLabel}
        </div>
        {highlighted && (
          <div className="text-xs text-yellow-400 font-medium">
            {canFlip ? "Your turn to flip!" : `${flipperName ?? "..."} is flipping...`}
          </div>
        )}
        {hand.flipped && (
          <div className="text-xs text-gray-400">Revealed</div>
        )}
      </div>

      {/* Flip button */}
      {highlighted && canFlip && onFlip && (
        <button
          onClick={onFlip}
          className="flex-shrink-0 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-4 py-2 rounded-lg transition-all active:scale-95"
        >
          Flip!
        </button>
      )}
    </div>
  );
}
