"use client";

import type { RevealRow as RevealRowData } from "@/lib/reveal/leaderboard";
import { CardFace } from "../../CardFace";
import DisplayChip from "../DisplayChip";
import HistoryStrip from "../HistoryStrip";
import { D } from "@/lib/theme";

interface RevealRowProps {
  row: RevealRowData;
  total: number;
}

export default function RevealRow({ row, total }: RevealRowProps) {
  return (
    <div
      className="grid gap-2 items-center px-2 py-1.5 rounded-lg"
      style={{
        gridTemplateColumns: "30px 60px 1fr 76px 66px 28px",
        background: row.mine ? `${D.gold}1a` : "rgba(255,255,255,0.02)",
        border: `1px solid ${row.mine ? D.gold + "55" : "rgba(255,255,255,0.05)"}`,
      }}
    >
      <DisplayChip rank={row.trueRank} total={total} mine={row.mine} size={26} />

      <div className="flex gap-1">
        {row.hand.cards.length > 0 ? (
          row.hand.cards.map((c, j) => <CardFace key={j} card={c} tiny />)
        ) : (
          <>
            <div className="rounded-sm" style={{ width: 26, height: 38, background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.15)" }} />
            <div className="rounded-sm" style={{ width: 26, height: 38, background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.15)" }} />
          </>
        )}
      </div>

      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-sm truncate" style={{ color: row.mine ? D.goldBright : D.text }}>
            {row.player?.name ?? "?"}
          </span>
          {row.mine && <span className="text-[9px] font-bold flex-none" style={{ color: D.accent }}>(you)</span>}
        </div>
        {row.madeHand && (
          <div className="text-[11px] truncate italic" style={{ color: D.sub, fontFamily: D.serif }}>
            {row.madeHand}
          </div>
        )}
      </div>

      <HistoryStrip ranks={row.history} total={total} />

      <div className="flex items-center gap-1.5">
        {row.guessedRank !== null ? (
          <>
            <div
              style={{
                width: 24, height: 24, borderRadius: "50%",
                background: row.correct ? "rgba(47,184,115,0.15)" : "rgba(192,96,96,0.15)",
                border: `1px solid ${row.correct ? D.accent + "77" : D.danger + "77"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 900,
                color: row.correct ? D.accent : D.danger,
                flexShrink: 0,
              }}
            >
              {row.guessedRank}
            </div>
            {!row.correct && row.delta !== null && (
              <div className="text-[10px] font-black tabular-nums" style={{ color: D.danger }}>
                {row.delta > 0 ? "+" : ""}{row.delta}
              </div>
            )}
          </>
        ) : (
          <div style={{ width: 24, height: 24, borderRadius: "50%", border: "1.5px dashed rgba(255,255,255,0.15)" }} />
        )}
      </div>

      <div className="text-base font-black text-center" style={{ color: row.correct ? D.accent : D.danger }}>
        {row.correct ? "✓" : "✗"}
      </div>
    </div>
  );
}
