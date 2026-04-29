"use client";

import type { PhasePerformanceData } from "@/lib/reveal/leaderboard";
import { PHASE_SHORT_LABELS } from "@/lib/constants";
import { D } from "@/lib/theme";

interface PhasePerformanceProps {
  data: PhasePerformanceData;
  totalHands: number;
}

export default function PhasePerformance({ data, totalHands }: PhasePerformanceProps) {
  if (data.entries.length === 0) return null;

  const bestInCol: Record<string, number> = {};
  const worstInCol: Record<string, number> = {};
  const phases = ["preflop", "flop", "turn", "river"] as const;
  for (const phase of phases) {
    const vals = data.entries
      .map((e) => e[`${phase}Avg` as keyof typeof e] as number | null)
      .filter((v): v is number => v !== null);
    if (vals.length > 0) {
      bestInCol[phase] = Math.min(...vals);
      worstInCol[phase] = Math.max(...vals);
    }
  }

  const fmt = (v: number | null) => (v !== null ? v.toFixed(1) : "–");
  const maxInv = (totalHands * (totalHands - 1)) / 2;

  return (
    <>
      <div
        className="flex items-center gap-2 px-2 mt-1"
        style={{ color: "rgba(201,165,74,0.45)", fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em" }}
      >
        <span style={{ width: 1, height: 10, background: "rgba(201,165,74,0.2)", borderRadius: 1 }} />
        Phase leaders:
        {phases.map((phase) => (
          <span key={phase} style={{ color: data.phaseLeaders[phase] ? D.gold : "rgba(255,255,255,0.2)" }}>
            {PHASE_SHORT_LABELS[phases.indexOf(phase)]}: {data.phaseLeaders[phase] ?? "–"}
          </span>
        ))}
        <span className="opacity-50">| Acc:</span>
        {phases.map((phase) => {
          const pct = maxInv > 0 ? Math.round((1 - data.teamInversions[phase] / maxInv) * 100) : 100;
          return (
            <span key={phase} className="tabular-nums" style={{ color: pct >= 90 ? D.accent : pct >= 70 ? D.goldBright : D.danger }}>
              {pct}%
            </span>
          );
        })}
      </div>

      <div
        className="grid gap-1 items-center px-2 py-1 text-[9px] font-black uppercase tracking-wider"
        style={{
          gridTemplateColumns: "26px 52px 1fr 24px 24px 24px 24px 40px 40px 20px",
          color: "rgba(201,165,74,0.4)",
        }}
      >
        <div />
        <div />
        <div>Player avg</div>
        <div className="text-center">{PHASE_SHORT_LABELS[0]}</div>
        <div className="text-center">{PHASE_SHORT_LABELS[1]}</div>
        <div className="text-center">{PHASE_SHORT_LABELS[2]}</div>
        <div className="text-center">{PHASE_SHORT_LABELS[3]}</div>
        <div className="text-center">TOT</div>
        <div />
        <div />
      </div>

      {data.entries.map((entry) => (
        <div
          key={entry.playerId}
          className="grid gap-1 items-center px-2 py-1 rounded"
          style={{
            gridTemplateColumns: "26px 52px 1fr 24px 24px 24px 24px 40px 40px 20px",
            background: entry.mine ? `${D.gold}14` : "rgba(255,255,255,0.02)",
            border: `1px solid ${entry.mine ? D.gold + "44" : "rgba(255,255,255,0.04)"}`,
          }}
        >
          <div />
          <div />
          <div
            className="text-[11px] font-bold truncate"
            style={{ color: entry.mine ? D.goldTop : D.text }}
          >
            {entry.name}
            {entry.mine && (
              <span className="text-[8px] ml-1" style={{ color: D.accent }}>(you)</span>
            )}
          </div>

          {phases.map((phase) => {
            const val = entry[`${phase}Avg` as keyof typeof entry] as number | null;
            const isBest = val !== null && val === bestInCol[phase] && worstInCol[phase] !== bestInCol[phase];
            const isWorst = val !== null && val === worstInCol[phase] && worstInCol[phase] !== bestInCol[phase];
            return (
              <div
                key={phase}
                className="text-[10px] font-bold text-center tabular-nums"
                style={{
                  color: val === null
                    ? "rgba(255,255,255,0.2)"
                    : isBest
                    ? D.accent
                    : isWorst
                    ? D.danger
                    : D.goldBright,
                }}
              >
                {fmt(val)}
              </div>
            );
          })}

          <div
            className="text-[10px] font-bold text-center tabular-nums"
            style={{ color: D.goldBright }}
          >
            {fmt(entry.cumulativeAvg)}
          </div>
          <div />
          <div />
        </div>
      ))}
    </>
  );
}
