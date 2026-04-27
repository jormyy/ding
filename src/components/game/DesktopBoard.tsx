"use client";

import type { GameState } from "@/lib/types";
import type { UseBoardReturn } from "@/hooks/useGameBoard";
import { PHASE_LABELS, PHASE_STEP_LABELS, PHASE_HISTORY_LABELS } from "@/lib/constants";
import PokerTable from "../PokerTable";
import ChatPanel from "../ChatPanel";
import ReadyButton from "../ReadyButton";
import { CardFace } from "../CardFace";
import RankChip, { HistoryChip } from "../RankChip";
import VolumeControl from "../VolumeControl";
import RequestItem from "./RequestItem";

interface DesktopBoardProps {
  board: UseBoardReturn;
  gameState: GameState;
  myId: string;
  toastEl: React.ReactNode;
  code?: string;
  onDing: () => void;
  dingNotifications: { id: string; playerName: string }[];
  onFuckoff: () => void;
  fuckoffNotifications: { id: string; playerName: string }[];
}

export default function DesktopBoard({
  board,
  gameState,
  myId,
  toastEl,
  code,
  onDing,
  dingNotifications,
  onFuckoff,
  fuckoffNotifications,
}: DesktopBoardProps) {
  const {
    displayState, localRanking, selectedHandId, selectedSlot,
    handleHandClick, handleSlotClick, handleUnclaim,
    handleAcceptAcquire, handleRejectAcquire, handleCancelAcquire,
    handleSendChat, handleReady, handleEndGameClick,
    incomingRequests, outgoingRequests, rankMap, totalHands,
    myHands, hasSelection, allReady, hasUnclaimedSlots,
    isCreator, isReady, confirmingEnd,
  } = board;

  const currentPhaseIdx = PHASE_LABELS.indexOf(gameState.phase as typeof PHASE_LABELS[number]);

  return (
    <div className="h-[100dvh] flex flex-col" style={{ background: "#0a1813" }}>
      {toastEl}
      {/* Header */}
      <div className="flex-none flex items-center px-4 gap-3" style={{ height: 54, background: "linear-gradient(180deg, rgba(20,60,36,0.95) 0%, rgba(10,40,22,0.98) 100%)", borderBottom: "1px solid rgba(201,165,74,0.2)", flexShrink: 0 }}>
        <span className="font-serif font-black" style={{ fontSize: 22, color: "#f5e6b8" }}>Ding</span>
        <div className="w-px h-5 bg-white/10" />
        {code && <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: "#c9a54a" }}>Room {code}</span>}
        <div className="flex-1 flex items-center justify-center gap-0">
          {PHASE_STEP_LABELS.map((label, i) => {
            const done = i < currentPhaseIdx;
            const active = i === currentPhaseIdx;
            return (
              <div key={label} className="flex items-center">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-colors" style={{ background: active ? "rgba(201,165,74,0.15)" : "transparent" }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: active ? "#c9a54a" : done ? "#2fb873" : "rgba(255,255,255,0.15)", boxShadow: active ? "0 0 10px #c9a54a" : "none" }} />
                  <span className="text-[10px] font-black tracking-wider uppercase hidden sm:inline" style={{ color: active ? "#f5e6b8" : done ? "#2fb873" : "rgba(255,255,255,0.3)" }}>
                    {label}
                  </span>
                </div>
                {i < PHASE_STEP_LABELS.length - 1 && <div className="w-3 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />}
              </div>
            );
          })}
        </div>
        <span className="text-[10px] font-bold hidden sm:block" style={{ color: "#6a8a72" }}>
          {gameState.players.length}p · {gameState.handsPerPlayer}h · {totalHands}
        </span>
        {isCreator && (confirmingEnd ? (
          <button onClick={handleEndGameClick} className="text-[11px] font-black px-3 py-1 rounded-full transition-all" style={{ background: "#c06060", color: "#fff" }}>sure?</button>
        ) : (
          <button onClick={handleEndGameClick} className="text-[11px] font-bold transition-colors" style={{ color: "#c06060" }}>End</button>
        ))}
      </div>

      {/* Main area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 flex items-center justify-center overflow-hidden">
          <div className="relative w-full aspect-square sm:aspect-auto sm:h-full" style={{ background: "url('/felt.png') repeat, #0a3820", backgroundSize: "256px 256px" }}>
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
            <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
              <button onClick={onDing} className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all text-xl select-none" aria-label="Ding">🔔</button>
              <button onClick={onFuckoff} className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all text-xl select-none" aria-label="Fuck off">🖕</button>
              <VolumeControl size="md" />
              <div className="flex flex-col items-end gap-1 pointer-events-none">
                {dingNotifications.map((n) => (
                  <div key={n.id} className="bg-gray-900/90 border border-gray-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg animate-fade-out whitespace-nowrap">{n.playerName} dings</div>
                ))}
                {fuckoffNotifications.map((n) => (
                  <div key={n.id} className="bg-red-900/90 border border-red-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg animate-fade-out whitespace-nowrap">{n.playerName} says fuck off</div>
                ))}
              </div>
            </div>

            {/* Instruction hint */}
            {selectedHandId !== null ? (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="bg-yellow-500/90 text-yellow-950 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  {(() => {
                    const selHand = gameState.hands.find((h) => h.id === selectedHandId);
                    const isRanked = localRanking.indexOf(selectedHandId) !== -1;
                    if (!selHand) return "Place your chip or tap a teammate's hand";
                    if (isRanked) return "Tap your other hand to move the chip — or tap a teammate's hand to offer/swap";
                    return "Tap a board slot to place — or tap a teammate's chip to request it";
                  })()}
                </div>
              </div>
            ) : selectedSlot !== null ? (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="bg-yellow-500/90 text-yellow-950 text-xs font-bold px-3 py-1 rounded-full shadow-lg">Click your hand to claim this slot</div>
              </div>
            ) : null}

            {/* My dock */}
            <div className="absolute z-10 flex items-center" style={{ bottom: 14, left: "50%", transform: "translateX(-50%)", gap: 16, background: "linear-gradient(180deg, rgba(20,70,40,0.95) 0%, rgba(6,30,16,0.98) 100%)", border: "2px solid #c9a54a", borderRadius: 14, padding: "10px 20px", boxShadow: "0 12px 40px rgba(0,0,0,0.55), 0 0 30px rgba(201,165,74,0.2)", whiteSpace: "nowrap" }}>
              <div className="flex-shrink-0">
                <div style={{ fontSize: 10, color: "#2fb873", letterSpacing: 2.5, fontWeight: 900, textTransform: "uppercase" }}>Your Hands</div>
                <div style={{ fontSize: 12, color: "#f5e6b8", fontFamily: "'Playfair Display', serif", fontWeight: 700, marginTop: 2 }}>
                  {myHands.filter(h => rankMap.get(h.id) !== undefined).length}/{myHands.length} placed
                </div>
              </div>
              {myHands.map((hand, i) => {
                const rank = rankMap.get(hand.id) ?? null;
                const isSelected = selectedHandId === hand.id;
                const history = gameState.rankHistory[hand.id] ?? [];
                return (
                  <div key={hand.id} className="flex items-center" style={{ gap: 16 }}>
                    {i > 0 && <div style={{ width: 1, height: 56, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />}
                    <div className="flex flex-col items-center" style={{ gap: 4 }}>
                      <div style={{ fontSize: 9, color: "#9fc5a8", fontWeight: 800, letterSpacing: 1 }}>HAND #{i + 1}</div>
                      <div className={["flex gap-1 rounded-lg p-0.5 cursor-pointer transition-all", isSelected ? "ring-2 ring-yellow-400 bg-yellow-400/10" : "hover:ring-1 hover:ring-green-500/40"].join(" ")} onClick={() => handleHandClick(hand.id)}>
                        {hand.cards.map((card, j) => <CardFace key={j} card={card} small />)}
                      </div>
                      {rank !== null ? (
                        <RankChip rank={rank} total={totalHands} isOwn isSelected={isSelected} hasSelection={hasSelection} onClick={() => handleHandClick(hand.id)} onDoubleClick={() => handleUnclaim(hand.id)} />
                      ) : (
                        <div className={["w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center transition-all", hasSelection ? "border-yellow-400/60 cursor-pointer hover:border-yellow-400 hover:bg-yellow-400/10" : "border-gray-700/40"].join(" ")} onClick={hasSelection ? () => handleHandClick(hand.id) : undefined} />
                      )}
                      {history.length > 0 && (
                        <div className="flex gap-0.5">
                          {history.map((r, phaseIdx) => (
                            <HistoryChip key={phaseIdx} rank={r} total={totalHands} phaseLabel={PHASE_HISTORY_LABELS[phaseIdx] ?? ""} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ready pill */}
            <div className="absolute z-10 flex items-center" style={{ bottom: 14, right: 20, gap: 10, background: "rgba(0,0,0,0.5)", borderRadius: 22, padding: "6px 10px 6px 14px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", gap: 3 }}>
                {gameState.players.map((p) => (
                  <div key={p.id} style={{ width: 8, height: 8, borderRadius: "50%", background: p.ready ? "#2fb873" : "rgba(255,255,255,0.15)", boxShadow: p.ready ? "0 0 6px rgba(47,184,115,0.5)" : "none" }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#9fc5a8", fontWeight: 700 }}>
                {gameState.players.filter(p => p.ready).length}/{gameState.players.length}
              </div>
              <ReadyButton isReady={isReady} onToggle={handleReady} allPlayersReady={allReady} disabled={hasUnclaimedSlots} small />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden sm:flex flex-none w-64 flex-col overflow-hidden" style={{ background: "#0a1813", borderLeft: "1px solid rgba(201,165,74,0.18)" }}>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-none px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#c9a54a" }}>Requests</span>
              {incomingRequests.length > 0 && (
                <span className="text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center" style={{ background: "#e08030" }}>{incomingRequests.length}</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2">
              {incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
                <p className="text-gray-600 text-xs text-center mt-4">No requests</p>
              ) : (
                <>
                  {incomingRequests.map((req) => (
                    <RequestItem key={`${req.initiatorHandId}-${req.recipientHandId}`} req={req} gameState={gameState} rankMap={rankMap} totalHands={totalHands} variant="desktop" onAccept={handleAcceptAcquire} onReject={handleRejectAcquire} />
                  ))}
                  {outgoingRequests.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mt-2 px-1">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "#6a8a72" }}>Sent</span>
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                      </div>
                      {outgoingRequests.map((req) => (
                        <RequestItem key={`out-${req.initiatorHandId}-${req.recipientHandId}`} req={req} gameState={gameState} rankMap={rankMap} totalHands={totalHands} variant="desktop" onAccept={handleAcceptAcquire} onCancel={handleCancelAcquire} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <ChatPanel messages={gameState.chatMessages} myId={myId} onSend={handleSendChat} />
          </div>
        </div>
      </div>

      {/* Mobile-only requests section */}
      {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
        <div className="sm:hidden flex-none px-3 py-2 flex flex-col gap-2 max-h-40 overflow-y-auto" style={{ background: "#0a1813", borderTop: "1px solid rgba(201,165,74,0.15)" }}>
          <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
            Requests
            {incomingRequests.length > 0 && <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5">{incomingRequests.length}</span>}
          </span>
          {incomingRequests.map((req) => (
            <RequestItem key={`${req.initiatorHandId}-${req.recipientHandId}`} req={req} gameState={gameState} rankMap={rankMap} totalHands={totalHands} variant="mobile-portrait" onAccept={handleAcceptAcquire} onReject={handleRejectAcquire} />
          ))}
          {outgoingRequests.map((req) => (
            <RequestItem key={`out-${req.initiatorHandId}-${req.recipientHandId}`} req={req} gameState={gameState} rankMap={rankMap} totalHands={totalHands} variant="mobile-portrait" onAccept={handleAcceptAcquire} onCancel={handleCancelAcquire} />
          ))}
        </div>
      )}
    </div>
  );
}
