"use client";

import { useState } from "react";
import type { ClientMessage, GameState } from "@/lib/types";
import PokerTable from "./PokerTable";
import ChatPanel from "./ChatPanel";
import RevealResults from "./game/RevealResults";
import VolumeControl from "./VolumeControl";
import { D } from "@/lib/theme";

interface RevealProps {
  gameState: GameState;
  myId: string;
  onSend: (msg: ClientMessage) => void;
  onDing: () => void;
  dingNotifications: { id: string; playerName: string }[];
  onFuckoff: () => void;
  fuckoffNotifications: { id: string; playerName: string }[];
}

export default function Reveal({
  gameState,
  myId,
  onSend,
  onDing,
  dingNotifications,
  onFuckoff,
  fuckoffNotifications,
}: RevealProps) {
  const allFlipped = gameState.score !== null;
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  function handleFlip(handId: string) {
    onSend({ type: "flip", handId });
  }

  function handlePlayAgain() {
    onSend({ type: "playAgain" });
  }

  function handleSendChat(text: string) {
    onSend({ type: "chat", text });
  }

  if (allFlipped) {
    return (
      <RevealResults
        gameState={gameState}
        myId={myId}
        onPlayAgain={handlePlayAgain}
        onDing={onDing}
        onFuckoff={onFuckoff}
        dingNotifications={dingNotifications}
        fuckoffNotifications={fuckoffNotifications}
        mobileChatOpen={mobileChatOpen}
        onToggleMobileChat={() => setMobileChatOpen((v) => !v)}
        onSendChat={handleSendChat}
      />
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col" style={{ background: D.cardBg }}>
      <div
        className="flex-none px-4 py-2 flex items-center justify-between"
        style={{
          background: D.panel,
          borderBottom: `1px solid ${D.panelBorder}`,
          height: 54,
        }}
      >
        <span className="font-black" style={{ fontSize: 22, color: D.goldBright, fontFamily: D.serif }}>Ding</span>
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: D.gold }}>
          The Reveal
        </span>
        <div className="w-16" />
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 flex items-center justify-center overflow-hidden relative">
          <div
            className="relative w-full aspect-square sm:aspect-auto sm:h-full"
            style={{ background: "url('/felt.png') repeat, #0a3820", backgroundSize: "256px 256px" }}
          >
            <PokerTable gameState={gameState} myId={myId} onFlip={handleFlip} />

            <div className="absolute top-3 right-3 z-40 flex flex-col items-end gap-1.5">
              <button onClick={onDing} className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all text-xl select-none">🔔</button>
              <button onClick={onFuckoff} className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all text-xl select-none">🖕</button>
              <VolumeControl size="md" />
              <button onClick={() => setMobileChatOpen((v) => !v)} className="sm:hidden w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all text-xl select-none">💬</button>
              <div className="flex flex-col items-end gap-1 pointer-events-none">
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
            </div>
          </div>

          {mobileChatOpen && (
            <div className="sm:hidden absolute inset-x-2 bottom-2 top-14 z-40 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
              <button onClick={() => setMobileChatOpen(false)} className="absolute top-1.5 right-2 z-10 text-gray-500 hover:text-white text-xs font-bold w-5 h-5 flex items-center justify-center">✕</button>
              <ChatPanel messages={gameState.chatMessages} myId={myId} onSend={handleSendChat} />
            </div>
          )}
        </div>

        <div className="hidden sm:flex flex-none w-64 flex-col overflow-hidden" style={{ borderLeft: `1px solid ${D.panelBorder}`, background: D.cardBg }}>
          <ChatPanel messages={gameState.chatMessages} myId={myId} onSend={handleSendChat} />
        </div>
      </div>
    </div>
  );
}
