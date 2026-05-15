"use client";

import type { ClientMessage, GameState } from "@/lib/types";
import { D } from "@/lib/theme";
import { CardFace } from "../CardFace";
import { VariantStatusBar } from "./SharedAffordances";

interface Props {
  gameState: GameState;
  myId: string;
  onSend: (msg: ClientMessage) => void;
}

export default function BlindPoolBoard({ gameState, myId, onSend }: Props) {
  const myHands = gameState.hands.filter((h) => h.playerId === myId);
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
            style={{ background: "rgba(10,40,22,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}
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
                      background: isContrib ? "rgba(240,138,108,0.18)" : "rgba(0,0,0,0.22)",
                      border: isContrib ? "2px solid #f08a6c" : "2px solid rgba(255,255,255,0.08)",
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
