"use client";

import type { Card } from "@/lib/types";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import { CardFace } from "../CardFace";

/** Standard deal-choice card panel chrome: dark green fill + subtle white border.
 *  Used as the outer style on every per-hand panel in the deal-choice variant UIs. */
export const DEAL_CHOICE_PANEL_STYLE = {
  background: surfaces.dealChoicePanelBg,
  border: `1px solid ${surfaces.subtleBorder}`,
} as const;

export function CommunityPreviewStrip({
  cards,
  label = "Your peek",
}: {
  cards: readonly Card[];
  label?: string;
}) {
  if (cards.length === 0) return null;
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5"
      style={{ background: surfaces.goldPanel, border: `1px solid ${D.panelBorder}` }}>
      <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: D.accent }}>
        {label}
      </span>
      <div className="flex gap-1">
        {cards.map((card, i) => (
          <CardFace key={`${card.rank}${card.suit}-${i}`} card={card} small />
        ))}
      </div>
    </div>
  );
}

export function PoolStrip({
  cards,
  remainingIndexes,
  selectableIndexes,
  onClaim,
  label,
}: {
  cards: readonly Card[];
  remainingIndexes: readonly number[];
  selectableIndexes?: readonly number[];
  onClaim?: (poolIndex: number) => void;
  label?: string;
}) {
  const remaining = new Set(remainingIndexes);
  const selectable = selectableIndexes ? new Set(selectableIndexes) : null;
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: D.sub }}>
          {label}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {cards.map((card, i) => {
          const claimed = !remaining.has(i);
          const canClaim = !claimed && (selectable === null || selectable.has(i)) && onClaim !== undefined;
          return (
            <button
              key={`${card.rank}${card.suit}-${i}`}
              type="button"
              onClick={canClaim ? () => onClaim!(i) : undefined}
              disabled={!canClaim}
              className="rounded-lg p-1 transition-all disabled:cursor-default"
              style={{
                background: canClaim ? surfaces.goldLight : surfaces.disabledBg,
                border: canClaim ? "2px solid #c9a54a" : `2px solid ${surfaces.subtleBorder}`,
                opacity: claimed ? 0.25 : 1,
              }}
              aria-label={claimed ? "Claimed" : `Pool card ${i + 1}`}
            >
              <CardFace card={card} small />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NeighborView({
  cards,
  selectedIndexes,
  onToggle,
  maxSelected,
  label,
  disabled,
}: {
  cards: readonly Card[];
  selectedIndexes: readonly number[];
  onToggle?: (index: number) => void;
  maxSelected?: number;
  label?: string;
  disabled?: boolean;
}) {
  const selected = new Set(selectedIndexes);
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: D.sub }}>
          {label}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {cards.map((card, i) => {
          const isSelected = selected.has(i);
          const canToggle = !disabled && onToggle !== undefined
            && (isSelected || maxSelected === undefined || selected.size < maxSelected);
          return (
            <button
              key={`${card.rank}${card.suit}-${i}`}
              type="button"
              onClick={canToggle ? () => onToggle!(i) : undefined}
              disabled={!canToggle}
              className="rounded-lg p-1 transition-all disabled:cursor-default"
              style={{
                background: isSelected ? "rgba(201,165,74,0.22)" : surfaces.disabledBg,
                border: isSelected ? "2px solid #c9a54a" : `2px solid ${surfaces.subtleBorder}`,
                opacity: disabled && !isSelected ? 0.4 : 1,
              }}
              aria-pressed={isSelected}
              aria-label={`Card ${i + 1}`}
            >
              <CardFace card={card} small />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VariantStatusBar({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "warning";
}) {
  const color = tone === "accent" ? D.accent : tone === "warning" ? D.warning : D.sub;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: D.sub }}>
        {label}
      </span>
      <span className="text-xs font-black" style={{ color }}>{value}</span>
    </div>
  );
}
