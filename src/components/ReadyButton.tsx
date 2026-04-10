"use client";

interface ReadyButtonProps {
  isReady: boolean;
  onToggle: (ready: boolean) => void;
  allPlayersReady: boolean;
}

export default function ReadyButton({
  isReady,
  onToggle,
  allPlayersReady,
}: ReadyButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => onToggle(!isReady)}
        className={`px-8 py-3 rounded-xl font-bold text-lg transition-all duration-150 active:scale-95 shadow-lg ${
          isReady
            ? "bg-green-600 hover:bg-green-500 text-white shadow-green-900/50"
            : "bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-gray-900/50"
        }`}
      >
        {isReady ? "✓ Ready!" : "Ready"}
      </button>
      {allPlayersReady && (
        <p className="text-green-400 text-sm font-medium animate-pulse">
          All ready — advancing...
        </p>
      )}
    </div>
  );
}
