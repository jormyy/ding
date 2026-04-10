"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import PartySocket from "partysocket";
import type { ClientMessage, GameState, ServerMessage } from "@/lib/types";
import NameModal from "@/components/NameModal";
import Lobby from "@/components/Lobby";
import GameBoard from "@/components/GameBoard";
import Reveal from "@/components/Reveal";

export default function RoomPage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();

  const [playerName, setPlayerName] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const socketRef = useRef<PartySocket | null>(null);

  // Check sessionStorage for name on mount
  useEffect(() => {
    const storedName = sessionStorage.getItem("ding-player-name");
    if (storedName) {
      setPlayerName(storedName);
    } else {
      setShowNameModal(true);
    }
  }, []);

  // Connect to PartyKit when we have a name
  useEffect(() => {
    if (!playerName) return;

    const host =
      process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";

    const socket = new PartySocket({
      host,
      room: code,
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setMyId(socket.id);
      const joinMsg: ClientMessage = { type: "join", name: playerName };
      socket.send(JSON.stringify(joinMsg));
    });

    socket.addEventListener("message", (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        if (msg.type === "state") {
          setGameState(msg.state);
          setEndedReason(null);
        } else if (msg.type === "ended") {
          setEndedReason(`${msg.playerName} disconnected. Game over.`);
          setGameState(null);
        } else if (msg.type === "error") {
          setConnectionError(msg.message);
        }
      } catch {
        // ignore parse errors
      }
    });

    socket.addEventListener("error", () => {
      setConnectionError("Connection error. Please try again.");
    });

    return () => {
      socket.close();
    };
  }, [playerName, code]);

  function sendMessage(msg: ClientMessage) {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }

  function handleNameSubmit(name: string) {
    sessionStorage.setItem("ding-player-name", name);
    setPlayerName(name);
    setShowNameModal(false);
  }

  // Name modal
  if (showNameModal) {
    return <NameModal onSubmit={handleNameSubmit} />;
  }

  // Connection error
  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-red-400 text-xl font-bold mb-2">
            Connection Error
          </div>
          <p className="text-gray-400">{connectionError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Game ended mid-play
  if (endedReason) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-6xl mb-4">💔</div>
          <div className="text-white text-2xl font-bold mb-2">Game Ended</div>
          <p className="text-gray-400 mb-6">{endedReason}</p>
          <a
            href="/"
            className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  // Loading state
  if (!gameState || !myId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Connecting to room {code}...</p>
        </div>
      </div>
    );
  }

  // Render based on phase
  if (gameState.phase === "lobby") {
    return (
      <Lobby
        gameState={gameState}
        myId={myId}
        code={code}
        onSend={sendMessage}
      />
    );
  }

  if (gameState.phase === "reveal") {
    return (
      <Reveal
        gameState={gameState}
        myId={myId}
        onSend={sendMessage}
      />
    );
  }

  return (
    <GameBoard
      gameState={gameState}
      myId={myId}
      onSend={sendMessage}
    />
  );
}
