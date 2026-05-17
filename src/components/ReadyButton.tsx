"use client";

import { D } from "@/lib/theme";
import { shades, shadows, surfaces } from "@/lib/tokens";

interface ReadyButtonProps {
  isReady: boolean;
  onToggle: (ready: boolean) => void;
  allPlayersReady: boolean;
  disabled?: boolean;
  small?: boolean;
}

export default function ReadyButton({
  isReady,
  onToggle,
  disabled = false,
  small = false,
}: ReadyButtonProps) {
  const canClick = !disabled || isReady;

  return (
    <button
      onClick={() => canClick && onToggle(!isReady)}
      disabled={!canClick}
      title={disabled && !isReady ? "Claim all rank chips first" : undefined}
      className={[
        "rounded-xl font-black tracking-wide transition-all duration-150 active:scale-95",
        small ? "px-4 py-1.5 text-xs" : "px-8 py-3 text-sm",
      ].join(" ")}
      style={
        !canClick
          ? { background: surfaces.disabledOverlay, color: "rgba(255,255,255,0.25)", cursor: "not-allowed" }
          : isReady
          ? { background: D.accent, color: "#04221a", boxShadow: `0 3px 0 #1a5c3a, 0 6px 16px ${shades.shadowSoft}` }
          : {
              background: D.goldButton,
              color: "#2a1a08",
              boxShadow: shadows.goldButton,
            }
      }
    >
      <span className="inline-flex items-center gap-1.5">
        <span>{isReady ? "✓ Ready!" : "READY →"}</span>
        {!isReady && <span className="text-[9px] opacity-60">␣</span>}
      </span>
    </button>
  );
}
