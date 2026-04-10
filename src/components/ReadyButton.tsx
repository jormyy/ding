"use client";

interface ReadyButtonProps {
  isReady: boolean;
  onToggle: (ready: boolean) => void;
  allPlayersReady: boolean;
  disabled?: boolean;
}

export default function ReadyButton({
  isReady,
  onToggle,
  disabled = false,
}: ReadyButtonProps) {
  return (
    <button
      onClick={() => !disabled && onToggle(!isReady)}
      disabled={disabled && !isReady}
      title={disabled ? "Claim all rank chips first" : undefined}
      className={`px-8 py-3 rounded-xl font-bold text-lg transition-all duration-150 active:scale-95 shadow-lg ${
        disabled && !isReady
          ? "bg-gray-800 text-gray-600 cursor-not-allowed shadow-none"
          : isReady
          ? "bg-green-600 hover:bg-green-500 text-white shadow-green-900/50"
          : "bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-gray-900/50"
      }`}
    >
      {isReady ? "✓ Ready!" : "Ready?"}
    </button>
  );
}
