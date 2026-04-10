"use client";

import type { ClientMessage, GameState, Hand } from "@/lib/types";
import PokerTable from "./PokerTable";

interface RevealProps {
  gameState: GameState;
  myId: string;
  onSend: (msg: ClientMessage) => void;
}

export default function Reveal({ gameState, myId, onSend }: RevealProps) {
  const allFlipped = gameState.score !== null;
  const myPlayer = gameState.players.find((p) => p.id === myId);
  const isCreator = myPlayer?.isCreator ?? false;

  function handleFlip(handId: string) {
    onSend({ type: "flip", handId });
  }

  function handlePlayAgain() {
    onSend({ type: "playAgain" });
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex-none border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm px-3 py-2 flex items-center justify-between">
        <span className="text-base font-black text-white tracking-tight">DING</span>
        <span className="text-yellow-400 text-[10px] font-bold uppercase tracking-widest">
          Reveal
        </span>
        <div className="w-12" />
      </div>

      {/* Poker Table */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden relative">
        {/* On mobile: constrain to a square so the oval isn't egg-shaped in portrait */}
        <div className="relative w-full aspect-square sm:aspect-auto sm:h-full">
          <PokerTable
            gameState={gameState}
            myId={myId}
            onFlip={handleFlip}
          />
        </div>

        {/* Score overlay — covers the full flex-1 area for proper centering */}
        {allFlipped && (
          <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-30 p-4">
            <ScorePanel
              gameState={gameState}
              isCreator={isCreator}
              onPlayAgain={handlePlayAgain}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface ScorePanelProps {
  gameState: GameState;
  isCreator: boolean;
  onPlayAgain: () => void;
}

function ScorePanel({ gameState, isCreator, onPlayAgain }: ScorePanelProps) {
  const score = gameState.score ?? 0;
  const isPerfect = score === 0;

  const handMap = new Map<string, Hand>(gameState.hands.map((h) => [h.id, h]));

  function getHandLabel(hand: Hand): string {
    const name =
      gameState.players.find((p) => p.id === hand.playerId)?.name ?? "?";
    if (gameState.handsPerPlayer === 1) return name;
    const idx = parseInt(hand.id.split("-").pop() ?? "0", 10);
    return `${name} (${idx + 1})`;
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-2xl w-full max-w-sm max-h-[88dvh] overflow-y-auto">
      {/* Score */}
      <div className="text-center mb-4">
        <div
          className={`text-6xl font-black mb-1 ${
            isPerfect ? "text-green-400" : "text-white"
          }`}
        >
          {score}
        </div>
        <div className="text-gray-400 text-sm font-medium">
          {isPerfect
            ? "Perfect! Zero inversions."
            : score === 1
            ? "1 inversion — almost!"
            : `${score} inversions`}
        </div>
      </div>

      {/* True vs player ranking */}
      {gameState.trueRanking && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
              Your Ranking
            </div>
            <div className="space-y-1">
              {gameState.ranking.map((handId, i) => {
                const hand = handMap.get(handId);
                if (!hand) return null;
                const truePos = gameState.trueRanking!.indexOf(handId);
                const correct = truePos === i;
                return (
                  <div
                    key={handId}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                      correct
                        ? "bg-green-900/30 border border-green-700/40"
                        : "bg-red-900/20 border border-red-800/30"
                    }`}
                  >
                    <span className="text-gray-500 w-4">{i + 1}.</span>
                    <span className="text-white font-medium truncate flex-1">
                      {getHandLabel(hand)}
                    </span>
                    <span
                      className={correct ? "text-green-400" : "text-red-400"}
                    >
                      {correct ? "✓" : "✗"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
              True Ranking
            </div>
            <div className="space-y-1">
              {gameState.trueRanking.map((handId, i) => {
                const hand = handMap.get(handId);
                if (!hand) return null;
                return (
                  <div
                    key={handId}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-gray-800/60 border border-gray-700/40"
                  >
                    <span className="text-gray-500 w-4">{i + 1}.</span>
                    <span className="text-white font-medium truncate flex-1">
                      {getHandLabel(hand)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Play again */}
      {isCreator ? (
        <button
          onClick={onPlayAgain}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95"
        >
          Play Again
        </button>
      ) : (
        <p className="text-center text-gray-500 text-sm">
          Waiting for host to start another game...
        </p>
      )}
    </div>
  );
}
