"use client";

/**
 * Bottom-center dock showing the player's own hands with select/click
 * affordances and per-hand history chips.
 */

import { memo } from "react";
import type { Hand } from "@/lib/types";
import { D } from "@/lib/theme";
import { CardFace } from "../../CardFace";
import RankChip, { HistoryChip } from "../../RankChip";
import { PHASES_META } from "@/lib/constants";
import { surfaces } from "@/lib/tokens";

const HISTORY_LABELS = PHASES_META.filter((m) => m.history !== undefined).map((m) => m.history!);

export interface MyHandsDockProps {
  myHands: Hand[];
  rankMap: Map<string, number>;
  totalHands: number;
  selectedHandId: string | null;
  hasSelection: boolean;
  rankHistory: Record<string, (number | null)[]>;
  onHandClick: (handId: string) => void;
  onUnclaim: (handId: string) => void;
}

function MyHandsDockImpl({
  myHands,
  rankMap,
  totalHands,
  selectedHandId,
  hasSelection,
  rankHistory,
  onHandClick,
  onUnclaim,
}: MyHandsDockProps) {
  return (
    <div
      className="absolute z-10 flex items-center"
      style={{
        bottom: 14,
        left: "50%",
        transform: "translateX(-50%)",
        gap: 16,
        background:
          "linear-gradient(180deg, rgba(20,70,40,0.95) 0%, rgba(6,30,16,0.98) 100%)",
        border: "2px solid #c9a54a",
        borderRadius: 14,
        padding: "10px 20px",
        boxShadow:
          `0 12px 40px rgba(0,0,0,0.55), 0 0 30px ${surfaces.goldMid}`,
        whiteSpace: "nowrap",
      }}
    >
      <div className="flex-shrink-0">
        <div
          style={{
            fontSize: 10,
            color: D.accent,
            letterSpacing: 2.5,
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        >
          Your Hands
        </div>
        <div
          style={{
            fontSize: 12,
            color: D.goldBright,
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            marginTop: 2,
          }}
        >
          {myHands.filter((h) => rankMap.get(h.id) !== undefined).length}/
          {myHands.length} placed
        </div>
      </div>
      {myHands.map((hand, i) => {
        const rank = rankMap.get(hand.id) ?? null;
        const isSelected = selectedHandId === hand.id;
        const history = rankHistory[hand.id] ?? [];
        return (
          <div key={hand.id} className="flex items-center" style={{ gap: 16 }}>
            {i > 0 && (
              <div
                style={{
                  width: 1,
                  height: 56,
                  background: surfaces.dividerLine,
                  flexShrink: 0,
                }}
              />
            )}
            <div className="flex flex-col items-center" style={{ gap: 4 }}>
              <div
                style={{
                  fontSize: 9,
                  color: D.sub,
                  fontWeight: 800,
                  letterSpacing: 1,
                }}
              >
                HAND #{i + 1}
              </div>
              <div
                className={[
                  "flex gap-1 rounded-lg p-0.5 cursor-pointer transition-all",
                  isSelected
                    ? "ring-2 ring-yellow-400 bg-yellow-400/10"
                    : "hover:ring-1 hover:ring-green-500/40",
                ].join(" ")}
                onClick={() => onHandClick(hand.id)}
              >
                {hand.cards.map((card, j) => (
                  <CardFace key={j} card={card} small />
                ))}
              </div>
              {rank !== null ? (
                <RankChip
                  rank={rank}
                  total={totalHands}
                  isOwn
                  isSelected={isSelected}
                  hasSelection={hasSelection}
                  onClick={() => onHandClick(hand.id)}
                  onDoubleClick={() => onUnclaim(hand.id)}
                />
              ) : (
                <div
                  className={[
                    "w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center transition-all",
                    hasSelection
                      ? "border-yellow-400/60 cursor-pointer hover:border-yellow-400 hover:bg-yellow-400/10"
                      : "border-gray-700/40",
                  ].join(" ")}
                  onClick={hasSelection ? () => onHandClick(hand.id) : undefined}
                />
              )}
              {history.length > 0 && (
                <div className="flex gap-0.5">
                  {history.map((r, phaseIdx) => (
                    <HistoryChip
                      key={phaseIdx}
                      rank={r}
                      total={totalHands}
                      phaseLabel={HISTORY_LABELS[phaseIdx] ?? ""}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const MyHandsDock = memo(MyHandsDockImpl);
