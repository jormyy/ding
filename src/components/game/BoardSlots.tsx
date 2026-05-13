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
  const hintCount = Math.min(8, ranking.length);

  return (
    <div className="flex flex-col items-center gap-0.5 mt-0.5" style={{ maxWidth: isMobile ? "52%" : "70%" }}>
      <div className="text-[8px] font-black uppercase tracking-[0.18em] text-green-100/35 select-none">
        1-{hintCount}
      </div>
      <div className="flex gap-1 flex-wrap justify-center">
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
    </div>
  );
}
