"use client";

import { useState } from "react";
import type { ClientMessage, GameState } from "@/lib/types";
import { MAX_PLAYERS, MAX_TOTAL_HANDS } from "@/lib/constants";
import { D } from "@/lib/theme";

interface LobbyProps {
  gameState: GameState;
  myId: string;
  code: string;
  onSend: (msg: ClientMessage) => void;
  onLeave: () => void;
}

export default function Lobby({ gameState, myId, code, onSend, onLeave }: LobbyProps) {
  const [copied, setCopied] = useState(false);

  const myPlayer = gameState.players.find((p) => p.id === myId);
  const isCreator = myPlayer?.isCreator ?? false;
  const canStart = gameState.players.length >= 2;

  const roomUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${code}`
      : `/room/${code}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleStart() {
    onSend({ type: "start" });
  }

  function handleSetHands(n: number) {
    onSend({ type: "configure", handsPerPlayer: n });
  }

  const playerCount = gameState.players.length;
  const maxHands = Math.floor(MAX_TOTAL_HANDS / playerCount);
  const canAddBot =
    isCreator &&
    playerCount < MAX_PLAYERS &&
    Math.floor(MAX_TOTAL_HANDS / (playerCount + 1)) >= gameState.handsPerPlayer;

  return (
    <div
      className="min-h-[100dvh] flex flex-col sm:flex-row overflow-hidden"
      style={{ backgroundColor: "#0a1813" }}
    >
      {/* Left — felt showpiece */}
      <div
        className="flex-1 flex items-center justify-center relative min-h-[40vh] sm:min-h-0"
        style={{
          backgroundImage: "url('/felt.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          backgroundColor: "#0a3820",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(0,0,0,0.5) 100%)" }}
        />
        <div className="relative z-10 text-center px-4">
          <div className="font-serif font-black leading-none" style={{ fontSize: 64, color: D.goldBright, letterSpacing: "-0.02em" }}>Ding</div>
          <div className="text-[10px] font-bold tracking-[0.4em] uppercase mt-1" style={{ color: D.sub }}>Waiting Room</div>

          <div
            className="mt-10 rounded-2xl inline-block px-10 py-7"
            style={{
              background: D.panel,
              border: `1px solid ${D.panelBorder}`,
              boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            }}
          >
            <div className="text-[10px] font-black tracking-[0.4em] uppercase" style={{ color: D.sub }}>Room Code</div>
            <div
              className="font-serif font-black leading-none my-3"
              style={{ fontSize: 72, color: D.goldBright, letterSpacing: "0.15em", paddingLeft: "0.15em" }}
            >
              {code}
            </div>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all"
              style={{ background: "rgba(255,255,255,0.07)", color: D.sub, border: `1px solid ${D.panelBorder}` }}
            >
              {copied ? "✓ Copied!" : "⧉ Copy invite link"}
            </button>
          </div>

          <p className="mt-5 text-sm" style={{ color: D.sub }}>Share the code. First one in is the dealer.</p>
        </div>
      </div>

      {/* Right rail */}
      <div
        className="flex-none w-full sm:w-[380px] flex flex-col gap-4 p-5 overflow-y-auto"
        style={{ background: "#0a1813", borderLeft: `1px solid ${D.panelBorder}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-serif text-xl font-bold" style={{ color: D.goldBright }}>At the table</span>
          <span className="text-xs font-bold" style={{ color: D.sub }}>
            {gameState.players.length}
            <span style={{ color: D.muted }}> · min 2</span>
          </span>
        </div>

        {/* Roster */}
        <div className="flex flex-col gap-1.5">
          {gameState.players.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ background: "rgba(10,30,18,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                style={i === 0
                  ? { background: `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`, color: D.ink }
                  : { background: "rgba(255,255,255,0.1)", color: D.sub }}
              >
                {p.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 text-sm font-bold truncate" style={{ color: D.goldBright }}>
                {p.name}
                {p.isBot && <span className="ml-1.5" title="Bot">🤖</span>}
                {p.id === myId && <span className="ml-1.5 text-xs font-medium" style={{ color: D.accent }}>(you)</span>}
              </div>
              {i === 0 && (
                <div className="text-[9px] font-black tracking-widest uppercase" style={{ color: D.gold }}>Host</div>
              )}
              {!p.connected && (
                <div className="text-[9px] font-bold" style={{ color: D.muted }}>away</div>
              )}
              {isCreator && p.id !== myId && (
                <button
                  onClick={() => onSend({ type: "kick", playerId: p.id })}
                  aria-label={`Remove ${p.name}`}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold leading-none transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: D.muted,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(224,112,112,0.15)";
                    e.currentTarget.style.color = "#e07070";
                    e.currentTarget.style.borderColor = "rgba(224,112,112,0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = D.muted;
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {/* Empty seats */}
          {Array.from({ length: Math.max(0, MAX_PLAYERS - gameState.players.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ border: "1px dashed rgba(255,255,255,0.1)" }}
            >
              <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ border: "1.5px dashed rgba(255,255,255,0.15)" }} />
              <div className="text-sm" style={{ color: D.muted }}>Empty seat</div>
              <div className="ml-auto text-xs" style={{ color: D.muted }}>Seat {gameState.players.length + i + 1}</div>
            </div>
          ))}
        </div>

        {isCreator && (
          <button
            onClick={() => onSend({ type: "addBot" })}
            disabled={!canAddBot}
            className="w-full py-2 rounded-xl text-xs font-bold tracking-wide transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "rgba(10,30,18,0.6)",
              color: D.goldBright,
              border: `1px dashed ${D.panelBorder}`,
            }}
          >
            + Add bot 🤖
          </button>
        )}

        {/* Hands per player (creator only) */}
        {isCreator && (
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(10,30,18,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="text-[10px] font-black tracking-[0.25em] uppercase mb-3" style={{ color: D.sub }}>
              Hands per player
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => {
                const disabled = n > maxHands;
                const active = gameState.handsPerPlayer === n;
                return (
                  <button
                    key={n}
                    onClick={() => !disabled && handleSetHands(n)}
                    disabled={disabled}
                    className="flex-1 aspect-square rounded-lg font-black text-lg font-serif transition-all"
                    style={active
                      ? { background: `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`, color: D.ink, border: "none" }
                      : disabled
                      ? { background: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.06)", cursor: "not-allowed" }
                      : { background: "rgba(0,0,0,0.3)", color: D.goldBright, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <p className="text-xs mt-2" style={{ color: D.muted }}>
              {gameState.players.length}p × {gameState.handsPerPlayer}h ={" "}
              <span className="font-bold" style={{ color: D.goldBright }}>
                {gameState.players.length * gameState.handsPerPlayer} hands to rank
              </span>
            </p>
          </div>
        )}

        <div className="flex-1" />

        {isCreator ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleStart}
              disabled={!canStart}
              className="w-full py-4 rounded-xl font-black text-sm tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={canStart
                ? { background: `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`, color: D.ink, boxShadow: `0 3px 0 ${D.rail}, 0 6px 16px rgba(0,0,0,0.35)` }
                : { background: "rgba(255,255,255,0.06)", color: D.muted, border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {canStart ? "Start the game" : "Need at least 2 players"}
            </button>
            <button
              onClick={onLeave}
              className="w-full text-xs font-bold py-1.5 transition-colors hover:underline"
              style={{ background: "transparent", color: D.muted, border: "none" }}
            >
              Leave table
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: D.accent, borderTopColor: "transparent" }} />
              <p className="text-sm" style={{ color: D.sub }}>Waiting for the host to start…</p>
            </div>
            <button
              onClick={onLeave}
              className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95"
              style={{ background: "transparent", color: D.muted, border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Leave table
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
