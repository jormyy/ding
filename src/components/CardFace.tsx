"use client";

import { useEffect, useRef, useState } from "react";
import type { CardMeta, DisplayedCard, Suit } from "@/lib/types";
import { getSuitSymbol, getRankDisplay } from "@/lib/utils";

const SUIT_COLOR: Record<string, string> = {
  H: "text-red-500",
  D: "text-blue-500",
  C: "text-emerald-600",
  S: "text-gray-900",
};

const META_CORNER_GLYPH: Partial<Record<NonNullable<CardMeta>, string>> = {
  blessed: "✦",
  cursed: "⊕",
  marked: "•",
  counterfeit: "≈",
  trickster: "♕",
  glitched: "▦",
  twoSuited: "⇆",
};

const META_FRAME_CLASS: Partial<Record<NonNullable<CardMeta>, string>> = {
  blessed: "card-meta-blessed",
  cursed: "card-meta-cursed",
  glitched: "card-meta-glitched",
  marked: "ring-2 ring-slate-700/80",
  counterfeit: "ring-1 ring-dashed ring-rose-400/70 opacity-90",
  trickster: "ring-2 ring-fuchsia-500/80",
};

const META_CORNER_COLOR: Partial<Record<NonNullable<CardMeta>, string>> = {
  blessed: "text-amber-500",
  cursed: "text-red-600",
  marked: "text-slate-700",
  counterfeit: "text-rose-500",
  trickster: "text-fuchsia-600",
  glitched: "text-purple-600",
  twoSuited: "text-indigo-600",
};

interface CardFaceProps {
  card: DisplayedCard;
  small?: boolean;
  tiny?: boolean;
  /** When true, hide the suit symbol — used by board cards when stripBoardSuits is in effect. */
  suitStripped?: boolean;
}

function twoSuitedPartnerSuit(suit: Suit | undefined): Suit | null {
  if (!suit) return null;
  // Pair red↔red and black↔black so flushes always have a complementary half.
  return suit === "H" ? "D" : suit === "D" ? "H" : suit === "C" ? "S" : "C";
}

export function CardFace({ card, small = false, tiny = false, suitStripped = false }: CardFaceProps) {
  const isUncertain = (card.possibleIdentities?.length ?? 0) > 0;
  const justCollapsed = card.justCollapsed === true;
  const animationFiredRef = useRef(false);
  const [collapsing, setCollapsing] = useState(false);

  useEffect(() => {
    if (justCollapsed && !animationFiredRef.current) {
      animationFiredRef.current = true;
      setCollapsing(true);
      const t = setTimeout(() => setCollapsing(false), 460);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [justCollapsed]);

  const meta = card.meta;
  const isWildSpecial = meta === "joker" || meta === "tarot";
  const metaFrameClass = meta ? META_FRAME_CLASS[meta] ?? "" : "";
  const metaCornerGlyph = meta ? META_CORNER_GLYPH[meta] : undefined;
  const metaCornerColor = meta ? META_CORNER_COLOR[meta] ?? "text-slate-600" : "";

  const uncertaintyClass = isUncertain
    ? "ring-2 ring-yellow-300/90 animate-uncertain"
    : collapsing
      ? "animate-card-collapse"
      : metaFrameClass;
  const symbol = isWildSpecial
    ? meta === "joker" ? "J" : "T"
    : isUncertain ? "?"
      : suitStripped ? "·"
        : card.suit ? getSuitSymbol(card.suit) : card.color === "red" ? "●" : card.color === "black" ? "●" : "?";
  const colorClass = isUncertain
    ? "text-yellow-600"
    : card.suit
      ? SUIT_COLOR[card.suit] ?? "text-gray-900"
      : card.color === "red"
        ? "text-red-500"
        : card.color === "black"
          ? "text-gray-900"
          : "text-gray-500";
  const rankDisplay = isWildSpecial ? "W" : isUncertain ? "?" : card.rank ? getRankDisplay(card.rank) : "?";
  const partnerSuit = meta === "twoSuited" ? twoSuitedPartnerSuit(card.suit) : null;
  const partnerSuitSymbol = partnerSuit ? getSuitSymbol(partnerSuit) : null;
  const partnerSuitClass = partnerSuit ? SUIT_COLOR[partnerSuit] ?? "text-gray-900" : "";

  if (tiny) {
    return (
      <div
        className={`relative bg-white rounded-sm shadow-sm flex flex-col items-center justify-between px-px py-px select-none ${uncertaintyClass}`}
        style={{ width: 26, height: 38 }}
        data-meta={meta}
      >
        {metaCornerGlyph && (
          <span className={`absolute top-px right-px text-[7px] leading-none ${metaCornerColor}`} aria-hidden>{metaCornerGlyph}</span>
        )}
        <div className={`text-[8px] font-black leading-none ${colorClass}`}>{rankDisplay}</div>
        <div className={`text-[13px] leading-none ${colorClass}`}>{symbol}</div>
        <div className={`text-[8px] font-black leading-none rotate-180 ${colorClass}`}>{rankDisplay}</div>
      </div>
    );
  }

  if (small) {
    return (
      <div className={`relative bg-white rounded-md shadow-sm flex flex-col items-center justify-between p-0.5 select-none ${uncertaintyClass}`}
        style={{ width: 36, height: 52 }}
        data-meta={meta}>
        {metaCornerGlyph && (
          <span className={`absolute top-0.5 right-0.5 text-[9px] leading-none ${metaCornerColor}`} aria-hidden>{metaCornerGlyph}</span>
        )}
        <div className={`text-xs font-black leading-none ${colorClass}`}>{rankDisplay}</div>
        <div className={`text-xl leading-none flex items-center gap-0.5 ${colorClass}`}>
          {symbol}
          {partnerSuitSymbol && (
            <span className={`text-xs ${partnerSuitClass}`} aria-hidden>{partnerSuitSymbol}</span>
          )}
        </div>
        <div className={`text-xs font-black leading-none rotate-180 ${colorClass}`}>{rankDisplay}</div>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-white rounded-lg shadow-md flex flex-col items-center justify-between p-1 select-none ${uncertaintyClass}`}
      style={{ width: 56, height: 80 }}
      data-meta={meta}
    >
      {metaCornerGlyph && (
        <span className={`absolute top-1 right-1 text-[10px] leading-none ${metaCornerColor}`} aria-hidden>
          {metaCornerGlyph}
        </span>
      )}
      <div className="self-start">
        <div className={`text-sm font-black leading-none ${colorClass}`}>{rankDisplay}</div>
        <div className={`text-sm leading-none ${colorClass}`}>{symbol}</div>
      </div>

      <div className={`text-3xl leading-none flex items-baseline gap-0.5 ${colorClass}`}>
        {symbol}
        {partnerSuitSymbol && (
          <span className={`text-xl ${partnerSuitClass}`} aria-hidden>{partnerSuitSymbol}</span>
        )}
      </div>

      <div className="self-end rotate-180">
        <div className={`text-sm font-black leading-none ${colorClass}`}>{rankDisplay}</div>
        <div className={`text-sm leading-none ${colorClass}`}>{symbol}</div>
      </div>
    </div>
  );
}

const CARD_BACK_STRIPE = "bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_2px,transparent_2px,transparent_8px)]";

export function CardBack({ small = false, tiny = false }: { small?: boolean; tiny?: boolean }) {
  if (tiny) {
    return (
      <div
        className="rounded-sm shadow-sm select-none overflow-hidden bg-blue-900 border border-blue-700"
        style={{ width: 26, height: 38 }}
      >
        <div className={`w-full h-full ${CARD_BACK_STRIPE}`} />
      </div>
    );
  }

  if (small) {
    return (
      <div
        className="rounded-md shadow-sm select-none overflow-hidden bg-blue-900 border border-blue-700"
        style={{ width: 36, height: 52 }}
      >
        <div className={`w-full h-full ${CARD_BACK_STRIPE}`} />
      </div>
    );
  }

  return (
    <div
      className="rounded-lg shadow-md select-none overflow-hidden bg-blue-900 border border-blue-700"
      style={{ width: 56, height: 80 }}
    >
      <div className={`w-full h-full ${CARD_BACK_STRIPE} flex items-center justify-center`}>
        <div className="text-blue-300 text-opacity-30 text-xs font-bold tracking-widest rotate-90">
          DING
        </div>
      </div>
    </div>
  );
}
