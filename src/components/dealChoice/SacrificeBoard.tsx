"use client";

import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import { filterHandsByPlayer } from "@/lib/utils";
import { CardFace } from "../CardFace";
import { CommunityPreviewStrip, DEAL_CHOICE_PANEL_STYLE, VariantStatusBar } from "./SharedAffordances";
import type { DealChoiceBoardProps } from "./types";

export default function SacrificeBoard({ gameState, myId, onSend }: DealChoiceBoardProps) {
  const myHands = filterHandsByPlayer(gameState.hands, myId);
  const choices = gameState.dealChoices ?? {};
  return (
    <div className="grid gap-3">
      {myHands.map((hand, idx) => {
        const choice = choices[hand.id];
        const sacrificedIndex = choice?.sacrificedHoleIndex ?? null;
        const submitted = choice?.submitted ?? false;
        return (
          <div
            key={hand.id}
            className="grid gap-3 rounded-lg p-3"
            style={DEAL_CHOICE_PANEL_STYLE}
          >
            <div className="flex items-center justify-between gap-3">
              <VariantStatusBar
                label={`Hand #${idx + 1}`}
                value={submitted ? "Locked" : sacrificedIndex !== null ? "Sacrificed" : "Pick one to sacrifice"}
                tone={submitted ? "accent" : "warning"}
              />
              {choice?.privatePeekCards && choice.privatePeekCards.length > 0 && (
                <CommunityPreviewStrip cards={choice.privatePeekCards} label="Flop peek" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {hand.cards.map((card, i) => {
                const isSacrificed = i === sacrificedIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={submitted}
                    onClick={() => {
                      if (submitted) return;
                      onSend({
                        type: "sacrificeHole",
                        handId: hand.id,
                        cardIndex: isSacrificed ? null : i,
                      });
                    }}
                    className="rounded-lg p-1 transition-all disabled:cursor-default"
                    style={{
                      background: isSacrificed ? surfaces.dangerLight : surfaces.disabledBg,
                      border: isSacrificed ? `2px solid ${D.warning}` : `2px solid ${surfaces.subtleBorder}`,
                      opacity: isSacrificed ? 0.55 : 1,
                    }}
                    aria-pressed={isSacrificed}
                  >
                    <CardFace card={card} small />
                  </button>
                );
              })}
            </div>
            {!submitted && (
              <div className="text-[11px]" style={{ color: D.sub }}>
                Tap a card to discard it for a flop peek. Keep the other.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
