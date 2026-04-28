"use client";

import { useEffect, useRef, useState } from "react";

type Size = "sm" | "md";

const sizeMap: Record<Size, { btn: string; text: string }> = {
  sm: { btn: "w-8 h-8", text: "text-lg" },
  md: { btn: "w-9 h-9", text: "text-xl" },
};

const STORAGE_TEXT = "ding-custom-text";
const STORAGE_RATE = "ding-custom-rate";
const STORAGE_PITCH = "ding-custom-pitch";

function loadNumber(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function loadString(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

export default function CustomOutputButton({
  size = "md",
  className = "",
  buttonStyle,
  onSpeak,
}: {
  size?: Size;
  className?: string;
  buttonStyle?: React.CSSProperties;
  onSpeak: (text: string, rate: number, pitch: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("Hello!");
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [speaking, setSpeaking] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(loadString(STORAGE_TEXT, "Hello!"));
    setRate(loadNumber(STORAGE_RATE, 1.0));
    setPitch(loadNumber(STORAGE_PITCH, 1.0));
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function handleSpeak() {
    if (!text.trim()) return;
    onSpeak(text, rate, pitch);
    setSpeaking(true);
    setTimeout(() => setSpeaking(false), 800);
  }

  function handleTextChange(val: string) {
    setText(val);
    localStorage.setItem(STORAGE_TEXT, val);
  }

  function handleRateChange(val: number) {
    setRate(val);
    localStorage.setItem(STORAGE_RATE, String(val));
  }

  function handlePitchChange(val: number) {
    setPitch(val);
    localStorage.setItem(STORAGE_PITCH, String(val));
  }

  const s = sizeMap[size];

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`${s.btn} flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all ${s.text} select-none ${speaking ? "ring-2 ring-yellow-400" : ""}`}
        style={buttonStyle}
        aria-label="Custom output"
      >
        📢
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 z-50 bg-gray-900/95 border border-gray-700 rounded-lg shadow-xl p-3 flex flex-col gap-2.5"
          style={{ minWidth: 200 }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Text</span>
            <input
              type="text"
              value={text}
              onChange={(e) => handleTextChange(e.target.value.slice(0, 60))}
              onKeyDown={(e) => { if (e.key === "Enter") handleSpeak(); }}
              maxLength={60}
              placeholder="Say something..."
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-white text-xs focus:outline-none focus:border-yellow-500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Speed <span className="text-yellow-400">{rate.toFixed(2)}x</span>
            </span>
            <input
              type="range"
              min={0.25}
              max={3}
              step={0.05}
              value={rate}
              onChange={(e) => handleRateChange(Number(e.target.value))}
              className="flex-1 accent-yellow-500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Pitch <span className="text-yellow-400">{pitch.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={0.1}
              max={2}
              step={0.05}
              value={pitch}
              onChange={(e) => handlePitchChange(Number(e.target.value))}
              className="flex-1 accent-yellow-500"
            />
          </label>

          <button
            onClick={handleSpeak}
            disabled={!text.trim()}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold text-xs py-1.5 rounded-md transition-colors"
          >
            Speak
          </button>
        </div>
      )}
    </div>
  );
}
