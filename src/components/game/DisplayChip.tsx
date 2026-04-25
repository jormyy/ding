"use client";

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
  const isFirst = rank === 1;
  const isLast = rank === total;
  let bg = "#4a5568";
  let border = "#8a9ab0";
  let color = "#fff";
  if (isFirst) { bg = "#c9a54a"; border = "#f0d278"; color = "#2a1a08"; }
  else if (isLast) { bg = "#4a1014"; border = "#a84040"; color = "#ffb0b4"; }
  else if (mine) { bg = "#2fb873"; border = "#6ae09a"; color = "#04221a"; }
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
