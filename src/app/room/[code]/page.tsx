"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import NameModal from "@/components/NameModal";
import { GameSessionProvider } from "@/contexts/GameSession";
import { GameModeRouter } from "@/components/GameModeRouter";

/**
 * Room shell — owns just the name-prompt gate. Once a name is committed,
 * mounts <GameSessionProvider> (socket lifecycle + identity + notifications)
 * and <GameModeRouter> (phase-driven rendering).
 */
export default function RoomPage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);

  useEffect(() => {
    const storedName = sessionStorage.getItem("ding-player-name");
    if (storedName) setPlayerName(storedName);
    else setShowNameModal(true);
  }, []);

  function handleNameSubmit(name: string) {
    sessionStorage.setItem("ding-player-name", name);
    setPlayerName(name);
    setShowNameModal(false);
  }

  if (showNameModal || !playerName) {
    return <NameModal onSubmit={handleNameSubmit} />;
  }

  return (
    <GameSessionProvider code={code} playerName={playerName}>
      <GameModeRouter />
    </GameSessionProvider>
  );
}
