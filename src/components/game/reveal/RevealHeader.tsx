"use client";

import type { GameState } from "@/lib/types";
import { CardFace } from "../../CardFace";
import VolumeControl from "../../VolumeControl";
import CustomOutputButton from "../../CustomOutputButton";
import { D } from "@/lib/theme";
import { shades, shadows, surfaces } from "@/lib/tokens";
import { getGameModeDefinition } from "@/lib/gameMode";

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
  isCustom: boolean;
  onCustomOutput: (text: string, rate: number, pitch: number) => void;
}

const ICON_BUTTON_STYLE = {
  background: surfaces.darkIconBg,
  border: `1px solid ${surfaces.dividerLine}`,
} as const;

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
  isCustom,
  onCustomOutput,
}: RevealHeaderProps) {
  const mode = getGameModeDefinition(gameState.modeId);
  return (
    <div
      className="flex-none relative z-10 flex items-center gap-4 px-5"
      style={{
        height: 62,
        background: D.panel,
        borderBottom: `1px solid ${D.panelBorder}`,
        boxShadow: `0 4px 20px ${shades.shadowSoft}`,
      }}
    >
      <div>
        <div className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: D.gold }}>
          The Reveal
        </div>
        <div className="font-black leading-none" style={{ fontSize: 20, color: D.goldBright, fontFamily: D.serif }}>
          {gameState.players.length} players · {total} hands
        </div>
        <div className="text-[10px] font-black uppercase tracking-wider truncate max-w-36" style={{ color: D.sub }}>
          {mode.shortName}
        </div>
      </div>

      <div style={{ width: 1, height: 36, background: surfaces.dividerLine }} />

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

      <div style={{ width: 1, height: 36, background: surfaces.dividerLine }} />

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
        <button onClick={onDing} className="w-8 h-8 flex items-center justify-center rounded-full text-lg select-none transition-all active:scale-90" style={ICON_BUTTON_STYLE}>🔔</button>
        <button onClick={onFuckoff} className="w-8 h-8 flex items-center justify-center rounded-full text-lg select-none transition-all active:scale-90" style={ICON_BUTTON_STYLE}>🖕</button>
        <VolumeControl size="sm" buttonStyle={ICON_BUTTON_STYLE} />
        {isCustom && <CustomOutputButton size="sm" buttonStyle={ICON_BUTTON_STYLE} onSpeak={onCustomOutput} />}
        <button onClick={onToggleMobileChat} className="sm:hidden w-8 h-8 flex items-center justify-center rounded-full text-lg select-none" style={ICON_BUTTON_STYLE}>💬</button>
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
            background: D.goldButton,
            color: D.ink,
            boxShadow: shadows.goldButton,
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
