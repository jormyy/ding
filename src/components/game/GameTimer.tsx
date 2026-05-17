"use client";

import { useEffect, useRef, useState } from "react";
import type { GameState } from "@/lib/types";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";

interface GameTimerProps {
  gameState: GameState;
  onAutoReady: () => void;
}

function useCountdown(targetMs: number | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (targetMs === null) {
      setRemaining(null);
      return;
    }
    function update() {
      const r = Math.max(0, Math.ceil((targetMs! - Date.now()) / 1000));
      setRemaining(r);
    }
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [targetMs]);

  return remaining;
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function GameTimer({ gameState, onAutoReady }: GameTimerProps) {
  const { gameTimerSeconds, roundTimerSeconds, phaseStartedAt, gameStartedAt, phase } = gameState;
  const autoReadyFiredRef = useRef(false);

  const roundTarget =
    roundTimerSeconds > 0 && phaseStartedAt !== null
      ? phaseStartedAt + roundTimerSeconds * 1000
      : null;

  const gameTarget =
    gameTimerSeconds > 0 && gameStartedAt !== null
      ? gameStartedAt + gameTimerSeconds * 1000
      : null;

  const roundRemaining = useCountdown(roundTarget);
  const gameRemaining = useCountdown(gameTarget);

  // Reset auto-ready flag when phase changes
  useEffect(() => {
    autoReadyFiredRef.current = false;
  }, [phase, phaseStartedAt]);

  // Auto-ready when round timer expires
  useEffect(() => {
    if (
      roundTimerSeconds > 0 &&
      roundRemaining === 0 &&
      !autoReadyFiredRef.current &&
      phase !== "lobby" &&
      phase !== "reveal"
    ) {
      autoReadyFiredRef.current = true;
      onAutoReady();
    }
  }, [roundRemaining, roundTimerSeconds, phase, onAutoReady]);

  if (gameTimerSeconds === 0 && roundTimerSeconds === 0) return null;
  if (phase === "lobby") return null;

  const roundUrgent = roundRemaining !== null && roundRemaining <= 10;
  const gameUrgent = gameRemaining !== null && gameRemaining <= 60;

  return (
    <div className="flex items-center gap-2">
      {roundTimerSeconds > 0 && roundRemaining !== null && (
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black tabular-nums transition-colors"
          style={{
            background: roundUrgent ? surfaces.dangerUrgentBg : "rgba(10,30,18,0.8)",
            border: `1px solid ${roundUrgent ? surfaces.dangerUrgentBorder : D.panelBorder}`,
            color: roundUrgent ? "#e07070" : D.goldBright,
          }}
          title="Round timer"
        >
          <span style={{ color: roundUrgent ? "#e07070" : D.sub }}>⏱</span>
          {fmt(roundRemaining)}
        </div>
      )}
      {gameTimerSeconds > 0 && gameRemaining !== null && (
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black tabular-nums transition-colors"
          style={{
            background: gameUrgent ? surfaces.dangerUrgentBgFaint : surfaces.panelOverlay,
            border: `1px solid ${gameUrgent ? surfaces.dangerUrgentBorderFaint : surfaces.subtleBorder}`,
            color: gameUrgent ? "#e07070" : D.sub,
          }}
          title="Game timer"
        >
          <span>🎯</span>
          {fmt(gameRemaining)}
        </div>
      )}
    </div>
  );
}
