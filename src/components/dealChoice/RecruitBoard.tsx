"use client";

import { useState } from "react";
import type { GameState, Hand } from "@/lib/types";
import { handIndexFromId } from "@/lib/handId";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import { filterHandsByPlayer, rightNeighbor, toggleInSet } from "@/lib/utils";
import { CardFace } from "../CardFace";
import { DEAL_CHOICE_PANEL_STYLE, NeighborView, VariantStatusBar } from "./SharedAffordances";
import type { DealChoiceBoardProps } from "./types";

export default function RecruitBoard({ gameState, myId, onSend }: DealChoiceBoardProps) {
  const myHands = filterHandsByPlayer(gameState.hands, myId);
  const choices = gameState.dealChoices ?? {};
  // Right neighbor (recruit takes from THEIR discard) — same convention as inheritance:
  // right neighbor sits one seat counterclockwise of you.
  const playerIds = gameState.players.map((p) => p.id);
  const myIdx = playerIds.indexOf(myId);
  const rightId = rightNeighbor(playerIds, myIdx);

  return (
    <div className="grid gap-3">
      {myHands.map((hand, idx) => {
        const choice = choices[hand.id];
        const stage = choice?.recruitStage ?? "keep";
        return (
          <RecruitHandRow
            key={hand.id}
            hand={hand}
            handNumber={idx + 1}
            keepCards={choice?.keepCards ?? 2}
            stage={stage}
            submitted={choice?.submitted ?? false}
            rightNeighborHand={getNeighborHand(gameState, rightId, idx)}
            rightNeighborChoice={getNeighborChoice(gameState, rightId, idx)}
            onChoose={(indexes) => onSend({ type: "chooseDealCards", handId: hand.id, indexes })}
            onRecruit={(neighborIndex) =>
              onSend({ type: "recruitFromNeighbor", handId: hand.id, neighborDiscardIndex: neighborIndex })
            }
          />
        );
      })}
    </div>
  );
}

function getNeighborHand(gameState: GameState, neighborId: string | undefined, handIndex: number): Hand | undefined {
  if (!neighborId) return undefined;
  return gameState.hands.find((h) => h.playerId === neighborId && handIndexFromId(h.id) === handIndex);
}

function getNeighborChoice(gameState: GameState, neighborId: string | undefined, handIndex: number) {
  const hand = getNeighborHand(gameState, neighborId, handIndex);
  if (!hand) return undefined;
  return gameState.dealChoices?.[hand.id];
}

function RecruitHandRow({
  hand,
  handNumber,
  keepCards,
  stage,
  submitted,
  rightNeighborHand,
  rightNeighborChoice,
  onChoose,
  onRecruit,
}: {
  hand: Hand;
  handNumber: number;
  keepCards: number;
  stage: "keep" | "steal" | "done";
  submitted: boolean;
  rightNeighborHand: Hand | undefined;
  rightNeighborChoice: { selectedIndexes: number[] | null; submitted: boolean } | undefined;
  onChoose: (indexes: number[]) => void;
  onRecruit: (neighborDiscardIndex: number) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const canSubmitKeep = selected.size === keepCards && stage === "keep";

  function toggle(i: number) {
    if (stage !== "keep") return;
    setSelected((prev) => toggleInSet(prev, i, keepCards));
  }

  const neighborSelected = rightNeighborChoice?.selectedIndexes ?? null;
  const neighborDiscards: number[] = neighborSelected && rightNeighborHand
    ? rightNeighborHand.cards.map((_card, i) => i).filter((i) => !neighborSelected.includes(i))
    : [];

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
            : stage === "keep"
              ? `Keep ${selected.size}/${keepCards}`
              : stage === "steal"
                ? "Recruit from right neighbor's discards"
                : "Done"
        }
        tone={stage === "steal" ? "warning" : "accent"}
      />
      <div className="flex flex-wrap gap-2">
        {hand.cards.map((card, i) => {
          const isSelected = selected.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              disabled={stage !== "keep"}
              className="rounded-lg p-1 transition-all disabled:cursor-default"
              style={{
                background: isSelected ? surfaces.goldMid : surfaces.disabledBg,
                border: isSelected ? "2px solid #c9a54a" : `2px solid ${surfaces.subtleBorder}`,
                opacity: stage !== "keep" && !isSelected ? 0.5 : 1,
              }}
              aria-pressed={isSelected}
            >
              <CardFace card={card} small />
            </button>
          );
        })}
        {stage === "keep" && (
          <>
            <div className="flex-1" />
            <button
              type="button"
              disabled={!canSubmitKeep}
              onClick={() => onChoose([...selected].sort((a, b) => a - b))}
              className="h-10 px-3 rounded-md text-xs font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed"
              style={{
                background: D.goldButton,
                color: D.ink,
              }}
            >
              Lock keeps
            </button>
          </>
        )}
      </div>
      {stage !== "keep" && rightNeighborHand && (
        <div className="mt-1">
          {neighborDiscards.length > 0 ? (
            <NeighborView
              cards={neighborDiscards.map((i) => rightNeighborHand.cards[i])}
              selectedIndexes={[]}
              maxSelected={1}
              onToggle={(localIdx) => {
                const realIndex = neighborDiscards[localIdx];
                onRecruit(realIndex);
              }}
              label="Right neighbor's discards"
              disabled={submitted}
            />
          ) : (
            <span className="text-[11px]" style={{ color: D.sub }}>
              Waiting on right neighbor to discard...
            </span>
          )}
        </div>
      )}
    </div>
  );
}
