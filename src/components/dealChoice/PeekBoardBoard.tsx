"use client";

import { useState } from "react";
import type { Card, Hand } from "@/lib/types";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import { CardFace } from "../CardFace";
import { CommunityPreviewStrip, VariantStatusBar } from "./SharedAffordances";
import type { DealChoiceBoardProps } from "./types";

export default function PeekBoardBoard({ gameState, myId, onSend }: DealChoiceBoardProps) {
  const myHands = gameState.hands.filter((h) => h.playerId === myId);
  const choices = gameState.dealChoices ?? {};

  return (
    <div className="grid gap-3">
      {myHands.map((hand, idx) => (
        <PeekHandRow
          key={hand.id}
          hand={hand}
          handNumber={idx + 1}
          keepCards={choices[hand.id]?.keepCards ?? 2}
          submitted={choices[hand.id]?.submitted ?? false}
          peekCards={choices[hand.id]?.privatePeekCards ?? []}
          onChoose={(indexes) => onSend({ type: "chooseDealCards", handId: hand.id, indexes })}
        />
      ))}
    </div>
  );
}

function PeekHandRow({
  hand,
  handNumber,
  keepCards,
  submitted,
  peekCards,
  onChoose,
}: {
  hand: Hand;
  handNumber: number;
  keepCards: number;
  submitted: boolean;
  peekCards: readonly Card[];
  onChoose: (indexes: number[]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const canSubmit = selected.size === keepCards && !submitted;

  function toggle(i: number) {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else if (next.size < keepCards) next.add(i);
      return next;
    });
  }

  return (
    <div
      className="grid gap-3 rounded-lg p-3"
      style={{ background: "rgba(10,40,22,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <VariantStatusBar label={`Hand #${handNumber}`} value={`${selected.size}/${keepCards} kept`} tone="accent" />
        <CommunityPreviewStrip
          cards={peekCards}
          label="Your peek"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {hand.cards.map((card, i) => {
          const isSelected = selected.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              disabled={submitted}
              className="rounded-lg p-1 transition-all disabled:cursor-default"
              style={{
                background: isSelected ? "rgba(201,165,74,0.2)" : surfaces.disabledBg,
                border: isSelected ? "2px solid #c9a54a" : "2px solid rgba(255,255,255,0.08)",
                opacity: submitted && !isSelected ? 0.35 : 1,
              }}
              aria-pressed={isSelected}
            >
              <CardFace card={card} small />
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onChoose([...selected].sort((a, b) => a - b))}
          className="h-10 px-3 rounded-md text-xs font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed"
          style={{
            background: submitted
              ? surfaces.accentLight
              : `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`,
            color: submitted ? D.accent : D.ink,
            border: submitted ? "1px solid rgba(47,184,115,0.35)" : "none",
          }}
        >
          {submitted ? "Locked" : "Keep"}
        </button>
      </div>
    </div>
  );
}
