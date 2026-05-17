"use client";

import { useState } from "react";
import type { Card, Hand } from "@/lib/types";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import { filterHandsByPlayer, toggleInSet } from "@/lib/utils";
import { CardFace } from "../CardFace";
import { CommunityPreviewStrip, DEAL_CHOICE_PANEL_STYLE, VariantStatusBar } from "./SharedAffordances";
import type { DealChoiceBoardProps } from "./types";

export default function PeekBoardBoard({ gameState, myId, onSend }: DealChoiceBoardProps) {
  const myHands = filterHandsByPlayer(gameState.hands, myId);
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
    setSelected((prev) => toggleInSet(prev, i, keepCards));
  }

  return (
    <div
      className="grid gap-3 rounded-lg p-3"
      style={DEAL_CHOICE_PANEL_STYLE}
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
                background: isSelected ? surfaces.goldMid : surfaces.disabledBg,
                border: isSelected ? "2px solid #c9a54a" : `2px solid ${surfaces.subtleBorder}`,
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
              : D.goldButton,
            color: submitted ? D.accent : D.ink,
            border: submitted ? `1px solid ${surfaces.accentBorder}` : "none",
          }}
        >
          {submitted ? "Locked" : "Keep"}
        </button>
      </div>
    </div>
  );
}
