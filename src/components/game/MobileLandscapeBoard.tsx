"use client";

import type { GameState } from "@/lib/types";
import type { UseBoardReturn } from "@/hooks/useGameBoard";
import { PHASE_LABELS } from "@/lib/constants";
import PokerTable from "../PokerTable";
import ChatPanel from "../ChatPanel";
import ReadyButton from "../ReadyButton";
import { CardFace } from "../CardFace";
import RankChip from "../RankChip";
import VolumeControl from "../VolumeControl";
import CustomOutputButton from "../CustomOutputButton";
import RequestItem from "./RequestItem";

interface MobileLandscapeBoardProps {
  board: UseBoardReturn;
  gameState: GameState;
  myId: string;
  toastEl: React.ReactNode;
  onDing: () => void;
  onFuckoff: () => void;
  isCustom: boolean;
  onCustomOutput: (text: string, rate: number, pitch: number) => void;
}

export default function MobileLandscapeBoard({
  board,
  gameState,
  myId,
  toastEl,
  onDing,
  onFuckoff,
  isCustom,
  onCustomOutput,
}: MobileLandscapeBoardProps) {
  const {
    displayState, selectedHandId, selectedSlot,
    handleHandClick, handleSlotClick, handleUnclaim,
    handleAcceptAcquire, handleRejectAcquire, handleCancelAcquire,
    handleSendChat, handleReady, handleEndGameClick,
    incomingRequests, outgoingRequests, rankMap, totalHands,
    myHands, hasSelection, allReady, hasUnclaimedSlots,
    isCreator, isReady, confirmingEnd,
    mobileChatOpen, setMobileChatOpen,
  } = board;

  return (
    <div className="h-[100dvh] flex flex-col" style={{ background: "#0a1813" }}>
      {toastEl}
      <div className="flex-none px-3 py-1 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(201,165,74,0.18)", background: "rgba(10,40,22,0.95)" }}>
        <span className="font-serif font-black" style={{ fontSize: 16, color: "#f5e6b8" }}>Ding</span>
        <div className="flex items-center gap-2">
          {PHASE_LABELS.map((phase) => (
            <div key={phase} className="text-[9px] font-black uppercase tracking-widest" style={{ color: gameState.phase === phase ? "#c9a54a" : "rgba(255,255,255,0.2)" }}>
              {phase === "preflop" ? "pre" : phase}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#2fb873" }}>
            {gameState.phase === "preflop" ? "pre-flop" : gameState.phase}
          </span>
          {isCreator && (confirmingEnd
            ? <button onClick={handleEndGameClick} className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "#c06060", color: "#fff" }}>sure?</button>
            : <button onClick={handleEndGameClick} className="text-[10px] font-bold" style={{ color: "#c06060" }}>end</button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <PokerTable
          gameState={displayState}
          myId={myId}
          hideSelf={true}
          onUnclaim={handleUnclaim}
          selectedHandId={selectedHandId}
          selectedSlot={selectedSlot}
          onHandClick={handleHandClick}
          onSlotClick={handleSlotClick}
        />
        <div className="absolute top-2 right-2 z-20 flex gap-1">
          <button onClick={onDing} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 text-lg" aria-label="Ding">🔔</button>
          <button onClick={onFuckoff} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 text-lg" aria-label="Fuck off">🖕</button>
          <VolumeControl size="sm" />
          {isCustom && <CustomOutputButton size="sm" onSpeak={onCustomOutput} />}
          <button onClick={() => setMobileChatOpen((v) => !v)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 text-lg" aria-label="Chat">💬</button>
        </div>
        {mobileChatOpen && (
          <div className="absolute inset-x-2 bottom-2 top-12 z-30 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <button onClick={() => setMobileChatOpen(false)} className="absolute top-1.5 right-2 z-10 text-gray-500 hover:text-white text-xs font-bold w-5 h-5 flex items-center justify-center" aria-label="Close chat">✕</button>
            <ChatPanel messages={gameState.chatMessages} myId={myId} onSend={handleSendChat} />
          </div>
        )}
      </div>

      <div className="flex-none px-3 py-1.5" style={{ borderTop: "1px solid rgba(201,165,74,0.15)", background: "#0a1813" }}>
        {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
          <div className="flex gap-3 mb-1.5 overflow-x-auto">
            {incomingRequests.map((req) => (
              <RequestItem key={`${req.initiatorHandId}-${req.recipientHandId}`} req={req} gameState={gameState} rankMap={rankMap} totalHands={totalHands} variant="mobile-landscape" onAccept={handleAcceptAcquire} onReject={handleRejectAcquire} />
            ))}
            {outgoingRequests.map((req) => (
              <RequestItem key={`out-${req.initiatorHandId}-${req.recipientHandId}`} req={req} gameState={gameState} rankMap={rankMap} totalHands={totalHands} variant="mobile-landscape" onAccept={handleAcceptAcquire} onCancel={handleCancelAcquire} />
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-4">
            {myHands.map((hand) => {
              const rank = rankMap.get(hand.id) ?? null;
              const isSelected = selectedHandId === hand.id;
              return (
                <div key={hand.id} className="flex items-center gap-1.5">
                  <div className={["flex gap-0.5 rounded p-0.5 cursor-pointer transition-all", isSelected ? "ring-2 ring-yellow-400 bg-yellow-400/10" : "hover:ring-1 hover:ring-green-500/40"].join(" ")} onClick={() => handleHandClick(hand.id)}>
                    {hand.cards.map((card, i) => <CardFace key={i} card={card} tiny />)}
                  </div>
                  {rank !== null ? (
                    <RankChip rank={rank} total={totalHands} isOwn isSelected={isSelected} hasSelection={hasSelection} onClick={() => handleHandClick(hand.id)} onDoubleClick={() => handleUnclaim(hand.id)} small />
                  ) : (
                    <div className={["w-6 h-6 rounded-full border-2 border-dashed transition-all", hasSelection ? "border-yellow-400/60 cursor-pointer hover:border-yellow-400" : "border-gray-700/40"].join(" ")} onClick={hasSelection ? () => handleHandClick(hand.id) : undefined} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex-none">
            <ReadyButton isReady={isReady} onToggle={handleReady} allPlayersReady={allReady} disabled={hasUnclaimedSlots} />
          </div>
        </div>
      </div>
    </div>
  );
}
