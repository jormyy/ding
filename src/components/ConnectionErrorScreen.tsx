"use client";

const feltBg = {
  backgroundImage: "url('/felt.png')",
  backgroundRepeat: "repeat" as const,
  backgroundSize: "256px 256px",
};

export default function ConnectionErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={feltBg}>
      <div className="text-center">
        <div className="text-red-400 text-xl font-bold mb-2">Connection Error</div>
        <p className="text-gray-400">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
