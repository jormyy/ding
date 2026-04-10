"use client";

import type { Card, Suit } from "@/lib/types";
import { getSuitSymbol, isRedSuit } from "@/lib/utils";

interface CardFaceProps {
  card: Card;
  small?: boolean;
}

export function CardFace({ card, small = false }: CardFaceProps) {
  const red = isRedSuit(card.suit);
  const symbol = getSuitSymbol(card.suit);
  const colorClass = red ? "text-red-500" : "text-gray-900";

  if (small) {
    return (
      <div className="bg-white rounded-md shadow-sm flex flex-col items-center justify-between p-0.5 w-9 h-13 select-none"
        style={{ width: 36, height: 52 }}>
        <div className={`text-xs font-black leading-none ${colorClass}`}>
          {card.rank}
        </div>
        <div className={`text-sm leading-none ${colorClass}`}>{symbol}</div>
        <div className={`text-xs font-black leading-none rotate-180 ${colorClass}`}>
          {card.rank}
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-lg shadow-md flex flex-col items-center justify-between p-1 select-none"
      style={{ width: 56, height: 80 }}
    >
      {/* Top rank + suit */}
      <div className="self-start">
        <div className={`text-sm font-black leading-none ${colorClass}`}>
          {card.rank}
        </div>
        <div className={`text-xs leading-none ${colorClass}`}>{symbol}</div>
      </div>

      {/* Center suit */}
      <div className={`text-2xl leading-none ${colorClass}`}>{symbol}</div>

      {/* Bottom rank + suit (rotated) */}
      <div className="self-end rotate-180">
        <div className={`text-sm font-black leading-none ${colorClass}`}>
          {card.rank}
        </div>
        <div className={`text-xs leading-none ${colorClass}`}>{symbol}</div>
      </div>
    </div>
  );
}

export function CardBack({ small = false }: { small?: boolean }) {
  if (small) {
    return (
      <div
        className="rounded-md shadow-sm select-none overflow-hidden bg-blue-900 border border-blue-700"
        style={{ width: 36, height: 52 }}
      >
        <div className="w-full h-full bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_2px,transparent_2px,transparent_8px)]" />
      </div>
    );
  }

  return (
    <div
      className="rounded-lg shadow-md select-none overflow-hidden bg-blue-900 border border-blue-700"
      style={{ width: 56, height: 80 }}
    >
      <div className="w-full h-full bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_2px,transparent_2px,transparent_8px)] flex items-center justify-center">
        <div className="text-blue-300 text-opacity-30 text-xs font-bold tracking-widest rotate-90">
          DING
        </div>
      </div>
    </div>
  );
}

interface FlippableCardProps {
  card: Card | null; // null = show back
  flipped: boolean;
  animating?: boolean;
  small?: boolean;
}

export function FlippableCard({ card, flipped, animating, small }: FlippableCardProps) {
  return (
    <div
      className="perspective"
      style={{ width: small ? 36 : 56, height: small ? 52 : 80 }}
    >
      <div
        className={`card-flip relative w-full h-full ${flipped ? "flipped" : ""} ${animating ? "animate-flip" : ""}`}
      >
        {/* Front (card face) */}
        <div className="card-back-face absolute inset-0">
          {card ? (
            <CardFace card={card} small={small} />
          ) : (
            <CardBack small={small} />
          )}
        </div>
        {/* Back (card back) */}
        <div className="card-face absolute inset-0">
          <CardBack small={small} />
        </div>
      </div>
    </div>
  );
}

export function EmptyCardSlot({ small = false }: { small?: boolean }) {
  return (
    <div
      className="rounded-lg border-2 border-dashed border-gray-700 bg-gray-900/50"
      style={{ width: small ? 36 : 56, height: small ? 52 : 80 }}
    />
  );
}
