"use client";

import { D } from "@/lib/theme";
import { PoolStrip, VariantStatusBar } from "./SharedAffordances";
import type { DealChoiceBoardProps } from "./types";

// Mounted by GameBoard (NOT DealChoiceBoard) when state.phaseSubstep === "flopDraftPending".
export default function DraftFromFlopBoard({ gameState, myId, onSend }: DealChoiceBoardProps) {
  const pool = gameState.flopDraftPool;
  if (!pool) return null;
  const myDrafts = pool.draftedBy[myId] ?? [];
  const iHaveDrafted = myDrafts.length > 0;
  const totalPlayers = gameState.players.length;
  const draftedCount = Object.values(pool.draftedBy).filter((arr) => arr.length > 0).length;

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{
        background: "rgba(6,30,16,0.94)",
        border: `1px solid ${D.panelBorder}`,
      }}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: D.accent }}>
            Flop draft
          </div>
          <h2 className="font-serif font-black text-lg" style={{ color: D.goldBright }}>
            Pick one card for your hand
          </h2>
        </div>
        <VariantStatusBar label="Drafted" value={`${draftedCount}/${totalPlayers}`} tone="accent" />
      </div>
      <PoolStrip
        cards={pool.cards}
        remainingIndexes={pool.remainingIndexes}
        selectableIndexes={iHaveDrafted ? [] : pool.remainingIndexes}
        onClaim={iHaveDrafted ? undefined : (i) => onSend({ type: "draftFlopCard", poolCardIndex: i })}
        label={iHaveDrafted ? "Waiting on others..." : "Click one card to draft"}
      />
      <div className="text-[11px]" style={{ color: D.sub }}>
        The 3 cards left over become the public flop.
      </div>
    </div>
  );
}
