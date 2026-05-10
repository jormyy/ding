"use client";

import { useEffect, useRef, useState } from "react";

interface NameModalProps {
  onSubmit: (name: string) => void;
}

/**
 * Name-prompt modal. Adds focus-trap so Tab cycles between the name input
 * and the submit button without escaping the dialog, and `aria-modal` so
 * screen readers announce it as a modal.
 */
export default function NameModal({ onSubmit }: NameModalProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed.slice(0, 20));
  }

  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const target = e.target as HTMLElement;
    const first = inputRef.current;
    const last = submitRef.current;
    if (!first || !last) return;
    if (e.shiftKey && target === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && target === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-modal-title"
      onKeyDown={trapTab}
      className="min-h-[100dvh] flex items-center justify-center"
      style={{
        backgroundImage: "url('/felt.png')",
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
      }}
    >
      <div className="relative z-10 bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-6">
          <h1 id="name-modal-title" className="text-4xl font-black tracking-tighter text-white mb-1">
            DING
          </h1>
          <p className="text-gray-400 text-sm">What should we call you?</p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="sr-only">Your name</span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="Your name..."
              maxLength={20}
              aria-label="Your name"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500 transition-colors text-center text-lg"
            />
          </label>
          <button
            ref={submitRef}
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Enter Room
          </button>
        </div>
      </div>
    </div>
  );
}
