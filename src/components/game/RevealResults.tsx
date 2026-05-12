"use client";

import type { GameState } from "@/lib/types";
import ChatPanel from "../ChatPanel";
import { D } from "@/lib/theme";
import {
  computeRevealRows,
  computeDisplacementLeaderboard,
  computeInversionsData,
} from "@/lib/reveal/leaderboard";
import RevealHeader from "./reveal/RevealHeader";
import RevealRow from "./reveal/RevealRow";
import AccuracySidebar from "./reveal/AccuracySidebar";
import InversionsGraph from "./reveal/InversionsGraph";

interface RevealResultsProps {
  gameState: GameState;
  myId: string;
  onPlayAgain: () => void;
  onDing: () => void;
  onFuckoff: () => void;
  dingNotifications: { id: string; playerName: string }[];
  fuckoffNotifications: { id: string; playerName: string }[];
  mobileChatOpen: boolean;
  onToggleMobileChat: () => void;
  onSendChat: (text: string) => void;
  isCustom: boolean;
  onCustomOutput: (text: string, rate: number, pitch: number) => void;
}

export default function RevealResults({
  gameState,
  myId,
  onPlayAgain,
  onDing,
  onFuckoff,
  dingNotifications,
  fuckoffNotifications,
  mobileChatOpen,
  onToggleMobileChat,
  onSendChat,
  isCustom,
  onCustomOutput,
}: RevealResultsProps) {
  const score = gameState.score ?? 0;
  const total = gameState.hands.length;
  const isCreator = gameState.players.find((p) => p.id === myId)?.isCreator ?? false;

  const rows = computeRevealRows(gameState, myId);
  const { ranked, best, worst, maxOff, myEntry } = computeDisplacementLeaderboard(gameState, myId);
  const inversionsData = computeInversionsData(gameState, myId);

  return (
    <div
      className="h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: D.cardBg, fontFamily: '"Inter", system-ui, sans-serif', color: D.text }}
    >
      <div style={{ position: "absolute", inset: 0, background: "url('/felt.png') repeat, #0a3820", backgroundSize: "256px 256px", opacity: 0.18, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(201,165,74,0.08) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      <RevealHeader
        gameState={gameState}
        score={score}
        total={total}
        isCreator={isCreator}
        onPlayAgain={onPlayAgain}
        onDing={onDing}
        onFuckoff={onFuckoff}
        onToggleMobileChat={onToggleMobileChat}
        dingNotifications={dingNotifications}
        fuckoffNotifications={fuckoffNotifications}
        isCustom={isCustom}
        onCustomOutput={onCustomOutput}
      />

      <div className="flex-1 min-h-0 relative z-10 overflow-hidden" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: 14 }}>
        {/* LEFT: Final hands list */}
        <div
          className="flex flex-col gap-1 min-h-0 overflow-hidden"
          style={{
            background: "rgba(0,0,0,0.22)",
            border: `1px solid ${D.panelBorder}`,
            borderRadius: 12,
            padding: 10,
          }}
        >
          <div
            className="flex-none grid gap-2 px-2.5 pb-1 text-[8px] font-black uppercase tracking-widest"
            style={{ gridTemplateColumns: "28px 58px minmax(0,1fr) 62px 48px 20px", color: "rgba(201,165,74,0.55)" }}
          >
            <div>True</div>
            <div>Hole</div>
            <div>Hand · Player</div>
            <div className="text-center">Ranked</div>
            <div className="text-center">Δ</div>
            <div className="text-center">✓</div>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
            {rows.map((row) => (
              <RevealRow key={row.handId} row={row} total={total} />
            ))}
          </div>
        </div>

        {/* RIGHT: Inversions graph + accuracy */}
        <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
          <InversionsGraph data={inversionsData} />
          <AccuracySidebar ranked={ranked} best={best} worst={worst} maxOff={maxOff} myEntry={myEntry} />
        </div>

        {mobileChatOpen && (
          <div className="sm:hidden absolute inset-x-2 bottom-2 top-16 z-40 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <button onClick={onToggleMobileChat} className="absolute top-1.5 right-2 z-10 text-gray-500 hover:text-white text-xs font-bold w-5 h-5 flex items-center justify-center">✕</button>
            <ChatPanel messages={gameState.chatMessages} myId={myId} onSend={onSendChat} />
          </div>
        )}
      </div>
    </div>
  );
}
