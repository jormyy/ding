"use client";

import type { Card } from "@/lib/types";
import { getSuitSymbol, getRankDisplay } from "@/lib/utils";

const SUIT_COLOR: Record<string, string> = {
  H: "text-red-500",
  D: "text-blue-500",
  C: "text-emerald-600",
  S: "text-gray-900",
};

interface CardFaceProps {
  card: Card;
  small?: boolean;
  tiny?: boolean;
}

export function CardFace({ card, small = false, tiny = false }: CardFaceProps) {
  const symbol = getSuitSymbol(card.suit);
  const colorClass = SUIT_COLOR[card.suit] ?? "text-gray-900";
  const rankDisplay = getRankDisplay(card.rank);

  if (tiny) {
    return (
      <div
        className="bg-white rounded-sm shadow-sm flex flex-col items-center justify-between px-px py-px select-none"
        style={{ width: 26, height: 38 }}
      >
        <div className={`text-[8px] font-black leading-none ${colorClass}`}>
          {rankDisplay}
        </div>
        <div className={`text-[13px] leading-none ${colorClass}`}>{symbol}</div>
        <div className={`text-[8px] font-black leading-none rotate-180 ${colorClass}`}>
          {rankDisplay}
        </div>
      </div>
    );
  }

  if (small) {
    return (
      <div className="bg-white rounded-md shadow-sm flex flex-col items-center justify-between p-0.5 select-none"
        style={{ width: 36, height: 52 }}>
        <div className={`text-xs font-black leading-none ${colorClass}`}>
          {rankDisplay}
        </div>
        <div className={`text-xl leading-none ${colorClass}`}>{symbol}</div>
        <div className={`text-xs font-black leading-none rotate-180 ${colorClass}`}>
          {rankDisplay}
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
          {rankDisplay}
        </div>
        <div className={`text-sm leading-none ${colorClass}`}>{symbol}</div>
      </div>

      {/* Center suit */}
      <div className={`text-3xl leading-none ${colorClass}`}>{symbol}</div>

      {/* Bottom rank + suit (rotated) */}
      <div className="self-end rotate-180">
        <div className={`text-sm font-black leading-none ${colorClass}`}>
          {rankDisplay}
        </div>
        <div className={`text-sm leading-none ${colorClass}`}>{symbol}</div>
      </div>
    </div>
  );
}

export function CardBack({ small = false, tiny = false }: { small?: boolean; tiny?: boolean }) {
  if (tiny) {
    return (
      <div
        className="rounded-sm shadow-sm select-none overflow-hidden bg-blue-900 border border-blue-700"
        style={{ width: 26, height: 38 }}
      >
        <div className="w-full h-full bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_2px,transparent_2px,transparent_8px)]" />
      </div>
    );
  }

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

