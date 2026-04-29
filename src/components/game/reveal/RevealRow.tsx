"use client";

import type { RevealRow as RevealRowData } from "@/lib/reveal/leaderboard";
import { CardFace } from "../../CardFace";
import DisplayChip from "../DisplayChip";
import { D } from "@/lib/theme";

interface RevealRowProps {
  row: RevealRowData;
  total: number;
}

export default function RevealRow({ row, total }: RevealRowProps) {
  const disp = row.delta !== null ? Math.abs(row.delta) : 0;
  const dispColor =
    disp === 0 ? D.accent : disp <= 1 ? D.gold : disp <= 2 ? D.goldBright : D.danger;

  return (
    <div
      className="grid gap-2 items-center px-2.5 py-1.5 rounded-lg"
      style={{
        gridTemplateColumns: "28px 58px minmax(0,1fr) 62px 48px 20px",
        background: row.mine ? `${D.gold}1a` : "rgba(255,255,255,0.022)",
        border: `1px solid ${row.mine ? D.gold + "55" : "rgba(255,255,255,0.05)"}`,
      }}
    >
      <DisplayChip rank={row.trueRank} total={total} mine={row.mine} size={24} />

      <div className="flex gap-0.5">
        {row.hand.cards.length > 0 ? (
          row.hand.cards.map((c, j) => <CardFace key={j} card={c} tiny />)
        ) : (
          <>
            <div className="rounded-sm" style={{ width: 26, height: 36, background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.15)" }} />
            <div className="rounded-sm" style={{ width: 26, height: 36, background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.15)" }} />
          </>
        )}
      </div>

      <div className="flex flex-col gap-0 min-w-0">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-extrabold text-[13px] truncate" style={{ color: row.mine ? D.goldTop : D.text }}>
            {row.player?.name ?? "?"}
          </span>
          {row.mine && <span className="text-[8px] font-black flex-none" style={{ color: D.accent }}>YOU</span>}
        </div>
        {row.madeHand && (
          <div className="text-[11px] truncate italic" style={{ color: D.sub, fontFamily: D.serif }}>
            {row.madeHand}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-0">
        <div className="text-[7px] font-black tracking-widest" style={{ color: "rgba(201,165,74,0.55)" }}>RANKED</div>
        <div
          className="font-black leading-none tabular-nums"
          style={{ fontSize: 16, fontFamily: D.serif, color: row.correct ? D.accent : dispColor }}
        >
          #{row.guessedRank ?? "–"}
        </div>
      </div>

      <div className="flex flex-col items-center gap-0">
        <div className="text-[7px] font-black tracking-widest" style={{ color: "rgba(201,165,74,0.55)" }}>DELTA</div>
        <div
          className="text-[11px] font-black tabular-nums"
          style={{ fontFamily: D.serif, color: row.correct ? D.accent : dispColor }}
        >
          {row.correct
            ? "—"
            : row.delta !== null
            ? row.delta > 0
              ? `+${row.delta}`
              : `${row.delta}`
            : "–"}
        </div>
      </div>

      <div className="text-sm font-black text-center" style={{ color: row.correct ? D.accent : D.danger }}>
        {row.correct ? "✓" : "✗"}
      </div>
    </div>
  );
}
