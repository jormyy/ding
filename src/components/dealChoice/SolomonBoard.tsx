"use client";

import { useState } from "react";
import type { Card, Hand } from "@/lib/types";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import { filterHandsByPlayer, findPlayerById, leftNeighbor, rightNeighbor, toggleInSet } from "@/lib/utils";
import { CardFace } from "../CardFace";
import { DEAL_CHOICE_PANEL_STYLE, VariantStatusBar } from "./SharedAffordances";
import type { DealChoiceBoardProps } from "./types";

export default function SolomonBoard({ gameState, myId, onSend }: DealChoiceBoardProps) {
  const myHands = filterHandsByPlayer(gameState.hands, myId);
  const choices = gameState.dealChoices ?? {};
  const playerIds = gameState.players.map((p) => p.id);
  const myIdx = playerIds.indexOf(myId);
  const leftId = leftNeighbor(playerIds, myIdx);

  // Hands belonging to MY RIGHT NEIGHBOR — they wait on me as their LEFT
  // neighbor to choose a pair.
  const rightId = rightNeighbor(playerIds, myIdx);
  const rightNeighborHands = filterHandsByPlayer(gameState.hands, rightId);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: D.accent }}>
          Your hands — split into pairs
        </div>
        {myHands.map((hand, idx) => (
          <SolomonSplitRow
            key={hand.id}
            hand={hand}
            handNumber={idx + 1}
            split={choices[hand.id]?.solomonSplit}
            submitted={choices[hand.id]?.submitted ?? false}
            onSubmit={(pair1, pair2) =>
              onSend({ type: "solomonSplit", handId: hand.id, pair1, pair2 })
            }
            leftId={leftId}
            leftName={findPlayerById(gameState.players, leftId)?.name ?? "neighbor"}
          />
        ))}
      </div>
      {rightNeighborHands.length > 0 && (
        <div className="grid gap-3">
          <div className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: D.warning }}>
            Right neighbor — pick which pair they keep
          </div>
          {rightNeighborHands.map((hand, idx) => (
            <SolomonChooseRow
              key={hand.id}
              hand={hand}
              handNumber={idx + 1}
              split={choices[hand.id]?.solomonSplit}
              submitted={choices[hand.id]?.submitted ?? false}
              onChoose={(chosenPair) =>
                onSend({ type: "solomonChoose", targetHandId: hand.id, chosenPair })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SolomonSplitRow({
  hand,
  handNumber,
  split,
  submitted,
  onSubmit,
  leftName,
  leftId,
}: {
  hand: Hand;
  handNumber: number;
  split: { pair1: number[]; pair2: number[] } | undefined;
  submitted: boolean;
  onSubmit: (pair1: number[], pair2: number[]) => void;
  leftName: string;
  leftId: string;
}) {
  const [pair1, setPair1] = useState<Set<number>>(new Set([0, 1]));
  const total = hand.cards.length;
  function toggleSlot(i: number) {
    if (split || submitted) return;
    setPair1((prev) => toggleInSet(prev, i));
  }
  const pair1Indexes = [...pair1].sort((a, b) => a - b);
  const pair2Indexes = hand.cards
    .map((_card, i) => i)
    .filter((i) => !pair1.has(i));
  const canSubmit = !split && !submitted && pair1.size === Math.floor(total / 2);

  return (
    <div
      className="grid gap-3 rounded-lg p-3"
      style={DEAL_CHOICE_PANEL_STYLE}
    >
      <VariantStatusBar
        label={`Hand #${handNumber}`}
        value={
          submitted
            ? "Locked"
            : split
              ? `Split sent — waiting on ${leftName}`
              : `Pair 1 = ${pair1.size}/${Math.floor(total / 2)}`
        }
        tone={submitted ? "accent" : split ? "warning" : "default"}
      />
      <div className="grid grid-cols-2 gap-3">
        <BucketView label="Pair 1" indexes={split?.pair1 ?? pair1Indexes} cards={hand.cards} onToggle={toggleSlot} disabled={!!split || submitted} />
        <BucketView label="Pair 2" indexes={split?.pair2 ?? pair2Indexes} cards={hand.cards} onToggle={toggleSlot} disabled={!!split || submitted} />
      </div>
      {!split && !submitted && (
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit(pair1Indexes, pair2Indexes)}
          className="h-10 px-3 rounded-md text-xs font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed self-end"
          style={{ background: D.goldButton, color: D.ink }}
        >
          Submit split for {leftId === "" ? "neighbor" : leftName}
        </button>
      )}
    </div>
  );
}

function BucketView({
  label,
  indexes,
  cards,
  onToggle,
  disabled,
}: {
  label: string;
  indexes: number[];
  cards: readonly Card[];
  onToggle: (i: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-md p-2" style={{ background: "rgba(0,0,0,0.18)", border: `1px solid ${surfaces.subtleBorder}` }}>
      <div className="text-[9px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: D.sub }}>{label}</div>
      <div className="flex flex-wrap gap-1">
        {indexes.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onToggle(i)}
            disabled={disabled}
            className="rounded p-0.5 transition-all disabled:cursor-default"
            style={{
              background: surfaces.goldLight,
              border: "1px solid #c9a54a",
            }}
            aria-label={`Card ${i + 1}`}
          >
            <CardFace card={cards[i]} small />
          </button>
        ))}
        {indexes.length === 0 && (
          <span className="text-[10px]" style={{ color: D.sub }}>(empty)</span>
        )}
      </div>
    </div>
  );
}

function SolomonChooseRow({
  hand,
  handNumber,
  split,
  submitted,
  onChoose,
}: {
  hand: Hand;
  handNumber: number;
  split: { pair1: number[]; pair2: number[] } | undefined;
  submitted: boolean;
  onChoose: (chosenPair: 0 | 1) => void;
}) {
  if (!split) {
    return (
      <div className="rounded-lg p-3 text-[11px]" style={{ background: surfaces.dealChoicePanelBg, color: D.sub, border: `1px solid ${surfaces.subtleBorder}` }}>
        Hand #{handNumber}: waiting on your right neighbor to split their cards.
      </div>
    );
  }
  return (
    <div
      className="grid gap-3 rounded-lg p-3"
      style={DEAL_CHOICE_PANEL_STYLE}
    >
      <VariantStatusBar
        label={`Hand #${handNumber}`}
        value={submitted ? "Chose" : "Pick a pair for them"}
        tone={submitted ? "accent" : "warning"}
      />
      <div className="grid grid-cols-2 gap-3">
        <BucketView label="Pair 1" indexes={split.pair1} cards={hand.cards} onToggle={() => undefined} disabled />
        <BucketView label="Pair 2" indexes={split.pair2} cards={hand.cards} onToggle={() => undefined} disabled />
      </div>
      {!submitted && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChoose(0)}
            className="flex-1 h-10 rounded-md text-xs font-black uppercase tracking-wide"
            style={{ background: D.goldButton, color: D.ink }}
          >
            Give them Pair 1
          </button>
          <button
            type="button"
            onClick={() => onChoose(1)}
            className="flex-1 h-10 rounded-md text-xs font-black uppercase tracking-wide"
            style={{ background: D.goldButton, color: D.ink }}
          >
            Give them Pair 2
          </button>
        </div>
      )}
    </div>
  );
}
