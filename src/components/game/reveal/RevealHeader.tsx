"use client";

import type { GameState } from "@/lib/types";
import { CardFace } from "../../CardFace";
import { D } from "@/lib/theme";

interface RevealHeaderProps {
  gameState: GameState;
  score: number;
  total: number;
  isCreator: boolean;
  onPlayAgain: () => void;
  onDing: () => void;
  onFuckoff: () => void;
  onToggleMobileChat: () => void;
  dingNotifications: { id: string; playerName: string }[];
  fuckoffNotifications: { id: string; playerName: string }[];
}

export default function RevealHeader({
  gameState,
  score,
  total,
  isCreator,
  onPlayAgain,
  onDing,
  onFuckoff,
  onToggleMobileChat,
  dingNotifications,
  fuckoffNotifications,
}: RevealHeaderProps) {
  return (
    <div
      className="flex-none relative z-10 flex items-center gap-4 px-5"
      style={{
        height: 62,
        background: D.panel,
        borderBottom: `1px solid ${D.panelBorder}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      <div>
        <div className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: D.gold }}>
          The Reveal
        </div>
        <div className="font-black leading-none" style={{ fontSize: 20, color: D.goldBright, fontFamily: D.serif }}>
          {gameState.players.length} players · {total} hands
        </div>
      </div>

      <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.1)" }} />

      <div className="flex items-baseline gap-2">
        <div
          className="font-black leading-none"
          style={{
            fontSize: 48,
            fontFamily: D.serif,
            background: `linear-gradient(180deg, ${D.goldBright} 0%, ${D.gold} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {score}
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: D.goldBright }}>
            {score === 0 ? "Perfect!" : score === 1 ? "inversion" : "inversions"}
          </div>
          <div className="text-[10px]" style={{ color: D.muted }}>
            {score === 0 ? "Zero swaps from perfect" : "hands out of order"}
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.1)" }} />

      <div className="flex items-center gap-2">
        <div className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: D.gold }}>Board</div>
        <div className="flex gap-1">
          {gameState.communityCards.map((c, i) => (
            <CardFace key={i} card={c} tiny />
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex gap-2">
        <button onClick={onDing} className="w-8 h-8 flex items-center justify-center rounded-full text-lg select-none transition-all active:scale-90" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}>🔔</button>
        <button onClick={onFuckoff} className="w-8 h-8 flex items-center justify-center rounded-full text-lg select-none transition-all active:scale-90" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}>🖕</button>
        <button onClick={onToggleMobileChat} className="sm:hidden w-8 h-8 flex items-center justify-center rounded-full text-lg select-none" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}>💬</button>
      </div>

      <div className="flex flex-col items-end gap-1 pointer-events-none absolute top-14 right-4 z-50">
        {dingNotifications.map((n) => (
          <div key={n.id} className="bg-gray-900/90 border border-gray-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg animate-fade-out whitespace-nowrap">
            {n.playerName} dings
          </div>
        ))}
        {fuckoffNotifications.map((n) => (
          <div key={n.id} className="bg-red-900/90 border border-red-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg animate-fade-out whitespace-nowrap">
            {n.playerName} says fuck off
          </div>
        ))}
      </div>

      {isCreator ? (
        <button
          onClick={onPlayAgain}
          className="flex-none px-5 py-2.5 rounded-xl font-black text-sm tracking-wide transition-all active:scale-95"
          style={{
            background: `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`,
            color: D.ink,
            boxShadow: `0 3px 0 ${D.rail}, 0 6px 16px rgba(0,0,0,0.35)`,
          }}
        >
          Deal again →
        </button>
      ) : (
        <div className="text-xs" style={{ color: D.muted }}>Waiting for host…</div>
      )}
    </div>
  );
}
