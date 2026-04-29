"use client";

import { useEffect, useRef, useState } from "react";
import type { InversionsData } from "@/lib/reveal/leaderboard";
import { D } from "@/lib/theme";

const PHASES = ["Pre-flop", "Flop", "Turn", "River", "Reveal"] as const;
const PALETTE = ["#f0d278", "#e9a080", "#7aaac0", "#9fc5a8", "#d6a8d8", "#88c0a8", "#e8b563", "#c9a54a"];
// Unique dash patterns so overlapping lines stay distinguishable
const DASH_PATTERNS = ["none", "6 3", "2 3", "8 3 2 3", "1 4", "6 2 1 2"];

interface GraphProps {
  data: InversionsData;
  width: number;
  height: number;
}

function Graph({ data, width, height }: GraphProps) {
  const { invByPlayer, teamSeries, players, myId } = data;
  const padL = 36, padR = 72, padT = 16, padB = 30;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const xFor = (i: number) => padL + (i / (PHASES.length - 1)) * innerW;

  const allVals = [...teamSeries, ...Object.values(invByPlayer).flat()];
  const maxY = Math.max(...allVals, 1);
  const yFor = (v: number) => padT + (1 - v / maxY) * innerH;

  // Spread player lines by 0.1 of one Y-unit total, divided evenly across players
  const unitPx = innerH / maxY;
  const staggerBand = unitPx * 0.1;
  const staggerStep = players.length > 1 ? staggerBand / (players.length - 1) : 0;
  const staggerFor = (idx: number) => (idx - (players.length - 1) / 2) * staggerStep;

  const ticks: number[] = [];
  const tickCount = Math.min(5, maxY);
  for (let i = 0; i <= tickCount; i++) ticks.push(Math.round((i / tickCount) * maxY));
  const uniqTicks = [...new Set(ticks)];

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {uniqTicks.map((v) => (
        <g key={v}>
          <line x1={padL} y1={yFor(v)} x2={width - padR} y2={yFor(v)} stroke="rgba(201,165,74,0.08)" strokeWidth={1} />
          <text x={padL - 6} y={yFor(v) + 3} fill="rgba(201,165,74,0.5)" fontSize={9} fontWeight={800} textAnchor="end">
            {v}
          </text>
        </g>
      ))}

      {PHASES.map((p, i) => (
        <g key={p}>
          <line
            x1={xFor(i)} y1={padT} x2={xFor(i)} y2={height - padB}
            stroke="rgba(201,165,74,0.08)" strokeWidth={1}
            strokeDasharray={i === PHASES.length - 1 ? "" : "2 4"}
          />
          <text
            x={xFor(i)} y={height - padB + 14}
            fill={i === PHASES.length - 1 ? D.goldBright : D.gold}
            fontSize={9} fontWeight={900} textAnchor="middle"
          >
            {p}
          </text>
        </g>
      ))}

      <text
        x={padL - 30} y={padT + innerH / 2}
        fill="rgba(201,165,74,0.45)" fontSize={8} fontWeight={900}
        transform={`rotate(-90, ${padL - 30}, ${padT + innerH / 2})`}
        textAnchor="middle"
      >
        Inversions
      </text>

      {(() => {
        // Compute staggered end-label Y positions to avoid overlap
        const labelSpacing = 13;
        const labeled = players
          .map((p, idx) => {
            const series = invByPlayer[p.id];
            if (!series || series.length === 0) return null;
            return { p, idx, series, rawY: yFor(series[series.length - 1]) + staggerFor(idx) };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
          .sort((a, b) => a.rawY - b.rawY);

        // Push labels apart greedily from top
        const labelY: number[] = [];
        for (let i = 0; i < labeled.length; i++) {
          const desired = labeled[i].rawY + 3;
          const min = i === 0 ? desired : labelY[i - 1] + labelSpacing;
          labelY.push(Math.max(desired, min));
        }

        return labeled.map(({ p, idx, series }, li) => {
          const isMe = p.id === myId;
          const c = isMe ? D.accent : PALETTE[idx % PALETTE.length];
          const dashIdx = isMe ? 0 : (idx % (DASH_PATTERNS.length - 1)) + 1;
          const dash = DASH_PATTERNS[dashIdx];
          const off = staggerFor(idx);
          const yOff = (v: number) => yFor(v) + off;
          const path = series.map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yOff(v)}`).join(" ");
          const displayName = p.name.length > 8 ? p.name.slice(0, 8) + "…" : p.name;
          return (
            <g key={p.id}>
              <path d={path} fill="none" stroke={c}
                strokeWidth={isMe ? 2.5 : 1.5}
                strokeDasharray={dash === "none" ? undefined : dash}
                opacity={isMe ? 1 : 0.85}
                strokeLinejoin="round" strokeLinecap="round" />
              {series.map((v, i) => (
                <circle key={i} cx={xFor(i)} cy={yOff(v)} r={isMe ? 3.5 : 2.5}
                  fill={c} stroke={D.cardBg} strokeWidth={1} />
              ))}
              {/* Connector tick from line end to staggered label */}
              {labelY[li] !== labeled[li].rawY + off + 3 && (
                <line
                  x1={xFor(series.length - 1) + 4} y1={yOff(series[series.length - 1])}
                  x2={xFor(series.length - 1) + 4} y2={labelY[li] - 2}
                  stroke={c} strokeWidth={0.75} opacity={0.4}
                />
              )}
              <text x={xFor(series.length - 1) + 7} y={labelY[li]} fill={c} fontSize={9} fontWeight={800}>
                {displayName}
              </text>
            </g>
          );
        });
      })()}

      <path
        d={teamSeries.map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(v)}`).join(" ")}
        fill="none" stroke={D.goldBright} strokeWidth={3} strokeDasharray="6 3"
        opacity={0.9} strokeLinejoin="round" strokeLinecap="round"
      />
      {teamSeries.map((v, i) => (
        <g key={`t${i}`}>
          <circle cx={xFor(i)} cy={yFor(v)} r={4.5} fill={D.cardBg} stroke={D.goldBright} strokeWidth={2} />
          <text x={xFor(i)} y={yFor(v) - 9} fill={D.goldBright}
            fontSize={11} fontWeight={900} textAnchor="middle">
            {v}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function InversionsGraph({ data }: { data: InversionsData }) {
  const [dims, setDims] = useState({ w: 600, h: 260 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setDims({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="flex flex-col gap-2 flex-1 min-h-0"
      style={{
        background: "rgba(0,0,0,0.28)",
        border: `1px solid ${D.panelBorder}`,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div className="flex items-start justify-between gap-2 flex-none">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: D.gold }}>
            Inversions over time
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: D.muted }}>
            How wrong each player&apos;s hands were per phase. Lower is better.
          </div>
        </div>
        <div className="flex items-center gap-3 text-[9px] flex-none">
          <div className="flex items-center gap-1.5">
            <div style={{ width: 18, height: 0, borderTop: `3px dashed ${D.goldBright}` }} />
            <span className="font-black" style={{ color: D.goldBright }}>Team</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 18, height: 2.5, background: D.accent, borderRadius: 9999 }} />
            <span className="font-black" style={{ color: D.accent }}>You</span>
          </div>
        </div>
      </div>
      <div ref={ref} className="flex-1 min-h-0">
        <Graph data={data} width={dims.w} height={dims.h} />
      </div>
    </div>
  );
}
