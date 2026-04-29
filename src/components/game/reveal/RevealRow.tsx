"use client";

import type { RevealRow as RevealRowData } from "@/lib/reveal/leaderboard";
import { PHASE_SHORT_LABELS } from "@/lib/constants";
import { CardFace } from "../../CardFace";
import DisplayChip from "../DisplayChip";
import { D } from "@/lib/theme";

interface RevealRowProps {
  row: RevealRowData;
  total: number;
}

function phaseCellColor(disp: number | null): { bg: string; fg: string } {
  if (disp === null) return { bg: "rgba(255,255,255,0.04)", fg: "rgba(255,255,255,0.2)" };
  if (disp === 0) return { bg: "rgba(47,184,115,0.15)", fg: D.accent };
  if (disp <= 1) return { bg: "rgba(201,165,74,0.1)", fg: D.gold };
  if (disp <= 2) return { bg: "rgba(201,165,74,0.08)", fg: D.goldBright };
  return { bg: "rgba(192,96,96,0.12)", fg: D.danger };
}

export default function RevealRow({ row, total }: RevealRowProps) {
  const phaseScorePct = Math.round(row.phaseScore * 100);
  const scoreColor = phaseScorePct >= 80 ? D.accent : phaseScorePct >= 60 ? D.gold : phaseScorePct >= 40 ? D.goldBright : D.danger;

  return (
    <div
      className="grid gap-1 items-center px-2 py-1.5 rounded-lg"
      style={{
        gridTemplateColumns: "26px 52px 1fr 24px 24px 24px 24px 40px 40px 20px",
        background: row.mine ? `${D.gold}1a` : "rgba(255,255,255,0.02)",
        border: `1px solid ${row.mine ? D.gold + "55" : "rgba(255,255,255,0.05)"}`,
      }}
    >
      <DisplayChip rank={row.trueRank} total={total} mine={row.mine} size={22} />

      <div className="flex gap-0.5">
        {row.hand.cards.length > 0 ? (
          row.hand.cards.map((c, j) => <CardFace key={j} card={c} tiny />)
        ) : (
          <>
            <div className="rounded-sm" style={{ width: 24, height: 34, background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.15)" }} />
            <div className="rounded-sm" style={{ width: 24, height: 34, background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.15)" }} />
          </>
        )}
      </div>

      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-sm truncate" style={{ color: row.mine ? D.goldTop : D.text }}>
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

      {PHASE_SHORT_LABELS.map((lab, i) => {
        const rank = row.history[i];
        const disp = row.phaseDisplacements[i];
        const pcc = phaseCellColor(disp);
        return (
          <div key={lab} className="flex flex-col items-center">
            <div className="text-[7px] font-black opacity-50" style={{ color: "rgba(201,165,74,0.5)" }}>{lab}</div>
            <div
              className="flex items-center justify-center rounded text-[10px] font-black tabular-nums"
              style={{ width: 22, height: 22, background: pcc.bg, color: pcc.fg }}
            >
              {rank ?? "–"}
            </div>
          </div>
        );
      })}

      <div className="flex flex-col items-center">
        <div className="text-[7px] font-black opacity-50" style={{ color: "rgba(201,165,74,0.5)" }}>SCORE</div>
        <div
          className="flex items-center justify-center rounded text-[10px] font-black tabular-nums"
          style={{
            width: 36, height: 22,
            background: `rgba(${phaseScorePct >= 80 ? "47,184,115" : phaseScorePct >= 50 ? "201,165,74" : "192,96,96"},0.12)`,
            color: scoreColor,
          }}
        >
          {phaseScorePct}%
        </div>
      </div>

      <div className="flex items-center gap-1">
        {row.guessedRank !== null ? (
          <>
            <div
              style={{
                width: 22, height: 22, borderRadius: "50%",
                background: row.correct ? "rgba(47,184,115,0.15)" : "rgba(192,96,96,0.15)",
                border: `1px solid ${row.correct ? D.accent + "77" : D.danger + "77"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 900,
                color: row.correct ? D.accent : D.danger,
                flexShrink: 0,
              }}
            >
              {row.guessedRank}
            </div>
            {!row.correct && row.delta !== null && (
              <div className="text-[9px] font-black tabular-nums" style={{ color: D.danger }}>
                {row.delta > 0 ? "+" : ""}{row.delta}
              </div>
            )}
          </>
        ) : (
          <div style={{ width: 22, height: 22, borderRadius: "50%", border: "1.5px dashed rgba(255,255,255,0.15)" }} />
        )}
      </div>

      <div className="text-sm font-black text-center" style={{ color: row.correct ? D.accent : D.danger }}>
        {row.correct ? "✓" : "✗"}
      </div>
    </div>
  );
}
