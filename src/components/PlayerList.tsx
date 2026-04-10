"use client";

import type { Player } from "@/lib/types";

interface PlayerListProps {
  players: Player[];
  myId: string;
  showReady?: boolean;
}

export default function PlayerList({
  players,
  myId,
  showReady = false,
}: PlayerListProps) {
  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div
          key={player.id}
          className={`flex items-center justify-between px-3 py-2 rounded-lg ${
            player.id === myId
              ? "bg-green-900/30 border border-green-700/50"
              : "bg-gray-800/50 border border-gray-700/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                player.connected ? "bg-green-400" : "bg-gray-600"
              }`}
            />
            <span className={`text-sm font-medium ${player.connected ? "text-white" : "text-gray-500"}`}>
              {player.name}
              {player.id === myId && (
                <span className="text-green-400 text-xs ml-1">(you)</span>
              )}
              {!player.connected && (
                <span className="text-gray-600 text-xs ml-1">(disconnected)</span>
              )}
            </span>
            {player.isCreator && (
              <span className="text-yellow-400 text-xs bg-yellow-400/10 px-1.5 py-0.5 rounded font-medium">
                Host
              </span>
            )}
          </div>

          {showReady && (
            <div>
              {player.ready ? (
                <span className="text-green-400 text-xs font-bold">✓ Ready</span>
              ) : (
                <span className="text-gray-500 text-xs">Waiting...</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
