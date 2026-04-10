"use client";

import type { Card, Phase } from "@/lib/types";
import { CardFace, EmptyCardSlot } from "./CardFace";

interface CommunityCardsProps {
  cards: Card[];
  phase: Phase;
}

const PHASE_LABELS: Record<Phase, string> = {
  lobby: "Lobby",
  preflop: "Pre-Flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  reveal: "Reveal",
};

export default function CommunityCards({ cards, phase }: CommunityCardsProps) {
  const slots = 5;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-green-700/50" />
        <span className="text-green-400 text-xs font-bold tracking-widest uppercase">
          {PHASE_LABELS[phase]} — Community Cards
        </span>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-green-700/50" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: slots }).map((_, i) => {
          const card = cards[i];
          return card ? (
            <div key={i} className="drop-shadow-lg">
              <CardFace card={card} />
            </div>
          ) : (
            <EmptyCardSlot key={i} />
          );
        })}
      </div>
    </div>
  );
}
