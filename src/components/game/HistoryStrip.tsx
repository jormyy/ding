"use client";

import { PHASES_META } from "@/lib/constants";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";

const SHORT_LABELS = PHASES_META.filter((m) => m.short !== undefined).map((m) => m.short!);

interface HistoryStripProps {
  ranks: (number | null)[];
  total: number;
}

export default function HistoryStrip({ ranks, total }: HistoryStripProps) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {SHORT_LABELS.map((lab, i) => {
        const r = ranks[i] ?? null;
        const isFirst = r === 1;
        const isLast = r !== null && r === total;
        const bg = r === null
          ? surfaces.faintFill
          : isFirst
          ? D.gold
          : isLast
          ? "#6a1822"
          : surfaces.dividerLine;
        const col = r === null
          ? surfaces.dimmed
          : isFirst
          ? "#2a1a08"
          : isLast
          ? "#e06070"
          : "rgba(245,230,184,0.85)";
        const bdr = r === null
          ? surfaces.dividerLine
          : isFirst
          ? "#f0d278"
          : isLast
          ? "#a84040"
          : surfaces.dimmed;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                fontSize: 7,
                color: surfaces.goldEmphasis,
                fontWeight: 900,
                letterSpacing: 0.4,
              }}
            >
              {lab}
            </div>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                background: bg,
                border: `1px solid ${bdr}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 900,
                color: col,
              }}
            >
              {r ?? "–"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
