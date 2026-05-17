"use client";

import { useEffect, useState } from "react";
import type { ClientMessage, GameState } from "@/lib/types";
import { MAX_PLAYERS } from "@/lib/constants";
import {
  getGameModeDefinition,
  getMaxHandsPerPlayerForMode,
  listGameModes,
} from "@/lib/gameMode";
import { D } from "@/lib/theme";
import { shades, shadows, surfaces } from "@/lib/tokens";
import { findPlayerById } from "@/lib/utils";
import ModeBrowser from "./ModeBrowser";

interface LobbyProps {
  gameState: GameState;
  myId: string;
  code: string;
  onSend: (msg: ClientMessage) => void;
  onLeave: () => void;
}

const GAME_TIMER_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "5m", value: 300 },
  { label: "10m", value: 600 },
  { label: "15m", value: 900 },
  { label: "20m", value: 1200 },
  { label: "30m", value: 1800 },
];

const ROUND_TIMER_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "2m", value: 120 },
  { label: "3m", value: 180 },
  { label: "5m", value: 300 },
];

export default function Lobby({ gameState, myId, code, onSend, onLeave }: LobbyProps) {
  const [copied, setCopied] = useState(false);

  const myPlayer = findPlayerById(gameState.players, myId);
  const isCreator = myPlayer?.isCreator ?? false;
  const canStart = gameState.players.length >= 2;

  const playerCount = gameState.players.length;
  const selectedMode = getGameModeDefinition(gameState.modeId);
  const modeOptions = listGameModes();
  const maxHands = playerCount > 0 ? getMaxHandsPerPlayerForMode(selectedMode.id, playerCount) : MAX_PLAYERS;
  const seatsOpen = Math.max(0, MAX_PLAYERS - playerCount);
  const canAddBot =
    isCreator &&
    playerCount < MAX_PLAYERS &&
    getMaxHandsPerPlayerForMode(selectedMode.id, playerCount + 1) >= gameState.handsPerPlayer;

  const roomUrl =
    typeof window !== "undefined" ? `${window.location.origin}/room/${code}` : `/room/${code}`;

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.code !== "Space") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      if (!isCreator || !canStart) return;
      event.preventDefault();
      onSend({ type: "start" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canStart, isCreator, onSend]);

  function handleCopyLink() {
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="h-[100dvh] flex flex-col sm:flex-row overflow-hidden"
      style={{ backgroundColor: D.cardBg }}
    >
      {/* Left — felt showpiece (hidden on short viewports to keep right rail visible) */}
      <div
        className="hidden md:flex flex-1 items-center justify-center relative"
        style={{
          backgroundImage: "url('/felt.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          backgroundColor: D.feltLight,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, ${shades.shadowMedium} 100%)` }}
        />
        <div className="relative z-10 text-center px-4">
          <div
            className="font-serif font-black leading-none"
            style={{ fontSize: 64, color: D.goldBright, letterSpacing: "-0.02em" }}
          >
            Ding
          </div>
          <div
            className="text-[10px] font-bold tracking-[0.4em] uppercase mt-1"
            style={{ color: D.sub }}
          >
            Waiting Room
          </div>

          <div
            className="mt-8 rounded-2xl inline-block px-10 py-6"
            style={{
              background: D.panel,
              border: `1px solid ${D.panelBorder}`,
              boxShadow: `0 16px 48px ${shades.shadowMedium}`,
            }}
          >
            <div className="text-[10px] font-black tracking-[0.4em] uppercase" style={{ color: D.sub }}>
              Room Code
            </div>
            <div
              className="font-serif font-black leading-none my-3"
              style={{ fontSize: 64, color: D.goldBright, letterSpacing: "0.15em", paddingLeft: "0.15em" }}
            >
              {code}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all"
              style={{
                background: surfaces.tagBg,
                color: D.sub,
                border: `1px solid ${D.panelBorder}`,
              }}
            >
              {copied ? "✓ Copied!" : "⧉ Copy invite link"}
            </button>
          </div>

          <p className="mt-4 text-sm" style={{ color: D.sub }}>
            Share the code. First one in is the dealer.
          </p>
        </div>
      </div>

      {/* Right rail — fits a 720px viewport without scrolling */}
      <div
        className="flex-1 md:flex-none md:w-[380px] flex flex-col gap-3 p-4 min-h-0"
        style={{ background: D.cardBg, borderLeft: `1px solid ${D.panelBorder}` }}
      >
        {/* Header: brand + room code (this is the only place these appear when felt is hidden) */}
        <div className="flex items-center justify-between gap-3 md:hidden">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-serif text-2xl font-black" style={{ color: D.goldBright }}>
              Ding
            </span>
            <span
              className="font-mono text-base font-black tracking-[0.2em] truncate"
              style={{ color: D.gold }}
            >
              {code}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-[10px] font-bold rounded-full px-2.5 py-1 flex-shrink-0"
            style={{
              background: surfaces.tagBg,
              color: D.sub,
              border: `1px solid ${D.panelBorder}`,
            }}
            aria-label="Copy invite link"
          >
            {copied ? "✓" : "⧉ Copy"}
          </button>
        </div>

        {/* Roster header */}
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-lg font-bold" style={{ color: D.goldBright }}>
            At the table
          </span>
          <span className="text-xs font-bold" style={{ color: D.sub }}>
            {playerCount}/{MAX_PLAYERS}
            <span style={{ color: D.muted }}> · min 2</span>
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 flex flex-col gap-2">
          {/* Roster — only real players, then a single "open seats" footer if room not full. */}
          <div className="flex flex-col gap-1.5 min-h-0">
            {gameState.players.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 min-w-0"
                style={{
                  background: surfaces.panelOverlay,
                  border: `1px solid ${surfaces.neutralFaint}`,
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0"
                  style={
                    i === 0
                      ? { background: D.goldButton, color: D.ink }
                      : { background: surfaces.dividerLine, color: D.sub }
                  }
                >
                  {p.name[0].toUpperCase()}
                </div>
                <div
                  className="flex-1 min-w-0 text-sm font-bold truncate"
                  style={{ color: D.goldBright }}
                >
                  {p.name}
                  {p.isBot && (
                    <span className="ml-1.5" title="Bot">
                      bot
                    </span>
                  )}
                  {p.id === myId && (
                    <span className="ml-1.5 text-xs font-medium" style={{ color: D.accent }}>
                      (you)
                    </span>
                  )}
                </div>
                {i === 0 && (
                  <div
                    className="text-[9px] font-black tracking-widest uppercase"
                    style={{ color: D.gold }}
                  >
                    Host
                  </div>
                )}
                {!p.connected && (
                  <div className="text-[9px] font-bold" style={{ color: D.muted }}>
                    away
                  </div>
                )}
                {isCreator && p.id !== myId && (
                  <button
                    type="button"
                    onClick={() => onSend({ type: "kick", playerId: p.id })}
                    aria-label={`Remove ${p.name}`}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold leading-none transition-colors hover:bg-red-900/40 hover:text-red-300"
                    style={{
                      background: surfaces.faintFill,
                      color: D.muted,
                      border: `1px solid ${surfaces.subtleBorder}`,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Open-seats summary + add bot — replaces the per-seat empty rows. */}
          {seatsOpen > 0 && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex-1 min-w-0 text-[10px] font-bold tracking-wide uppercase truncate" style={{ color: D.muted }}>
                {seatsOpen} {seatsOpen === 1 ? "seat" : "seats"} open
              </div>
              {isCreator && (
                <button
                  type="button"
                  onClick={() => onSend({ type: "addBot" })}
                  disabled={!canAddBot}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  style={{
                    background: surfaces.panelOverlay,
                    color: D.goldBright,
                    border: `1px dashed ${D.panelBorder}`,
                  }}
                >
                  + Add bot
                </button>
              )}
            </div>
          )}

          <ModeBrowser
            selectedMode={selectedMode}
            modeOptions={modeOptions}
            isCreator={isCreator}
            onSelectMode={(modeId) => onSend({ type: "configure", modeId })}
          />

          {isCreator && (
            <div className="flex flex-col gap-2">
              <SettingRow label="Hands per player" hint={`${playerCount}p x ${gameState.handsPerPlayer}h = ${playerCount * gameState.handsPerPlayer} hands`}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <PillToggle
                    key={n}
                    label={String(n)}
                    active={gameState.handsPerPlayer === n}
                    disabled={n > maxHands}
                    onClick={() => onSend({ type: "configure", handsPerPlayer: n })}
                  />
                ))}
              </SettingRow>

              <SettingRow label="Game timer" hint={gameState.gameTimerSeconds > 0 ? "Counts down for the whole game" : "No overall limit"}>
                {GAME_TIMER_OPTIONS.map(({ label, value }) => (
                  <PillToggle
                    key={value}
                    label={label}
                    active={gameState.gameTimerSeconds === value}
                    onClick={() => onSend({ type: "configure", gameTimerSeconds: value })}
                  />
                ))}
              </SettingRow>

              <SettingRow label="Round timer" hint={gameState.roundTimerSeconds > 0 ? "Auto-readies all players when time's up" : "No per-round limit"}>
                {ROUND_TIMER_OPTIONS.map(({ label, value }) => (
                  <PillToggle
                    key={value}
                    label={label}
                    active={gameState.roundTimerSeconds === value}
                    onClick={() => onSend({ type: "configure", roundTimerSeconds: value })}
                  />
                ))}
              </SettingRow>
            </div>
          )}
        </div>

        {isCreator ? (
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onSend({ type: "start" })}
              disabled={!canStart}
              className="w-full py-3 rounded-xl font-black text-sm tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={
                canStart
                  ? {
                      background: D.goldButton,
                      color: D.ink,
                      boxShadow: shadows.goldButton,
                    }
                  : {
                      background: surfaces.neutralFaint,
                      color: D.muted,
                      border: `1px solid ${surfaces.subtleBorder}`,
                    }
              }
            >
              {canStart ? "Start the game" : "Need at least 2 players"}
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="w-full text-xs font-bold py-1 transition-colors hover:underline"
              style={{ background: "transparent", color: D.muted, border: "none" }}
            >
              Leave table
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2 py-2">
              <div
                className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{ borderColor: D.accent, borderTopColor: "transparent" }}
              />
              <p className="text-sm" style={{ color: D.sub }}>
                Waiting for the host to start…
              </p>
            </div>
            <button
              type="button"
              onClick={onLeave}
              className="w-full py-2 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95"
              style={{
                background: "transparent",
                color: D.muted,
                border: `1px solid ${surfaces.dividerLine}`,
              }}
            >
              Leave table
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** One settings row: small uppercase label + flex pill row + tiny hint. */
function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{ background: surfaces.panelOverlay, border: `1px solid ${surfaces.neutralFaint}` }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div
          className="text-[9px] font-black tracking-[0.25em] uppercase"
          style={{ color: D.sub }}
        >
          {label}
        </div>
        <div className="text-[10px] truncate ml-2" style={{ color: D.muted }}>
          {hint}
        </div>
      </div>
      <div className="flex gap-1.5 min-w-0">{children}</div>
    </div>
  );
}

/** Compact pill button used by every settings row. h-8 instead of aspect-square. */
function PillToggle({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 h-8 rounded-md text-xs font-black transition-all active:scale-95 disabled:cursor-not-allowed"
      style={
        active
          ? {
              background: D.goldButton,
              color: D.ink,
              border: "none",
            }
          : disabled
          ? {
              background: "rgba(0,0,0,0.2)",
              color: surfaces.dimmed,
              border: `1px solid ${surfaces.neutralFaint}`,
            }
          : {
              background: "rgba(0,0,0,0.3)",
              color: D.goldBright,
              border: `1px solid ${surfaces.dividerLine}`,
              cursor: "pointer",
            }
      }
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
