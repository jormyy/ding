"use client";

import { chipColors } from "@/lib/chipColors";

interface DisplayChipProps {
  rank: number;
  total: number;
  mine?: boolean;
  size?: number;
}

export default function DisplayChip({
  rank,
  total,
  mine,
  size = 28,
}: DisplayChipProps) {
  let { bg, border, color } = chipColors(rank, total);
  if (mine && rank !== 1 && rank !== total) { bg = "#2fb873"; border = "#6ae09a"; color = "#04221a"; }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        border: `2px solid ${border}`,
        color,
        fontWeight: 900,
        fontSize: size * 0.46,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: 'var(--font-playfair), Georgia, serif',
      }}
    >
      {rank}
    </div>
  );
}
