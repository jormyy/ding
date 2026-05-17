"use client";

/**
 * Bottom-right ready pill: per-player dot strip + ready button.
 */

import { memo } from "react";
import type { Player } from "@/lib/types";
import { D } from "@/lib/theme";
import { shades, surfaces } from "@/lib/tokens";
import ReadyButton from "../../ReadyButton";

export interface ReadyPillProps {
  players: Player[];
  isReady: boolean;
  allReady: boolean;
  hasUnclaimedSlots: boolean;
  onReady: (ready: boolean) => void;
}

function ReadyPillImpl({
  players,
  isReady,
  allReady,
  hasUnclaimedSlots,
  onReady,
}: ReadyPillProps) {
  return (
    <div
      className="absolute z-10 flex items-center"
      style={{
        bottom: 14,
        right: 20,
        gap: 10,
        background: shades.shadowMedium,
        borderRadius: 22,
        padding: "6px 10px 6px 14px",
        border: `1px solid ${surfaces.subtleBorder}`,
      }}
    >
      <div style={{ display: "flex", gap: 3 }}>
        {players.map((p) => (
          <div
            key={p.id}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: p.ready ? D.accent : surfaces.whiteBorder,
              boxShadow: p.ready ? `0 0 6px ${surfaces.accentGlow}` : "none",
            }}
            aria-label={`${p.name} ${p.ready ? "ready" : "not ready"}`}
          />
        ))}
      </div>
      <div style={{ fontSize: 11, color: D.sub, fontWeight: 700 }}>
        {players.filter((p) => p.ready).length}/{players.length}
      </div>
      <ReadyButton
        isReady={isReady}
        onToggle={onReady}
        allPlayersReady={allReady}
        disabled={hasUnclaimedSlots}
        small
      />
    </div>
  );
}

export const ReadyPill = memo(ReadyPillImpl);
