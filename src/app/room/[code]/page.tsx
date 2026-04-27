"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PartySocket from "partysocket";
import type { ClientMessage, GameState, ServerMessage } from "@/lib/types";
import { NOTIFICATION_FADE_MS } from "@/lib/constants";
import { playDingSound, playFuckoffSound } from "@/lib/sound";
import NameModal from "@/components/NameModal";
import Lobby from "@/components/Lobby";
import GameBoard from "@/components/GameBoard";
import Reveal from "@/components/Reveal";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [playerName, setPlayerName] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [dingNotifications, setDingNotifications] = useState<{ id: string; playerName: string }[]>([]);
  const [fuckoffNotifications, setFuckoffNotifications] = useState<{ id: string; playerName: string }[]>([]);

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

  // Retrieve or generate a persistent player ID
  function getOrCreatePid(): string {
    let pid = sessionStorage.getItem("ding-player-id");
    if (!pid) {
      pid = crypto.randomUUID();
      sessionStorage.setItem("ding-player-id", pid);
    }
    return pid;
  }

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
      const pid = getOrCreatePid();
      const joinMsg: ClientMessage = { type: "join", name: playerName, pid };
      socket.send(JSON.stringify(joinMsg));
    });

    socket.addEventListener("message", (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        if (msg.type === "welcome") {
          setMyId(msg.playerId);
        } else if (msg.type === "state") {
          setGameState(msg.state);
        } else if (msg.type === "ding") {
          playDingSound();
          const id = crypto.randomUUID();
          setDingNotifications((prev) => [...prev, { id, playerName: msg.playerName }]);
          setTimeout(() => {
            setDingNotifications((prev) => prev.filter((n) => n.id !== id));
          }, NOTIFICATION_FADE_MS);
        } else if (msg.type === "fuckoff") {
          playFuckoffSound();
          const id = crypto.randomUUID();
          setFuckoffNotifications((prev) => [...prev, { id, playerName: msg.playerName }]);
          setTimeout(() => {
            setFuckoffNotifications((prev) => prev.filter((n) => n.id !== id));
          }, NOTIFICATION_FADE_MS);
        } else if (msg.type === "error") {
          if (msg.message === "Removed by host") {
            socketRef.current?.close();
            router.push("/");
            return;
          }
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

  function sendDing() {
    sendMessage({ type: "ding" });
  }

  function sendFuckoff() {
    sendMessage({ type: "fuckoff" });
  }

  function handleNameSubmit(name: string) {
    sessionStorage.setItem("ding-player-name", name);
    setPlayerName(name);
    setShowNameModal(false);
  }

  function handleLeave() {
    sendMessage({ type: "leave" });
    socketRef.current?.close();
    sessionStorage.removeItem("ding-player-id");
    sessionStorage.removeItem("ding-player-name");
    router.push("/");
  }

  // Name modal
  if (showNameModal) {
    return <NameModal onSubmit={handleNameSubmit} />;
  }

  const feltBg = { backgroundImage: "url('/felt.png')", backgroundRepeat: "repeat" as const, backgroundSize: "256px 256px" };

  // Connection error
  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={feltBg}>
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

  // Loading state
  if (!gameState || !myId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={feltBg}>
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
        onLeave={handleLeave}
      />
    );
  }

  if (gameState.phase === "reveal") {
    return (
      <Reveal
        gameState={gameState}
        myId={myId}
        onSend={sendMessage}
        onDing={sendDing}
        dingNotifications={dingNotifications}
        onFuckoff={sendFuckoff}
        fuckoffNotifications={fuckoffNotifications}
      />
    );
  }

  return (
    <GameBoard
      gameState={gameState}
      myId={myId}
      code={code}
      onSend={sendMessage}
      onDing={sendDing}
      dingNotifications={dingNotifications}
      onFuckoff={sendFuckoff}
      fuckoffNotifications={fuckoffNotifications}
    />
  );
}
