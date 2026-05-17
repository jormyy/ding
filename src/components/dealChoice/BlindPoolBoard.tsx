"use client";

import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import { filterHandsByPlayer } from "@/lib/utils";
import { CardFace } from "../CardFace";
import { DEAL_CHOICE_PANEL_STYLE, VariantStatusBar } from "./SharedAffordances";
import type { DealChoiceBoardProps } from "./types";

export default function BlindPoolBoard({ gameState, myId, onSend }: DealChoiceBoardProps) {
  const myHands = filterHandsByPlayer(gameState.hands, myId);
  const choices = gameState.dealChoices ?? {};
  const totalHands = gameState.hands.length;
  const contributed = Object.values(choices).filter((c) => c.submitted).length;

  return (
    <div className="grid gap-3">
      <VariantStatusBar
        label="Pool"
        value={`${contributed}/${totalHands} contributed`}
        tone={contributed === totalHands ? "accent" : "default"}
      />
      {myHands.map((hand, idx) => {
        const choice = choices[hand.id];
        const submitted = choice?.submitted ?? false;
        const contribution = choice?.blindPoolContribution;
        return (
          <div
            key={hand.id}
            className="grid gap-3 rounded-lg p-3"
            style={DEAL_CHOICE_PANEL_STYLE}
          >
            <VariantStatusBar
              label={`Hand #${idx + 1}`}
              value={submitted ? "Contributed. Awaiting redistribution." : "Pick one card to contribute"}
              tone={submitted ? "accent" : "warning"}
            />
            <div className="flex flex-wrap gap-2">
              {hand.cards.map((card, i) => {
                const isContrib = contribution === i;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={submitted}
                    onClick={() => onSend({ type: "contributeToBlindPool", handId: hand.id, cardIndex: i })}
                    className="rounded-lg p-1 transition-all disabled:cursor-default"
                    style={{
                      background: isContrib ? surfaces.dangerLight : surfaces.disabledBg,
                      border: isContrib ? `2px solid ${D.warning}` : `2px solid ${surfaces.subtleBorder}`,
                      opacity: submitted && !isContrib ? 0.35 : 1,
                    }}
                  >
                    <CardFace card={card} small />
                  </button>
                );
              })}
            </div>
            {!submitted && (
              <div className="text-[11px]" style={{ color: D.sub }}>
                The card you pick is shuffled into a face-down pool. You draw one back blind.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
