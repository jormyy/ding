"use client";

import type { BoardLayout } from "@/lib/gameMode";
import type { Card, ModeInfo, Phase } from "@/lib/types";
import { CardFace } from "../CardFace";

interface TableFeltProps {
  phase: Phase;
  communityCards: Card[];
  communityLayout?: BoardLayout;
  modeInfo: ModeInfo[];
  isMobile: boolean;
  isLandscape: boolean;
  feltInset: string;
  children?: React.ReactNode;
}

export default function TableFelt({
  phase,
  communityCards,
  communityLayout,
  modeInfo,
  isMobile,
  isLandscape: _isLandscape,
  feltInset,
  children,
}: TableFeltProps) {
  const commCardProps = isMobile ? { tiny: true as const } : { small: true as const };
  const commCardW = isMobile ? 26 : 36;
  const commCardH = isMobile ? 38 : 52;
  const layout = communityLayout ?? { kind: "linear" as const, slots: Math.max(5, communityCards.length) };

  const phaseLabel =
    phase === "dealChoice" ? "choose"
    : phase === "preflop" ? "pre-flop"
    : phase === "flop" ? "flop"
    : phase === "turn" ? "turn"
    : phase === "river" ? "river"
    : "reveal";

  return (
    <>
      {/* Felt oval */}
      <div
        className="absolute rounded-[50%] overflow-hidden pointer-events-none"
        style={{
          inset: feltInset,
          background: "radial-gradient(ellipse at 50% 35%, #166534 0%, #14532d 50%, #052e16 100%)",
          boxShadow: "inset 0 0 80px rgba(0,0,0,0.6), 0 8px 40px rgba(0,0,0,0.7)",
          border: isMobile ? "5px solid #78350f" : "8px solid #78350f",
          outline: "3px solid #92400e33",
        }}
      >
        <div className="absolute inset-3 rounded-[50%] pointer-events-none" style={{ border: "1px solid rgba(201,165,74,0.15)" }} />
      </div>

      {/* Community cards + phase label + children (board slots) */}
      <div
        className="absolute flex flex-col items-center justify-center gap-1"
        style={{ inset: feltInset }}
      >
        <div className="text-green-500/40 text-[8px] uppercase tracking-[0.2em] font-bold select-none pointer-events-none">
          {phaseLabel}
        </div>
        <CommunityCardsLayout
          cards={communityCards}
          layout={layout}
          cardProps={commCardProps}
          emptySize={{ width: commCardW, height: commCardH }}
        />
        {modeInfo.length > 0 && (
          <div className="max-w-[74%] flex flex-wrap justify-center gap-1 pointer-events-none">
            {modeInfo.slice(0, 4).map((info) => (
              <div key={`${info.id}-${modeInfoText(info)}`} className="rounded bg-black/35 border border-emerald-300/15 px-2 py-0.5 text-[9px] text-emerald-50/80">
                <span className="font-bold text-emerald-200/90">{info.label ?? info.id}</span>
                <span className="text-emerald-50/70"> {modeInfoText(info)}</span>
              </div>
            ))}
          </div>
        )}
        {children}
      </div>
    </>
  );
}

function modeInfoText(info: ModeInfo): string {
  if ("value" in info && info.value !== undefined) return info.value;
  if ("text" in info) return info.text;
  if ("placement" in info) return info.placement;
  return info.id;
}

function CommunityCardsLayout({
  cards,
  layout,
  cardProps,
  emptySize,
}: {
  cards: Card[];
  layout: BoardLayout;
  cardProps: { tiny: true } | { small: true };
  emptySize: { width: number; height: number };
}) {
  if (layout.kind === "dual") {
    const primary = cards.slice(0, layout.primary);
    const secondary = cards.slice(layout.primary, layout.primary + layout.secondary);
    return (
      <div className="flex flex-col items-center gap-1 pointer-events-none">
        <CardRow cards={primary} slots={layout.primary} cardProps={cardProps} emptySize={emptySize} />
        <div className="text-[7px] uppercase tracking-[0.16em] text-emerald-200/35">{layout.secondaryRole}</div>
        <CardRow cards={secondary} slots={layout.secondary} cardProps={cardProps} emptySize={emptySize} />
      </div>
    );
  }

  if (layout.kind === "L") {
    const rows = [cards.slice(0, layout.arm)];
    for (let i = 1; i < layout.stem; i++) rows.push([cards[layout.arm + i - 1]].filter(Boolean));
    return (
      <div className="grid gap-1 pointer-events-none" style={{ gridTemplateColumns: `repeat(${layout.arm}, minmax(0, max-content))` }}>
        {rows[0].map((card, i) => <CardSlot key={i} card={card} cardProps={cardProps} emptySize={emptySize} />)}
        {rows.slice(1).map((row, rowIndex) => (
          <div key={rowIndex} style={{ gridColumn: 1 }}>
            <CardSlot card={row[0]} cardProps={cardProps} emptySize={emptySize} />
          </div>
        ))}
      </div>
    );
  }

  if (layout.kind === "grid") {
    const maxRow = Math.max(...layout.slots.map((slot) => slot.row), 0);
    const maxCol = Math.max(...layout.slots.map((slot) => slot.col), 0);
    return (
      <div className="grid gap-1 pointer-events-none" style={{ gridTemplateRows: `repeat(${maxRow + 1}, max-content)`, gridTemplateColumns: `repeat(${maxCol + 1}, max-content)` }}>
        {layout.slots.map((slot, i) => (
          <div key={i} style={{ gridRow: slot.row + 1, gridColumn: slot.col + 1 }}>
            <CardSlot card={cards[i]} cardProps={cardProps} emptySize={emptySize} />
          </div>
        ))}
      </div>
    );
  }

  return <CardRow cards={cards} slots={Math.max(layout.slots, cards.length)} cardProps={cardProps} emptySize={emptySize} />;
}

function CardRow({ cards, slots, cardProps, emptySize }: { cards: Card[]; slots: number; cardProps: { tiny: true } | { small: true }; emptySize: { width: number; height: number } }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: slots }).map((_, i) => <CardSlot key={i} card={cards[i]} cardProps={cardProps} emptySize={emptySize} />)}
    </div>
  );
}

function CardSlot({ card, cardProps, emptySize }: { card?: Card; cardProps: { tiny: true } | { small: true }; emptySize: { width: number; height: number } }) {
  return card ? (
    <div className="drop-shadow-lg">
      <CardFace card={card} {...cardProps} />
    </div>
  ) : (
    <div className="rounded border border-dashed border-green-700/25" style={emptySize} />
  );
}
