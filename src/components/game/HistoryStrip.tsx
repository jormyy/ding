"use client";

import { PHASE_SHORT_LABELS } from "@/lib/constants";

interface HistoryStripProps {
  ranks: (number | null)[];
  total: number;
}

export default function HistoryStrip({ ranks, total }: HistoryStripProps) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {PHASE_SHORT_LABELS.map((lab, i) => {
        const r = ranks[i] ?? null;
        const isFirst = r === 1;
        const isLast = r !== null && r === total;
        const bg = r === null
          ? "rgba(255,255,255,0.05)"
          : isFirst
          ? "#c9a54a"
          : isLast
          ? "#6a1822"
          : "rgba(255,255,255,0.1)";
        const col = r === null
          ? "rgba(255,255,255,0.2)"
          : isFirst
          ? "#2a1a08"
          : isLast
          ? "#e06070"
          : "rgba(245,230,184,0.85)";
        const bdr = r === null
          ? "rgba(255,255,255,0.1)"
          : isFirst
          ? "#f0d278"
          : isLast
          ? "#a84040"
          : "rgba(255,255,255,0.2)";
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                fontSize: 7,
                color: "rgba(201,165,74,0.55)",
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
