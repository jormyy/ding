"use client";

/**
 * Strip of small phase-rank history chips below a hand. Each chip shows the
 * rank that hand was placed at when each prior phase ended.
 */

import { memo } from "react";
import { HistoryChip } from "../../RankChip";
import { PHASE_HISTORY_LABELS } from "@/lib/constants";

export interface SeatHistoryStripProps {
  history: (number | null)[];
  totalHands: number;
}

function SeatHistoryStripImpl({ history, totalHands }: SeatHistoryStripProps) {
  if (history.length === 0) return null;
  return (
    <div className="flex gap-0.5 mt-0.5">
      {history.map((r, phaseIdx) => (
        <HistoryChip
          key={phaseIdx}
          rank={r}
          total={totalHands}
          phaseLabel={PHASE_HISTORY_LABELS[phaseIdx] ?? ""}
        />
      ))}
    </div>
  );
}

export const SeatHistoryStrip = memo(SeatHistoryStripImpl);
