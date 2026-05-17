"use client";

/**
 * Top row of a seat: ready dot, player name, offline marker.
 */

import { memo } from "react";
import type { Player } from "@/lib/types";
import { D } from "@/lib/theme";

export interface SeatNameRowProps {
  player: Player;
  isMe: boolean;
  isReveal: boolean;
  isMobile: boolean;
}

function SeatNameRowImpl({ player, isMe, isReveal, isMobile }: SeatNameRowProps) {
  const nameMaxW = isMobile ? "max-w-[60px]" : "max-w-[120px]";
  return (
    <div className="flex items-center gap-1 leading-tight">
      {player.ready && !isReveal && (
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: D.accent }}
          aria-label="Ready"
        />
      )}
      <div
        className={`text-[10px] font-black truncate uppercase tracking-wide ${nameMaxW}`}
        style={{
          color: isMe
            ? D.goldBright
            : !player.connected
            ? "rgba(159,197,168,0.7)"
            : D.sub,
        }}
      >
        {player.name}
      </div>
      {!player.connected && (
        <span
          className="text-[8px] font-black uppercase tracking-widest flex-shrink-0"
          style={{ color: D.danger }}
          title="Disconnected"
        >
          offline
        </span>
      )}
    </div>
  );
}

export const SeatNameRow = memo(SeatNameRowImpl);
