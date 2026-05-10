"use client";

const feltBg = {
  backgroundImage: "url('/felt.png')",
  backgroundRepeat: "repeat" as const,
  backgroundSize: "256px 256px",
};

export default function LoadingScreen({ code }: { code: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={feltBg}>
      <div className="text-center">
        <div
          className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"
          role="status"
          aria-label="Connecting"
        />
        <p className="text-gray-400">Connecting to room {code}...</p>
      </div>
    </div>
  );
}
