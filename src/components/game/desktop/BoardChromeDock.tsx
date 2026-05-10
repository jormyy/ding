"use client";

/**
 * Floating top-right cluster on the desktop board: ding/fuckoff/volume/
 * customOutput buttons + the inline notification stack.
 */

import { memo } from "react";
import VolumeControl from "../../VolumeControl";
import CustomOutputButton from "../../CustomOutputButton";

export interface BoardChromeDockProps {
  onDing: () => void;
  onFuckoff: () => void;
  isCustom: boolean;
  onCustomOutput: (text: string, rate: number, pitch: number) => void;
  dingNotifications: { id: string; playerName: string }[];
  fuckoffNotifications: { id: string; playerName: string }[];
}

function BoardChromeDockImpl({
  onDing,
  onFuckoff,
  isCustom,
  onCustomOutput,
  dingNotifications,
  fuckoffNotifications,
}: BoardChromeDockProps) {
  return (
    <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={onDing}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all text-xl select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        aria-label="Ding (signal teammates)"
      >
        🔔
      </button>
      <button
        type="button"
        onClick={onFuckoff}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all text-xl select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        aria-label="Fuck off"
      >
        🖕
      </button>
      <VolumeControl size="md" />
      {isCustom && <CustomOutputButton size="md" onSpeak={onCustomOutput} />}
      <div className="flex flex-col items-end gap-1 pointer-events-none">
        {dingNotifications.map((n) => (
          <div
            key={n.id}
            role="status"
            aria-live="polite"
            className="bg-gray-900/90 border border-gray-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg animate-fade-out whitespace-nowrap"
          >
            {n.playerName} dings
          </div>
        ))}
        {fuckoffNotifications.map((n) => (
          <div
            key={n.id}
            role="status"
            aria-live="polite"
            className="bg-red-900/90 border border-red-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg animate-fade-out whitespace-nowrap"
          >
            {n.playerName} says fuck off
          </div>
        ))}
      </div>
    </div>
  );
}

export const BoardChromeDock = memo(BoardChromeDockImpl);
