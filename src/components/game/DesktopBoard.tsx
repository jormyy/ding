"use client";

/**
 * Desktop board — composes the six desktop sub-components:
 *   BoardHeader · BoardChromeDock · BoardInstructionHint · MyHandsDock ·
 *   ReadyPill · RequestsSidebar.
 *
 * The mobile-portrait inline requests strip remains here since it's
 * positioned outside the main flex column.
 */

import type { GameState } from "@/lib/types";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import type { UseBoardReturn } from "@/hooks/useGameBoard";
import PokerTable from "../PokerTable";
import RequestItem from "./RequestItem";
import { BoardHeader } from "./desktop/BoardHeader";
import { BoardChromeDock } from "./desktop/BoardChromeDock";
import { BoardInstructionHint } from "./desktop/BoardInstructionHint";
import { MyHandsDock } from "./desktop/MyHandsDock";
import { ReadyPill } from "./desktop/ReadyPill";
import { RequestsSidebar } from "./desktop/RequestsSidebar";

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
  isCustom: boolean;
  onCustomOutput: (text: string, rate: number, pitch: number) => void;
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
  isCustom,
  onCustomOutput,
}: DesktopBoardProps) {
  const {
    displayState,
    localRanking,
    selectedHandId,
    selectedSlot,
    handleHandClick,
    handleSlotClick,
    handleUnclaim,
    handleAcceptAcquire,
    handleRejectAcquire,
    handleCancelAcquire,
    handleSendChat,
    handleReady,
    handleEndGameClick,
    incomingRequests,
    outgoingRequests,
    rankMap,
    totalHands,
    myHands,
    hasSelection,
    allReady,
    hasUnclaimedSlots,
    isCreator,
    isReady,
    confirmingEnd,
  } = board;

  return (
    <div className="h-[100dvh] flex flex-col" style={{ background: D.cardBg }}>
      {toastEl}

      <BoardHeader
        gameState={gameState}
        code={code}
        totalHands={totalHands}
        isCreator={isCreator}
        confirmingEnd={confirmingEnd}
        onAutoReady={handleReady}
        onEndGameClick={handleEndGameClick}
      />

      {/* Main area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 flex items-center justify-center overflow-hidden">
          <div
            className="relative w-full aspect-square sm:aspect-auto sm:h-full"
            style={{
              background: `url('/felt.png') repeat, ${D.feltLight}`,
              backgroundSize: "256px 256px",
            }}
          >
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

            <BoardChromeDock
              onDing={onDing}
              onFuckoff={onFuckoff}
              isCustom={isCustom}
              onCustomOutput={onCustomOutput}
              dingNotifications={dingNotifications}
              fuckoffNotifications={fuckoffNotifications}
            />

            <BoardInstructionHint
              gameState={gameState}
              selectedHandId={selectedHandId}
              selectedSlot={selectedSlot}
              localRanking={localRanking}
            />

            <MyHandsDock
              myHands={myHands}
              rankMap={rankMap}
              totalHands={totalHands}
              selectedHandId={selectedHandId}
              hasSelection={hasSelection}
              rankHistory={gameState.rankHistory}
              onHandClick={handleHandClick}
              onUnclaim={handleUnclaim}
            />

            <ReadyPill
              players={gameState.players}
              isReady={isReady}
              allReady={allReady}
              hasUnclaimedSlots={hasUnclaimedSlots}
              onReady={handleReady}
            />
          </div>
        </div>

        <RequestsSidebar
          gameState={gameState}
          myId={myId}
          rankMap={rankMap}
          totalHands={totalHands}
          incomingRequests={incomingRequests}
          outgoingRequests={outgoingRequests}
          onAcceptAcquire={handleAcceptAcquire}
          onRejectAcquire={handleRejectAcquire}
          onCancelAcquire={handleCancelAcquire}
          onSendChat={handleSendChat}
        />
      </div>

      {/* Mobile-only inline requests section (portrait phones) */}
      {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
        <div
          className="sm:hidden flex-none px-3 py-2 flex flex-col gap-2 max-h-40 overflow-y-auto"
          style={{ background: D.cardBg, borderTop: `1px solid ${surfaces.goldFaint}` }}
        >
          <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
            Requests
            {incomingRequests.length > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5">
                {incomingRequests.length}
              </span>
            )}
          </span>
          {incomingRequests.map((req) => (
            <RequestItem
              key={`${req.initiatorHandId}-${req.recipientHandId}`}
              req={req}
              gameState={gameState}
              rankMap={rankMap}
              totalHands={totalHands}
              variant="mobile-portrait"
              onAccept={handleAcceptAcquire}
              onReject={handleRejectAcquire}
            />
          ))}
          {outgoingRequests.map((req) => (
            <RequestItem
              key={`out-${req.initiatorHandId}-${req.recipientHandId}`}
              req={req}
              gameState={gameState}
              rankMap={rankMap}
              totalHands={totalHands}
              variant="mobile-portrait"
              onAccept={handleAcceptAcquire}
              onCancel={handleCancelAcquire}
            />
          ))}
        </div>
      )}
    </div>
  );
}
