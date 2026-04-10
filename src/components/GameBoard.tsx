"use client";

import { useState, useEffect } from "react";
import type { ClientMessage, GameState } from "@/lib/types";
import PokerTable from "./PokerTable";
import ReadyButton from "./ReadyButton";

interface GameBoardProps {
  gameState: GameState;
  myId: string;
  onSend: (msg: ClientMessage) => void;
}

export default function GameBoard({ gameState, myId, onSend }: GameBoardProps) {
  const [localRanking, setLocalRanking] = useState<string[]>(gameState.ranking);
  const [selectedHandId, setSelectedHandId] = useState<string | null>(null);

  useEffect(() => {
    setLocalRanking(gameState.ranking);
  }, [gameState.ranking]);

  const myPlayer = gameState.players.find((p) => p.id === myId);
  const isReady = myPlayer?.ready ?? false;
  const allReady = gameState.players.every((p) => p.ready);

  function handleHandClick(handId: string) {
    const hand = gameState.hands.find((h) => h.id === handId);

    if (selectedHandId === null) {
      // Can only select own hands
      if (hand?.playerId === myId) {
        setSelectedHandId(handId);
      }
      return;
    }

    if (selectedHandId === handId) {
      // Deselect
      setSelectedHandId(null);
      return;
    }

    // Swap selected chip with clicked hand
    const newRanking = [...localRanking];
    const idxA = newRanking.indexOf(selectedHandId);
    const idxB = newRanking.indexOf(handId);
    if (idxA !== -1 && idxB !== -1) {
      newRanking[idxA] = handId;
      newRanking[idxB] = selectedHandId;
      setLocalRanking(newRanking);
    }

    onSend({ type: "swap", handIdA: selectedHandId, handIdB: handId });
    setSelectedHandId(null);
  }

  function handleReady(ready: boolean) {
    onSend({ type: "ready", ready });
  }

  const displayState: GameState = { ...gameState, ranking: localRanking };

  const phaseLabels = ["preflop", "flop", "turn", "river"] as const;

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex-none border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm px-3 py-2 flex items-center justify-between">
        <span className="text-base font-black text-white tracking-tight">DING</span>
        <div className="flex items-center gap-2">
          {phaseLabels.map((phase) => (
            <div
              key={phase}
              className={`flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest transition-colors ${
                gameState.phase === phase ? "text-green-400" : "text-gray-700"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  gameState.phase === phase ? "bg-green-400" : "bg-gray-700"
                }`}
              />
              <span className="hidden sm:inline">{phase === "preflop" ? "pre" : phase}</span>
            </div>
          ))}
        </div>
        <span className="text-green-400 text-[10px] font-bold uppercase tracking-widest">
          {gameState.phase === "preflop" ? "pre-flop" : gameState.phase}
        </span>
      </div>

      {/* Poker Table */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        {/* On mobile: constrain to a square so the oval isn't egg-shaped in portrait */}
        <div className="relative w-full aspect-square sm:aspect-auto sm:h-full">
          <PokerTable
            gameState={displayState}
            myId={myId}
            selectedHandId={selectedHandId}
            onHandClick={handleHandClick}
          />

          {/* Instruction hint */}
          {selectedHandId !== null ? (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="bg-yellow-500/90 text-yellow-950 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                Click any hand to swap
              </div>
            </div>
          ) : (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="bg-gray-900/80 text-gray-400 text-xs px-3 py-1 rounded-full">
                Click your chip to rank it
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar: ready button */}
      <div className="flex-none border-t border-gray-800 bg-gray-950/90 backdrop-blur-sm px-4 py-2.5 flex items-center justify-center gap-3">
        <p className="text-gray-600 text-xs">
          {isReady ? "Waiting for others..." : "Happy with the ranking?"}
        </p>
        <ReadyButton
          isReady={isReady}
          onToggle={handleReady}
          allPlayersReady={allReady}
        />
      </div>
    </div>
  );
}
