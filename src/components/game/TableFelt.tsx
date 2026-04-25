"use client";

import type { Card, Phase } from "@/lib/types";
import { CardFace } from "../CardFace";

interface TableFeltProps {
  phase: Phase;
  communityCards: Card[];
  isMobile: boolean;
  isLandscape: boolean;
  feltInset: string;
  children?: React.ReactNode;
}

export default function TableFelt({
  phase,
  communityCards,
  isMobile,
  isLandscape,
  feltInset,
  children,
}: TableFeltProps) {
  const commCardProps = isMobile ? { tiny: true as const } : { small: true as const };
  const commCardW = isMobile ? 26 : 36;
  const commCardH = isMobile ? 38 : 52;

  const phaseLabel =
    phase === "preflop" ? "pre-flop"
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
        <div className="flex gap-1 pointer-events-none">
          {Array.from({ length: 5 }).map((_, i) => {
            const card = communityCards[i];
            return card ? (
              <div key={i} className="drop-shadow-lg">
                <CardFace card={card} {...commCardProps} />
              </div>
            ) : (
              <div
                key={i}
                className="rounded border border-dashed border-green-700/25"
                style={{ width: commCardW, height: commCardH }}
              />
            );
          })}
        </div>
        {children}
      </div>
    </>
  );
}
