"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { generateRoomCode } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  function handleCreateGame() {
    const code = generateRoomCode();
    router.push(`/room/${code}`);
  }

  function handleJoinGame() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) {
      setJoinError("Room code must be 4 characters");
      return;
    }
    router.push(`/room/${code}`);
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6" style={{
        backgroundImage: "url('/felt.png')",
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
      }}>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Image src="/logo.png" alt="Ding" width={320} height={320} priority className="drop-shadow-2xl" />
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {/* Create Game */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Create a Game</h2>
            <p className="text-gray-400 text-sm mb-4">
              Start a new room and invite your friends
            </p>
            <button
              onClick={handleCreateGame}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-150 active:scale-95 shadow-lg shadow-green-900/50"
            >
              Create Game
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-600 text-sm font-medium">or</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Join Game */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Join a Game</h2>
            <p className="text-gray-400 text-sm mb-4">
              Enter a 4-character room code
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase().slice(0, 4));
                  setJoinError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleJoinGame()}
                placeholder="XK92"
                maxLength={4}
                className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-lg tracking-widest text-center placeholder:text-gray-600 focus:outline-none focus:border-green-500 transition-colors"
              />
              <button
                onClick={handleJoinGame}
                className="shrink-0 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-150 active:scale-95"
              >
                Join
              </button>
            </div>
            {joinError && (
              <p className="text-red-400 text-sm mt-2">{joinError}</p>
            )}
          </div>
        </div>

        {/* How to play */}
        <div className="mt-8 text-center">
          <p className="text-green-200/70 text-xs leading-relaxed">
            Rank your poker hands from best to worst using the community cards.
            <br />
            Score is based on how many pairs are out of order.
          </p>
        </div>
      </div>
    </div>
  );
}
