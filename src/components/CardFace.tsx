"use client";

import { useEffect, useRef, useState } from "react";
import type { CardMeta, DisplayedCard, Suit } from "@/lib/types";
import { isRed } from "@/lib/deckUtils";
import { TAROT_NAMES, arcanaIndex } from "@/lib/tarotMetadata";
import { getSuitSymbol, getRankDisplay } from "@/lib/utils";
import { TarotArt } from "./cardArt/TarotArt";
import { JokerArt } from "./cardArt/JokerArt";
import { CounterfeitMark } from "./cardArt/CounterfeitMark";
import { TricksterMark } from "./cardArt/TricksterMark";
import { TwoSuitedSplit } from "./cardArt/TwoSuitedSplit";

type SizeKey = "default" | "small" | "tiny";

const SUIT_COLOR: Record<Suit, string> = {
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
  tarot: "✶",
  joker: "♛",
};

const META_FRAME_CLASS: Partial<Record<NonNullable<CardMeta>, string>> = {
  blessed: "card-meta-blessed",
  cursed: "card-meta-cursed",
  glitched: "card-meta-glitched",
  marked: "ring-2 ring-slate-700/80",
  counterfeit: "ring-1 ring-dashed ring-rose-400/70 opacity-90",
  trickster: "ring-2 ring-fuchsia-500/80",
  tarot: "ring-1 ring-amber-500/70",
};

const META_CORNER_COLOR: Partial<Record<NonNullable<CardMeta>, string>> = {
  blessed: "text-amber-500",
  cursed: "text-red-600",
  marked: "text-slate-700",
  counterfeit: "text-rose-500",
  trickster: "text-fuchsia-600",
  glitched: "text-purple-600",
  twoSuited: "text-indigo-600",
  tarot: "text-amber-600",
};

const CARD_DIMENSIONS: Record<SizeKey, {
  w: number;
  h: number;
  radius: string;
  shadow: string;
  padding: string;
  corner: string;
  cornerOffset: string;
  rank: string;
  symbol: string;
  center: string;
  centerExtra: string;
  partnerSymbol: string;
  wildCornerW: string;
  wildGlyph: string;
  wordmark: boolean;
}> = {
  tiny: {
    w: 26, h: 38, radius: "rounded-sm", shadow: "shadow-sm",
    padding: "px-px py-px", corner: "text-[7px]", cornerOffset: "top-px right-px",
    rank: "text-[8px]", symbol: "text-[8px]", center: "text-[13px]", centerExtra: "items-center justify-center",
    partnerSymbol: "text-xs",
    wildCornerW: "text-[7px]", wildGlyph: "text-[8px]", wordmark: false,
  },
  small: {
    w: 36, h: 52, radius: "rounded-md", shadow: "shadow-sm",
    padding: "p-0.5", corner: "text-[9px]", cornerOffset: "top-0.5 right-0.5",
    rank: "text-xs", symbol: "text-xs", center: "text-xl", centerExtra: "items-center justify-center flex-1 min-h-0",
    partnerSymbol: "text-xs",
    wildCornerW: "text-[8px]", wildGlyph: "text-[9px]", wordmark: false,
  },
  default: {
    w: 56, h: 80, radius: "rounded-lg", shadow: "shadow-md",
    padding: "p-1", corner: "text-[10px]", cornerOffset: "top-1 right-1",
    rank: "text-sm", symbol: "text-sm", center: "text-3xl", centerExtra: "items-baseline",
    partnerSymbol: "text-xl",
    wildCornerW: "text-[10px]", wildGlyph: "text-[11px]", wordmark: true,
  },
};

function getJokerStyle(suit: Suit | undefined): { bg: string; frame: string; corner: string } {
  const red = suit ? isRed(suit) : false;
  return red
    ? { bg: "bg-gradient-to-br from-red-50 to-rose-100", frame: "ring-1 ring-rose-400/60", corner: "text-rose-600" }
    : { bg: "bg-gradient-to-br from-slate-100 to-zinc-200", frame: "ring-1 ring-zinc-500/60", corner: "text-zinc-800" };
}

function twoSuitedPartnerSuit(suit: Suit | undefined): Suit | null {
  if (!suit) return null;
  return suit === "H" ? "D" : suit === "D" ? "H" : suit === "C" ? "S" : "C";
}

interface CardFaceProps {
  card: DisplayedCard;
  small?: boolean;
  tiny?: boolean;
  /** When true, hide the suit symbol — used by board cards when stripBoardSuits is in effect. */
  suitStripped?: boolean;
}

export function CardFace({ card, small = false, tiny = false, suitStripped = false }: CardFaceProps) {
  const sizeKey: SizeKey = tiny ? "tiny" : small ? "small" : "default";
  const dims = CARD_DIMENSIONS[sizeKey];

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
  const isTarot = meta === "tarot";
  const isJoker = meta === "joker";
  const isWildSpecial = isTarot || isJoker;
  const jokerStyle = isJoker ? getJokerStyle(card.suit) : null;

  const bgClass = isTarot
    ? "bg-gradient-to-br from-amber-50 to-yellow-100"
    : jokerStyle?.bg ?? "bg-white";
  const metaFrameClass = jokerStyle?.frame ?? (meta ? META_FRAME_CLASS[meta] ?? "" : "");
  const uncertaintyClass = isUncertain
    ? "ring-2 ring-yellow-300/90 animate-uncertain"
    : collapsing
      ? "animate-card-collapse"
      : metaFrameClass;

  const shellClass = `relative ${bgClass} ${dims.radius} ${dims.shadow} select-none ${uncertaintyClass} overflow-hidden`;
  const shellStyle = { width: dims.w, height: dims.h };

  if (isWildSpecial) {
    const wildCornerColor = jokerStyle?.corner ?? META_CORNER_COLOR.tarot ?? "";
    const wildCornerGlyph = META_CORNER_GLYPH[meta] ?? "";
    const arcanaName = isTarot ? TAROT_NAMES[arcanaIndex(card.artVariant)] : null;
    return (
      <div className={shellClass} style={shellStyle} data-meta={meta}>
        <div className="absolute inset-0 flex items-center justify-center">
          {isTarot
            ? <TarotArt variant={card.artVariant ?? 0} />
            : <JokerArt suit={card.suit} />}
        </div>
        <span className={`absolute top-0 left-0.5 ${dims.wildCornerW} font-black leading-none text-amber-900/80 z-10`} aria-hidden>W</span>
        <span className={`absolute top-0 right-0.5 ${dims.wildGlyph} leading-none ${wildCornerColor} z-10`} aria-hidden>{wildCornerGlyph}</span>
        <span className={`absolute bottom-0 right-0.5 ${dims.wildCornerW} font-black leading-none rotate-180 text-amber-900/80 z-10`} aria-hidden>W</span>
        {dims.wordmark && arcanaName && (
          <span
            className="absolute bottom-0 left-0 right-0 text-center text-[5px] uppercase tracking-wider text-amber-700/80 leading-none pointer-events-none z-10 bg-amber-50/60"
            style={{ fontVariant: "small-caps" }}
          >
            {arcanaName}
          </span>
        )}
      </div>
    );
  }

  const symbol = isUncertain ? "?"
    : suitStripped ? "·"
      : card.suit ? getSuitSymbol(card.suit)
        : card.color === "red" || card.color === "black" ? "●"
          : "?";
  const colorClass = isUncertain
    ? "text-yellow-600"
    : card.suit
      ? SUIT_COLOR[card.suit] ?? "text-gray-900"
      : card.color === "red"
        ? "text-red-500"
        : card.color === "black"
          ? "text-gray-900"
          : "text-gray-500";
  const rankDisplay = isUncertain ? "?" : card.rank ? getRankDisplay(card.rank) : "?";
  const partnerSuit = meta === "twoSuited" ? twoSuitedPartnerSuit(card.suit) : null;
  const partnerSuitSymbol = partnerSuit ? getSuitSymbol(partnerSuit) : null;
  const partnerSuitClass = partnerSuit ? SUIT_COLOR[partnerSuit] ?? "text-gray-900" : "";
  const metaCornerGlyph = meta ? META_CORNER_GLYPH[meta] : undefined;
  const metaCornerColor = meta ? META_CORNER_COLOR[meta] ?? "text-slate-600" : "";

  const rankAndSymbolStack = sizeKey === "default" ? (
    <>
      <div className={`text-sm font-black leading-none ${colorClass}`}>{rankDisplay}</div>
      <div className={`text-sm leading-none ${colorClass}`}>{symbol}</div>
    </>
  ) : null;

  return (
    <div
      className={`${shellClass} flex flex-col items-center justify-between ${dims.padding}`}
      style={shellStyle}
      data-meta={meta}
    >
      {meta === "twoSuited" && <TwoSuitedSplit suit={card.suit} partnerSuit={partnerSuit} />}
      {metaCornerGlyph && (
        <span className={`absolute ${dims.cornerOffset} ${dims.corner} leading-none ${metaCornerColor} z-10`} aria-hidden>
          {metaCornerGlyph}
        </span>
      )}
      {sizeKey === "default" ? (
        <div className="self-start z-10">{rankAndSymbolStack}</div>
      ) : (
        <div className={`${dims.rank} font-black leading-none ${colorClass} z-10`}>{rankDisplay}</div>
      )}
      <div className={`${dims.center} leading-none flex ${dims.centerExtra} gap-0.5 ${colorClass} z-10`}>
        {symbol}
        {partnerSuitSymbol && (
          <span className={`${dims.partnerSymbol} ${partnerSuitClass}`} aria-hidden>{partnerSuitSymbol}</span>
        )}
      </div>
      {sizeKey === "default" ? (
        <div className="self-end rotate-180 z-10">{rankAndSymbolStack}</div>
      ) : (
        <div className={`${dims.rank} font-black leading-none rotate-180 ${colorClass} z-10`}>{rankDisplay}</div>
      )}
      {meta === "counterfeit" && <CounterfeitMark size={sizeKey} />}
      {meta === "trickster" && <TricksterMark size={sizeKey} />}
    </div>
  );
}

const CARD_BACK_STRIPE = "bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_2px,transparent_2px,transparent_8px)]";

export function CardBack({ small = false, tiny = false }: { small?: boolean; tiny?: boolean }) {
  const sizeKey: SizeKey = tiny ? "tiny" : small ? "small" : "default";
  const dims = CARD_DIMENSIONS[sizeKey];
  return (
    <div
      className={`${dims.radius} ${dims.shadow} select-none overflow-hidden bg-blue-900 border border-blue-700`}
      style={{ width: dims.w, height: dims.h }}
    >
      <div className={`w-full h-full ${CARD_BACK_STRIPE} ${sizeKey === "default" ? "flex items-center justify-center" : ""}`}>
        {sizeKey === "default" && (
          <div className="text-blue-300 text-opacity-30 text-xs font-bold tracking-widest rotate-90">
            DING
          </div>
        )}
      </div>
    </div>
  );
}
