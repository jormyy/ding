"use client";

import { useState } from "react";
import Image from "next/image";
import type { ClientMessage, GameState } from "@/lib/types";
import PlayerList from "./PlayerList";

interface LobbyProps {
  gameState: GameState;
  myId: string;
  code: string;
  onSend: (msg: ClientMessage) => void;
}

export default function Lobby({ gameState, myId, code, onSend }: LobbyProps) {
  const [copied, setCopied] = useState(false);

  const myPlayer = gameState.players.find((p) => p.id === myId);
  const isCreator = myPlayer?.isCreator ?? false;
  const canStart = gameState.players.length >= 2;

  const roomUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${code}`
      : `/room/${code}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleStart() {
    onSend({ type: "start" });
  }

  function handleSetHands(n: number) {
    onSend({ type: "configure", handsPerPlayer: n });
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6" style={{ backgroundImage: "url('/felt.png')", backgroundRepeat: "repeat", backgroundSize: "256px 256px" }}>

      <div className="relative z-10 w-full max-w-md space-y-4">
        {/* Header */}
        <div className="flex justify-center">
          <Image src="/logo.png" alt="Ding" width={200} height={200} priority />
        </div>

        {/* Room Code */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-medium">Room Code</span>
            <button
              onClick={handleCopyLink}
              className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
            >
              {copied ? "✓ Copied!" : "Copy Link"}
            </button>
          </div>
          <div className="text-4xl font-black tracking-[0.3em] text-white text-center py-2">
            {code}
          </div>
          <p className="text-gray-600 text-xs text-center mt-1">
            Share this code with friends
          </p>
        </div>

        {/* Players */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-white font-bold mb-3">
            Players ({gameState.players.length})
          </h2>
          <PlayerList players={gameState.players} myId={myId} />

          {gameState.players.length < 2 && (
            <p className="text-gray-600 text-sm text-center mt-3">
              Waiting for at least 2 players...
            </p>
          )}
        </div>

        {/* Creator controls */}
        {isCreator && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-white font-bold">Game Settings</h2>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">
                Hands per player
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => {
                  const playerCount = gameState.players.length;
                  const maxHands = playerCount <= 2 ? 6 : playerCount <= 4 ? 4 : 3;
                  const disabled = n > maxHands;
                  const title = n > 4
                    ? "Only available with 2 players"
                    : n > 3
                    ? "Only available with 4 or fewer players"
                    : undefined;
                  return (
                    <button
                      key={n}
                      onClick={() => !disabled && handleSetHands(n)}
                      disabled={disabled}
                      title={title}
                      className={`flex-1 py-2 rounded-lg font-bold text-lg transition-all ${
                        gameState.handsPerPlayer === n
                          ? "bg-green-600 text-white"
                          : disabled
                          ? "bg-gray-800/40 text-gray-700 cursor-not-allowed"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={!canStart}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-150 active:scale-95 text-lg shadow-lg shadow-green-900/30"
            >
              {canStart ? "Start Game" : "Need at least 2 players"}
            </button>
          </div>
        )}

        {!isCreator && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400">Waiting for the host to start...</p>
          </div>
        )}
      </div>
    </div>
  );
}
