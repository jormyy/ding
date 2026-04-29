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

  const phases = ["preflop", "flop", "turn", "river"] as const;

  const bestInCol: Record<string, number> = {};
  const worstInCol: Record<string, number> = {};
  for (const phase of phases) {
    const vals = data.entries
      .map((e) => e[`${phase}Avg` as keyof typeof e] as number | null)
      .filter((v): v is number => v !== null);
    if (vals.length > 0) {
      bestInCol[phase] = Math.min(...vals);
      worstInCol[phase] = Math.max(...vals);
    }
  }
  const cumVals = data.entries.map((e) => e.cumulativeAvg);
  bestInCol["cumulative"] = Math.min(...cumVals);
  worstInCol["cumulative"] = Math.max(...cumVals);

  const fmt = (v: number | null) => (v !== null ? v.toFixed(1) : "–");

  return (
    <div
      className="flex-none"
      style={{
        marginTop: 8,
        padding: "10px 12px",
        borderRadius: 10,
        background: "rgba(201,165,74,0.04)",
        border: "1px solid rgba(201,165,74,0.15)",
      }}
    >
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(201,165,74,0.55)" }}>
          Phase Leaders
        </span>
        {phases.map((phase) => (
          <div key={phase} className="flex items-center gap-1">
            <span
              className="text-[9px] font-black"
              style={{ color: "rgba(201,165,74,0.45)" }}
            >
              {PHASE_SHORT_LABELS[phases.indexOf(phase)]}
            </span>
            <span
              className="text-[11px] font-bold truncate max-w-[80px]"
              style={{ color: data.phaseLeaders[phase] ? D.goldTop : "rgba(255,255,255,0.2)" }}
            >
              {data.phaseLeaders[phase] ?? "–"}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(201,165,74,0.55)" }}>
          Team Inv
        </span>
        {phases.map((phase) => {
          const inv = data.teamInversions[phase];
          const maxInv = (totalHands * (totalHands - 1)) / 2;
          const pct = maxInv > 0 ? Math.round((1 - inv / maxInv) * 100) : 100;
          return (
            <div key={phase} className="flex items-center gap-1">
              <span className="text-[9px] font-black" style={{ color: "rgba(201,165,74,0.45)" }}>
                {PHASE_SHORT_LABELS[phases.indexOf(phase)]}
              </span>
              <span
                className="text-[11px] font-bold tabular-nums"
                style={{ color: inv === 0 ? D.accent : D.goldBright }}
              >
                {inv}
              </span>
              <span className="text-[9px] tabular-nums" style={{ color: "rgba(255,255,255,0.25)" }}>
                ({pct}%)
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="grid gap-1.5 text-[9px] font-black uppercase tracking-wider mb-1.5"
        style={{
          gridTemplateColumns: "1fr 42px 42px 42px 42px 48px",
          color: "rgba(201,165,74,0.45)",
        }}
      >
        <div className="pl-1">Player</div>
        <div className="text-center">{PHASE_SHORT_LABELS[0]}</div>
        <div className="text-center">{PHASE_SHORT_LABELS[1]}</div>
        <div className="text-center">{PHASE_SHORT_LABELS[2]}</div>
        <div className="text-center">{PHASE_SHORT_LABELS[3]}</div>
        <div className="text-center">Avg</div>
      </div>

      {data.entries.slice(0, 8).map((entry) => (
        <div
          key={entry.playerId}
          className="grid gap-1.5 items-center py-1 rounded"
          style={{
            gridTemplateColumns: "1fr 42px 42px 42px 42px 48px",
            background: entry.mine ? `${D.gold}18` : "transparent",
          }}
        >
          <div
            className="text-xs font-bold truncate pl-1"
            style={{ color: entry.mine ? D.goldTop : D.text }}
          >
            {entry.name}
            {entry.mine && (
              <span className="text-[9px] ml-1" style={{ color: D.accent }}>(you)</span>
            )}
          </div>

          {phases.map((phase) => {
            const val = entry[`${phase}Avg` as keyof typeof entry] as number | null;
            const isBest = val !== null && val === bestInCol[phase] && worstInCol[phase] !== bestInCol[phase];
            const isWorst = val !== null && val === worstInCol[phase] && worstInCol[phase] !== bestInCol[phase];
            return (
              <div
                key={phase}
                className="text-[11px] font-bold text-center tabular-nums rounded py-px"
                style={{
                  color: val === null
                    ? "rgba(255,255,255,0.2)"
                    : isBest
                    ? D.accent
                    : isWorst
                    ? D.danger
                    : D.goldBright,
                  background: isBest
                    ? "rgba(47,184,115,0.12)"
                    : isWorst
                    ? "rgba(192,96,96,0.12)"
                    : "transparent",
                }}
              >
                {fmt(val)}
              </div>
            );
          })}

          <div
            className="text-[11px] font-bold text-center tabular-nums rounded py-px"
            style={{
              color: entry.cumulativeAvg === bestInCol["cumulative"] && bestInCol["cumulative"] !== worstInCol["cumulative"]
                ? D.accent
                : entry.cumulativeAvg === worstInCol["cumulative"] && bestInCol["cumulative"] !== worstInCol["cumulative"]
                ? D.danger
                : D.goldBright,
              background: entry.cumulativeAvg === bestInCol["cumulative"] && bestInCol["cumulative"] !== worstInCol["cumulative"]
                ? "rgba(47,184,115,0.12)"
                : entry.cumulativeAvg === worstInCol["cumulative"] && bestInCol["cumulative"] !== worstInCol["cumulative"]
                ? "rgba(192,96,96,0.12)"
                : "transparent",
            }}
          >
            {fmt(entry.cumulativeAvg)}
          </div>
        </div>
      ))}
    </div>
  );
}
