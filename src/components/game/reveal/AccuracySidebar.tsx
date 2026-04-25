"use client";

import type { LeaderboardEntry } from "@/lib/reveal/leaderboard";
import { D } from "@/lib/theme";

interface AccuracySidebarProps {
  ranked: LeaderboardEntry[];
  best: LeaderboardEntry;
  worst: LeaderboardEntry;
  maxOff: number;
  myEntry: LeaderboardEntry | undefined;
}

export default function AccuracySidebar({ ranked, best, worst, maxOff, myEntry }: AccuracySidebarProps) {
  return (
    <div
      className="flex-none w-64 flex flex-col gap-3 p-4 overflow-hidden"
      style={{ borderLeft: `1px solid ${D.panelBorder}`, background: "rgba(0,0,0,0.2)" }}
    >
      <div className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: D.gold }}>
        Player Accuracy
      </div>

      {ranked.length >= 2 && (
        <div className="flex gap-2">
          <div className="flex-1 p-2.5 rounded-xl" style={{ background: `linear-gradient(180deg, ${D.gold}22, ${D.gold}08)`, border: `1px solid ${D.gold}77` }}>
            <div className="text-[7px] font-black uppercase tracking-widest" style={{ color: D.gold }}>🏆 Sharpest</div>
            <div className="text-sm font-black mt-0.5" style={{ color: D.goldBright }}>{best.name}</div>
            <div className="text-[10px]" style={{ color: D.sub }}>{best.off === 0 ? "perfect · 0 off" : `${best.off} off`}</div>
          </div>
          {worst.off > 0 && (
            <div className="flex-1 p-2.5 rounded-xl" style={{ background: "linear-gradient(180deg, rgba(192,96,96,0.16), rgba(192,96,96,0.04))", border: `1px solid ${D.danger}77` }}>
              <div className="text-[7px] font-black uppercase tracking-widest" style={{ color: D.danger }}>💥 Furthest</div>
              <div className="text-sm font-black mt-0.5" style={{ color: "#ffb0b4" }}>{worst.name}</div>
              <div className="text-[10px]" style={{ color: D.sub }}>{worst.off} off</div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {ranked.map((entry) => {
          const pct = maxOff > 0 ? Math.min(100, (entry.off / maxOff) * 100) : 0;
          const barColor =
            entry.off === 0 ? `linear-gradient(90deg, ${D.gold}, ${D.goldBright})`
            : entry.off >= maxOff ? D.danger
            : D.accent;
          const labelColor = entry.off === 0 ? D.gold : entry.off >= maxOff ? D.danger : D.sub;
          return (
            <div key={entry.playerId} className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: entry.mine ? `${D.gold}12` : "transparent", border: entry.mine ? `1px solid ${D.gold}44` : "1px solid transparent" }}>
              <div className="text-[10px] font-black text-right" style={{ width: 16, color: labelColor }}>#{entry.rank}</div>
              <div className="text-xs font-bold truncate" style={{ width: 48, color: entry.mine ? D.goldBright : D.text }}>{entry.name}</div>
              <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ width: `${100 - pct}%`, height: "100%", background: barColor, borderRadius: 9999 }} />
              </div>
              <div className="text-[11px] font-black text-right tabular-nums" style={{ width: 32, color: labelColor, fontFamily: D.serif }}>{entry.off} off</div>
            </div>
          );
        })}
      </div>

      {myEntry && (
        <div className="p-2.5 rounded-lg text-xs leading-relaxed" style={{ background: myEntry.off === 0 ? "rgba(47,184,115,0.1)" : "rgba(201,165,74,0.08)", border: `1px solid ${myEntry.off === 0 ? D.accent + "44" : D.panelBorder}`, color: D.sub }}>
          {myEntry.off === 0 ? (
            <><span className="font-black" style={{ color: D.accent }}>You nailed it</span> — perfect ranking!</>
          ) : myEntry.rank === 1 ? (
            <><span className="font-black" style={{ color: D.goldBright }}>Tied for 1st</span> — {myEntry.off} off total.</>
          ) : (
            <>You ranked <span className="font-black" style={{ color: D.goldBright }}>#{myEntry.rank}</span> — {myEntry.off} off total.</>
          )}
        </div>
      )}

      <div className="text-[9px] flex gap-3" style={{ color: D.muted }}>
        <span><span className="font-black" style={{ color: D.accent }}>✓</span> correct</span>
        <span><span className="font-black" style={{ color: D.danger }}>✗</span> swapped</span>
      </div>
    </div>
  );
}
