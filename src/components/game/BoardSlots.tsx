"use client";

import { chipClassNames } from "@/lib/chipColors";

interface BoardSlotsProps {
  ranking: (string | null)[];
  selectedSlot: number | null;
  selectedHandId: string | null;
  onSlotClick: (slotIndex: number) => void;
  totalHands: number;
  isMobile: boolean;
}

export default function BoardSlots({
  ranking,
  selectedSlot,
  selectedHandId,
  onSlotClick,
  totalHands,
  isMobile,
}: BoardSlotsProps) {
  const chipSize = isMobile ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";

  return (
    <div
      className="flex gap-1 flex-wrap justify-center mt-0.5"
      style={{ maxWidth: isMobile ? "52%" : "70%" }}
    >
      {ranking.map((claimedId, slotIndex) => {
        const rank = slotIndex + 1;
        const isUnclaimed = claimedId === null;
        const isSlotSelected = selectedSlot === slotIndex;

        if (!isUnclaimed) {
          return <div key={slotIndex} className={chipSize} />;
        }

        return (
          <button
            key={slotIndex}
            onClick={() => onSlotClick(slotIndex)}
            className={[
              "rounded-full font-black flex items-center justify-center border-2 select-none transition-all duration-150 cursor-pointer",
              chipSize,
              chipClassNames(rank, totalHands),
              isSlotSelected
                ? "scale-125 ring-[3px] ring-yellow-400 ring-offset-[2px] ring-offset-green-900 shadow-lg shadow-yellow-400/40"
                : "hover:scale-110",
              selectedHandId !== null && !isSlotSelected
                ? "ring-1 ring-yellow-400/40 hover:ring-yellow-400/70"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {rank}
          </button>
        );
      })}
    </div>
  );
}
