"use client";

/**
 * Desktop board header strip — title, room code, phase progress, player
 * counts, game timer, end-game control.
 */

import { memo } from "react";
import type { GameState } from "@/lib/types";
import { PHASES_META } from "@/lib/constants";
import { getGameModeDefinition } from "@/lib/gameMode";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import GameTimer from "../GameTimer";

export interface BoardHeaderProps {
  gameState: GameState;
  code?: string;
  totalHands: number;
  isCreator: boolean;
  confirmingEnd: boolean;
  onAutoReady: (ready: boolean) => void;
  onEndGameClick: () => void;
}

function BoardHeaderImpl({
  gameState,
  code,
  totalHands,
  isCreator,
  confirmingEnd,
  onAutoReady,
  onEndGameClick,
}: BoardHeaderProps) {
  const currentPhaseIdx = PHASES_META.findIndex((meta) => meta.phase === gameState.phase);
  const mode = getGameModeDefinition(gameState.modeId);
  return (
    <div
      className="flex-none flex items-center px-4 gap-3"
      style={{
        height: 54,
        background: D.panelBold,
        borderBottom: `1px solid ${surfaces.goldMid}`,
        flexShrink: 0,
      }}
    >
      <span className="font-serif font-black" style={{ fontSize: 22, color: D.goldBright }}>
        Ding
      </span>
      <div className="w-px h-5 bg-white/10" />
      {code && (
        <span
          className="text-[10px] font-black tracking-widest uppercase"
          style={{ color: D.gold }}
        >
          Room {code}
        </span>
      )}
      <span
        className="hidden md:block max-w-28 truncate rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
        style={{
          color: D.goldBright,
          background: surfaces.neutralFaint,
          border: `1px solid ${surfaces.subtleBorder}`,
        }}
        title={mode.detail}
      >
        {mode.shortName}
      </span>
      <div className="flex-1 flex items-center justify-center gap-0">
        {PHASES_META.map((meta, i) => {
          const done = i < currentPhaseIdx;
          const active = i === currentPhaseIdx;
          return (
            <div key={meta.phase} className="flex items-center">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-colors"
                style={{ background: active ? surfaces.goldFaint : "transparent" }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: active
                      ? D.gold
                      : done
                      ? D.accent
                      : surfaces.whiteBorder,
                    boxShadow: active ? "0 0 10px #c9a54a" : "none",
                  }}
                />
                <span
                  className="text-[10px] font-black tracking-wider uppercase hidden sm:inline"
                  style={{
                    color: active ? D.goldBright : done ? D.accent : "rgba(255,255,255,0.3)",
                  }}
                >
                  {meta.step}
                </span>
              </div>
              {i < PHASES_META.length - 1 && (
                <div
                  className="w-3 h-px"
                  style={{ background: surfaces.subtleBorder }}
                />
              )}
            </div>
          );
        })}
      </div>
      <span className="text-[10px] font-bold hidden sm:block" style={{ color: "#6a8a72" }}>
        {gameState.players.length}p · {gameState.handsPerPlayer}h · {totalHands}
      </span>
      <GameTimer gameState={gameState} onAutoReady={() => onAutoReady(true)} />
      {isCreator &&
        (confirmingEnd ? (
          <button
            type="button"
            onClick={onEndGameClick}
            className="text-[11px] font-black px-3 py-1 rounded-full transition-all"
            style={{ background: D.danger, color: "#fff" }}
          >
            sure?
          </button>
        ) : (
          <button
            type="button"
            onClick={onEndGameClick}
            className="text-[11px] font-bold transition-colors"
            style={{ color: D.danger }}
            aria-label="End game"
          >
            End
          </button>
        ))}
    </div>
  );
}

export const BoardHeader = memo(BoardHeaderImpl);
