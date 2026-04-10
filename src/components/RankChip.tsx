"use client";

interface RankChipProps {
  rank: number; // 1-indexed, 1 = best
  total: number;
  isOwn: boolean;
  isSelected: boolean;
  hasSelection: boolean; // any chip currently selected
  onClick: () => void;
}

export default function RankChip({
  rank,
  total,
  isOwn,
  isSelected,
  hasSelection,
  onClick,
}: RankChipProps) {
  const isClickable = isOwn || hasSelection;

  // Color based on rank position
  const isFirst = rank === 1;
  const isLast = rank === total;

  let chipBg = "bg-gray-700 border-gray-500 text-white";
  if (isFirst) chipBg = "bg-amber-500 border-amber-300 text-amber-950";
  else if (isLast) chipBg = "bg-red-950 border-red-800 text-red-300";

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={[
        "w-8 h-8 rounded-full font-black text-xs flex items-center justify-center border-2 select-none transition-all duration-150",
        chipBg,
        isClickable ? "cursor-pointer" : "cursor-default",
        isClickable && !isSelected ? "hover:scale-110" : "",
        isSelected
          ? "scale-125 ring-[3px] ring-yellow-400 ring-offset-[2px] ring-offset-gray-950 shadow-lg shadow-yellow-400/40"
          : "",
        hasSelection && !isSelected && isClickable
          ? "ring-1 ring-yellow-400/30 hover:ring-yellow-400/70"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {rank}
    </button>
  );
}
