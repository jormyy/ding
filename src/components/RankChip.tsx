"use client";

interface RankChipProps {
  rank: number; // 1-indexed, 1 = best
  total: number;
  isOwn: boolean;
  isSelected: boolean;
  hasSelection: boolean; // any chip/slot currently selected
  onClick: () => void;
  onDoubleClick?: () => void;
  small?: boolean;
  tiny?: boolean; // for history chips
}

export default function RankChip({
  rank,
  total,
  isOwn,
  isSelected,
  hasSelection,
  onClick,
  onDoubleClick,
  small = false,
  tiny = false,
}: RankChipProps) {
  const isClickable = isOwn || hasSelection;

  // Color based on rank position
  const isFirst = rank === 1;
  const isLast = rank === total;

  let chipBg = "bg-gray-700 border-gray-500 text-white";
  if (isFirst) chipBg = "bg-amber-500 border-amber-300 text-amber-950";
  else if (isLast) chipBg = "bg-red-950 border-red-800 text-red-300";

  const sizeClass = tiny
    ? "w-4 h-4 text-[8px]"
    : small
    ? "w-6 h-6 text-[10px]"
    : "w-8 h-8 text-xs";

  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      disabled={!isClickable}
      className={[
        "rounded-full font-black flex items-center justify-center border-2 select-none transition-all duration-150",
        sizeClass,
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

interface HistoryChipProps {
  rank: number | null;
  total: number;
  phaseLabel: string;
}

export function HistoryChip({ rank, total, phaseLabel }: HistoryChipProps) {
  const isFirst = rank === 1;
  const isLast = rank === total;

  let chipBg = "bg-gray-700/60 border-gray-600/50 text-gray-300";
  if (rank === null) chipBg = "bg-gray-800/40 border-gray-700/30 text-gray-600";
  else if (isFirst) chipBg = "bg-amber-600/60 border-amber-400/50 text-amber-100";
  else if (isLast) chipBg = "bg-red-950/70 border-red-800/50 text-red-400";

  return (
    <div className="flex flex-col items-center gap-[1px]">
      <div
        className={[
          "w-4 h-4 rounded-full font-black flex items-center justify-center border text-[8px] select-none",
          chipBg,
        ].join(" ")}
      >
        {rank ?? "–"}
      </div>
      <div className="text-[6px] text-gray-600 uppercase tracking-wide leading-none">
        {phaseLabel}
      </div>
    </div>
  );
}
