"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateRoomCode } from "@/lib/utils";
import { ROOM_CODE_LENGTH } from "@/lib/constants";

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState<string[]>(() =>
    Array(ROOM_CODE_LENGTH).fill("")
  );
  const [joinError, setJoinError] = useState("");
  const inputRefs = useRef<HTMLInputElement[]>([]);

  function handleCreateGame() {
    const code = generateRoomCode();
    router.push(`/room/${code}`);
  }

  function handleJoinGame() {
    const code = joinCode.join("").trim().toUpperCase();
    if (code.length !== ROOM_CODE_LENGTH) {
      setJoinError(`Enter all ${ROOM_CODE_LENGTH} characters`);
      return;
    }
    router.push(`/room/${code}`);
  }

  function handleCharInput(i: number, val: string) {
    const ch = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-1);
    const next = [...joinCode];
    next[i] = ch;
    setJoinCode(next);
    setJoinError("");
    if (ch && i < ROOM_CODE_LENGTH - 1) inputRefs.current[i + 1]?.focus();
  }

  function handleCharKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !joinCode[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
    if (e.key === "Enter") handleJoinGame();
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: "url('/felt.png'), radial-gradient(ellipse at 50% 30%, transparent 30%, rgba(0,0,0,0.7) 100%)",
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
        backgroundColor: "#0a3820",
      }}
    >
      {/* Dark vignette overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 30%, transparent 30%, rgba(0,0,0,0.65) 100%)",
      }} />

      <div className="relative z-10 w-full max-w-2xl px-4 flex flex-col items-center gap-7">
        {/* Title */}
        <div className="text-center">
          <h1
            className="font-serif leading-none"
            style={{
              fontSize: "clamp(72px, 16vw, 120px)",
              fontWeight: 900,
              color: "#f5e6b8",
              textShadow: "0 3px 0 #7a5012, 0 6px 30px rgba(0,0,0,0.5)",
              letterSpacing: "-0.02em",
            }}
          >
            Ding
          </h1>
          <p className="mt-2 text-[11px] font-bold tracking-[0.5em] uppercase" style={{ color: "#9fc5a8" }}>
            rank the hands · trust your read
          </p>
        </div>

        {/* Gold divider */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, #c9a54a88)" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#c9a54a", boxShadow: "0 0 12px #c9a54a99" }} />
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, #c9a54a88)" }} />
        </div>

        {/* Cards row */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Host */}
          <div
            className="rounded-2xl p-6 flex flex-col gap-4"
            style={{
              background: "linear-gradient(180deg, rgba(20,60,36,0.92) 0%, rgba(10,40,22,0.96) 100%)",
              border: "1px solid rgba(201,165,74,0.28)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div>
              <p className="text-[10px] font-black tracking-[0.25em] uppercase mb-1" style={{ color: "#9fc5a8" }}>New Table</p>
              <h2 className="font-serif text-2xl font-bold" style={{ color: "#f5e6b8" }}>Host a game</h2>
              <p className="text-sm mt-1" style={{ color: "#9fc5a8" }}>Start a room. Share a {ROOM_CODE_LENGTH}-letter code.</p>
            </div>
            <GoldButton onClick={handleCreateGame}>Deal me in →</GoldButton>
          </div>

          {/* Join */}
          <div
            className="rounded-2xl p-6 flex flex-col gap-4"
            style={{
              background: "rgba(8,26,16,0.85)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div>
              <p className="text-[10px] font-black tracking-[0.25em] uppercase mb-3" style={{ color: "#9fc5a8" }}>Join a Table</p>
              {/* Code boxes — count driven by ROOM_CODE_LENGTH */}
              <div className="flex gap-2">
                {Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      if (el) inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="text"
                    value={joinCode[i]}
                    onChange={(e) => handleCharInput(i, e.target.value)}
                    onKeyDown={(e) => handleCharKeyDown(i, e)}
                    maxLength={2}
                    className="flex-1 min-w-0 text-center font-serif font-black rounded-xl outline-none transition-all"
                    style={{
                      aspectRatio: "1",
                      background: "rgba(0,0,0,0.4)",
                      border: `1.5px solid ${joinCode[i] ? "#c9a54a" : "rgba(201,165,74,0.35)"}`,
                      color: "#f5e6b8",
                      fontSize: "clamp(20px, 5vw, 32px)",
                    }}
                    aria-label={`Room code digit ${i + 1}`}
                  />
                ))}
              </div>
              {joinError && <p className="text-red-400 text-xs mt-2">{joinError}</p>}
            </div>
            <button
              onClick={handleJoinGame}
              className="w-full py-3 rounded-xl font-black text-sm tracking-wide transition-all active:scale-95"
              style={{
                background: "rgba(255,255,255,0.07)",
                color: "#f5e6b8",
                border: "1px solid rgba(201,165,74,0.35)",
              }}
            >
              Pull up a chair
            </button>
          </div>
        </div>

        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-center" style={{ color: "#6a8a72" }}>
          Rank every hand · a perfect board wins
        </p>
      </div>
    </div>
  );
}

function GoldButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 rounded-xl font-black text-sm tracking-wide transition-all active:scale-95"
      style={{
        background: "linear-gradient(180deg, #f0d278, #c9a54a)",
        color: "#2a1a08",
        boxShadow: "0 3px 0 #78350f, 0 6px 16px rgba(0,0,0,0.35)",
        border: "none",
      }}
    >
      {children}
    </button>
  );
}
