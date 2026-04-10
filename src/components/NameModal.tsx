"use client";

import { useState } from "react";

interface NameModalProps {
  onSubmit: (name: string) => void;
}

export default function NameModal({ onSubmit }: NameModalProps) {
  const [name, setName] = useState("");

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed.slice(0, 20));
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-950/30 via-gray-950 to-gray-950 pointer-events-none" />

      <div className="relative z-10 bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black tracking-tighter text-white mb-1">
            DING
          </h1>
          <p className="text-gray-400 text-sm">What should we call you?</p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Your name..."
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500 transition-colors text-center text-lg"
          />
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-150 active:scale-95"
          >
            Enter Room
          </button>
        </div>
      </div>
    </div>
  );
}
