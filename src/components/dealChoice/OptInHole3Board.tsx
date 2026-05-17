"use client";

import { useEffect, useState } from "react";
import type { Hand } from "@/lib/types";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import { filterHandsByPlayer, toggleInSet } from "@/lib/utils";
import { CardFace } from "../CardFace";
import { DEAL_CHOICE_PANEL_STYLE, VariantStatusBar } from "./SharedAffordances";
import type { DealChoiceBoardProps } from "./types";

export default function OptInHole3Board({ gameState, myId, onSend }: DealChoiceBoardProps) {
  const myHands = filterHandsByPlayer(gameState.hands, myId);
  const choices = gameState.dealChoices ?? {};
  return (
    <div className="grid gap-3">
      {myHands.map((hand, idx) => (
        <OptInRow
          key={hand.id}
          hand={hand}
          handNumber={idx + 1}
          optedThirdHole={choices[hand.id]?.optedThirdHole ?? false}
          keepCards={choices[hand.id]?.keepCards ?? 2}
          submitted={choices[hand.id]?.submitted ?? false}
          onOptIn={(optIn) => onSend({ type: "optInThirdHole", handId: hand.id, optIn })}
          onChoose={(indexes) => onSend({ type: "chooseDealCards", handId: hand.id, indexes })}
        />
      ))}
    </div>
  );
}

function OptInRow({
  hand,
  handNumber,
  optedThirdHole,
  keepCards,
  submitted,
  onOptIn,
  onChoose,
}: {
  hand: Hand;
  handNumber: number;
  optedThirdHole: boolean;
  keepCards: number;
  submitted: boolean;
  onOptIn: (optIn: boolean) => void;
  onChoose: (indexes: number[]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [optedThirdHole]);

  function toggle(i: number) {
    if (submitted) return;
    setSelected((prev) => toggleInSet(prev, i, keepCards));
  }

  const canSubmit = selected.size === keepCards && !submitted;
  return (
    <div
      className="grid gap-3 rounded-lg p-3"
      style={DEAL_CHOICE_PANEL_STYLE}
    >
      <div className="flex items-center justify-between gap-3">
        <VariantStatusBar
          label={`Hand #${handNumber}`}
          value={
            optedThirdHole
              ? `Take all 3 (tier penalty)`
              : `Keep ${keepCards}/3`
          }
          tone={optedThirdHole ? "warning" : "accent"}
        />
        <button
          type="button"
          disabled={submitted}
          onClick={() => onOptIn(!optedThirdHole)}
          className="h-8 px-3 rounded-md text-[11px] font-black uppercase tracking-wide transition-all disabled:opacity-45 disabled:cursor-not-allowed"
          style={{
            background: optedThirdHole ? surfaces.warningBg : surfaces.neutralFaint,
            color: optedThirdHole ? D.warning : D.sub,
            border: `1px solid ${surfaces.warningBorder}`,
          }}
        >
          {optedThirdHole ? "Cancel opt-in" : "Take 3rd hole"}
        </button>
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
