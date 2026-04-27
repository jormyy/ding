"use client";

import { useEffect, useRef, useState } from "react";
import { getVolume, setVolume, subscribeVolume } from "@/lib/sound";

type Size = "sm" | "md";

const sizeMap: Record<Size, { btn: string; text: string }> = {
  sm: { btn: "w-8 h-8", text: "text-lg" },
  md: { btn: "w-9 h-9", text: "text-xl" },
};

export default function VolumeControl({
  size = "md",
  className = "",
  buttonStyle,
}: {
  size?: Size;
  className?: string;
  buttonStyle?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [volume, setLocalVolume] = useState(0.6);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalVolume(getVolume());
    const unsub = subscribeVolume((v) => setLocalVolume(v));
    return unsub;
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const s = sizeMap[size];
  const icon = volume <= 0 ? "🔇" : volume < 0.5 ? "🔈" : "🔊";

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`${s.btn} flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all ${s.text} select-none`}
        style={buttonStyle}
        aria-label="Volume"
      >
        {icon}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 z-50 bg-gray-900/95 border border-gray-700 rounded-lg shadow-xl px-3 py-2 flex items-center gap-2"
          style={{ minWidth: 140 }}
        >
          <span className="text-xs select-none">🔇</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 accent-yellow-500"
            aria-label="Volume level"
          />
          <span className="text-xs select-none">🔊</span>
        </div>
      )}
    </div>
  );
}
