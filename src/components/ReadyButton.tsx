"use client";

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
          ? { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)", cursor: "not-allowed" }
          : isReady
          ? { background: "#2fb873", color: "#04221a", boxShadow: "0 3px 0 #1a5c3a, 0 6px 16px rgba(0,0,0,0.3)" }
          : {
              background: "linear-gradient(180deg, #f0d278, #c9a54a)",
              color: "#2a1a08",
              boxShadow: "0 3px 0 #78350f, 0 6px 16px rgba(0,0,0,0.35)",
            }
      }
    >
      {isReady ? "✓ Ready!" : "READY →"}
    </button>
  );
}
