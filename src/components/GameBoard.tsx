"use client";

import type { ClientMessage, GameState } from "@/lib/types";
import { useGameBoard } from "@/hooks/useGameBoard";
import PortraitWarning from "./game/PortraitWarning";
import MobileLandscapeBoard from "./game/MobileLandscapeBoard";
import DesktopBoard from "./game/DesktopBoard";

interface GameBoardProps {
  gameState: GameState;
  myId: string;
  code?: string;
  onSend: (msg: ClientMessage) => void;
  onDing: () => void;
  dingNotifications: { id: string; playerName: string }[];
  onFuckoff: () => void;
  fuckoffNotifications: { id: string; playerName: string }[];
  isCustom: boolean;
  onCustomOutput: (text: string, rate: number, pitch: number) => void;
}

export default function GameBoard({
  gameState,
  myId,
  code,
  onSend,
  onDing,
  dingNotifications,
  onFuckoff,
  fuckoffNotifications,
  isCustom,
  onCustomOutput,
}: GameBoardProps) {
  const board = useGameBoard(gameState, myId, onSend);

  const toastEl = board.toastError ? (
    <div className="fixed inset-x-0 top-16 z-50 flex justify-center pointer-events-none">
      <div className="bg-red-900/95 border border-red-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl">
        {board.toastError}
      </div>
    </div>
  ) : null;

  if (board.isPortrait) return <PortraitWarning />;

  if (board.isMobileLandscape) {
    return (
      <MobileLandscapeBoard
        board={board}
        gameState={gameState}
        myId={myId}
        toastEl={toastEl}
        onDing={onDing}
        onFuckoff={onFuckoff}
        dingNotifications={dingNotifications}
        fuckoffNotifications={fuckoffNotifications}
        isCustom={isCustom}
        onCustomOutput={onCustomOutput}
      />
    );
  }

  return (
    <DesktopBoard
      board={board}
      gameState={gameState}
      myId={myId}
      toastEl={toastEl}
      code={code}
      onDing={onDing}
      dingNotifications={dingNotifications}
      onFuckoff={onFuckoff}
      fuckoffNotifications={fuckoffNotifications}
      isCustom={isCustom}
      onCustomOutput={onCustomOutput}
    />
  );
}
