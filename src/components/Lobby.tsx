"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { ClientMessage, GameState } from "@/lib/types";
import { MAX_PLAYERS } from "@/lib/constants";
import {
  getGameModeDefinition,
  getMaxHandsPerPlayerForMode,
  listGameModes,
  type DingGameModeDefinition,
  type ModeTier,
} from "@/lib/gameMode";
import { D } from "@/lib/theme";

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

type ModeAxis = "Deal" | "Board" | "Identity" | "Visibility" | "Events" | "Info" | "Choice" | "Objective";
type SelectSubTag = "peek-keep" | "mulligan" | "trade-up" | "inheritance" | "expose-choice";

const MODE_TIERS: readonly ModeTier[] = ["standard", "twist", "select", "wild", "chaos", "insanity"];
const MODE_AXES: readonly ModeAxis[] = ["Deal", "Board", "Identity", "Visibility", "Events", "Info", "Choice", "Objective"];
const SELECT_SUB_TAGS: readonly SelectSubTag[] = ["peek-keep", "mulligan", "trade-up", "inheritance", "expose-choice"];
const MODE_RECENT_KEY = "ding.recentModes.v1";
const MODE_FAVORITES_KEY = "ding.favoriteModes.v1";
const MODE_LAST_TIER_KEY = "ding.lastModeTier.v1";

export default function Lobby({ gameState, myId, code, onSend, onLeave }: LobbyProps) {
  const [copied, setCopied] = useState(false);

  const myPlayer = gameState.players.find((p) => p.id === myId);
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
      style={{ backgroundColor: "#0a1813" }}
    >
      {/* Left — felt showpiece (hidden on short viewports to keep right rail visible) */}
      <div
        className="hidden md:flex flex-1 items-center justify-center relative"
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
              boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
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
                background: "rgba(255,255,255,0.07)",
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
        style={{ background: "#0a1813", borderLeft: `1px solid ${D.panelBorder}` }}
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
              background: "rgba(255,255,255,0.07)",
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
                  background: "rgba(10,30,18,0.6)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0"
                  style={
                    i === 0
                      ? { background: `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`, color: D.ink }
                      : { background: "rgba(255,255,255,0.1)", color: D.sub }
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
                      background: "rgba(255,255,255,0.05)",
                      color: D.muted,
                      border: "1px solid rgba(255,255,255,0.08)",
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
                    background: "rgba(10,30,18,0.6)",
                    color: D.goldBright,
                    border: `1px dashed ${D.panelBorder}`,
                  }}
                >
                  + Add bot
                </button>
              )}
            </div>
          )}

          <ModeSelector
            selectedMode={selectedMode}
            modeOptions={modeOptions}
            disabled={!isCreator}
            onChange={(modeId) => onSend({ type: "configure", modeId })}
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
                      background: `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`,
                      color: D.ink,
                      boxShadow: `0 3px 0 ${D.rail}, 0 6px 16px rgba(0,0,0,0.35)`,
                    }
                  : {
                      background: "rgba(255,255,255,0.06)",
                      color: D.muted,
                      border: "1px solid rgba(255,255,255,0.08)",
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
                border: "1px solid rgba(255,255,255,0.1)",
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

function ModeSelector({
  selectedMode,
  modeOptions,
  disabled,
  onChange,
}: {
  selectedMode: DingGameModeDefinition;
  modeOptions: readonly DingGameModeDefinition[];
  disabled: boolean;
  onChange: (modeId: string) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [activeTier, setActiveTier] = useState<ModeTier>(() => modeTier(selectedMode));
  const [axisFilters, setAxisFilters] = useState<Set<ModeAxis>>(() => new Set());
  const [selectSubFilter, setSelectSubFilter] = useState<SelectSubTag | null>(null);
  const [query, setQuery] = useState("");
  const [focusedId, setFocusedId] = useState(selectedMode.id);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    setFocusedId(selectedMode.id);
  }, [selectedMode.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRecentIds(readStoredModeIds(MODE_RECENT_KEY, modeOptions));
    setFavoriteIds(readStoredModeIds(MODE_FAVORITES_KEY, modeOptions));
    const storedTier = window.localStorage.getItem(MODE_LAST_TIER_KEY);
    if (isModeTier(storedTier)) setActiveTier(storedTier);
  }, [modeOptions]);

  const modeById = useMemo(() => new Map(modeOptions.map((mode) => [mode.id, mode])), [modeOptions]);
  const focusedMode = modeById.get(focusedId) ?? selectedMode;
  const selectedIndex = modeOptions.findIndex((mode) => mode.id === selectedMode.id);
  const searchActive = query.trim().length > 0;

  // Filter semantics:
  //   tier: single-select (active tier tab).
  //   axes: multi-select with OR — a mode matches if ANY checked axis applies.
  //   selectSubFilter: optional sub-mechanic narrowing inside the Select tier.
  //   search: when non-empty, ignores tier/axis filters and matches across all modes.
  const filteredTierModes = useMemo(
    () =>
      modeOptions.filter((mode) => {
        if (searchActive) return modeMatchesQuery(mode, query);
        if (modeTier(mode) !== activeTier) return false;
        if (axisFilters.size > 0) {
          const axes = modeAxes(mode);
          const hasAny = axes.some((axis) => axisFilters.has(axis));
          if (!hasAny) return false;
        }
        if (activeTier === "select" && selectSubFilter && !mode.tags.includes(selectSubFilter)) {
          return false;
        }
        return modeMatchesQuery(mode, query);
      }),
    [activeTier, axisFilters, modeOptions, query, searchActive, selectSubFilter]
  );

  const recentModes = useMemo(
    () =>
      recentIds
        .map((id) => modeById.get(id))
        .filter((mode): mode is DingGameModeDefinition => Boolean(mode))
        .filter((mode) => modeMatchesQuery(mode, query))
        .slice(0, 8),
    [modeById, query, recentIds]
  );

  const favoriteModes = useMemo(
    () =>
      favoriteIds
        .map((id) => modeById.get(id))
        .filter((mode): mode is DingGameModeDefinition => Boolean(mode))
        .filter((mode) => modeMatchesQuery(mode, query)),
    [favoriteIds, modeById, query]
  );

  const navigationModes = useMemo(
    () => dedupeModes([...recentModes, ...favoriteModes, ...filteredTierModes]),
    [favoriteModes, filteredTierModes, recentModes]
  );

  function persistTier(tier: ModeTier) {
    setActiveTier(tier);
    if (typeof window !== "undefined") window.localStorage.setItem(MODE_LAST_TIER_KEY, tier);
  }

  function toggleAxis(axis: ModeAxis) {
    setAxisFilters((previous) => {
      const next = new Set(previous);
      if (next.has(axis)) next.delete(axis);
      else next.add(axis);
      return next;
    });
  }

  function rememberMode(modeId: string) {
    setRecentIds((previous) => {
      const next = [modeId, ...previous.filter((id) => id !== modeId)].slice(0, 12);
      writeStoredModeIds(MODE_RECENT_KEY, next);
      return next;
    });
  }

  function selectMode(modeId: string, closeBrowser: boolean) {
    if (disabled) return;
    rememberMode(modeId);
    onChange(modeId);
    if (closeBrowser) setBrowserOpen(false);
  }

  function toggleFavorite(modeId: string) {
    setFavoriteIds((previous) => {
      const next = previous.includes(modeId)
        ? previous.filter((id) => id !== modeId)
        : [modeId, ...previous].slice(0, 40);
      writeStoredModeIds(MODE_FAVORITES_KEY, next);
      return next;
    });
  }

  function surpriseMe() {
    const pool = filteredTierModes.length > 0 ? filteredTierModes : modeOptions.filter((mode) => modeTier(mode) === activeTier);
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setFocusedId(pick.id);
    selectMode(pick.id, false);
  }

  function handleBrowserKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "/") {
      event.preventDefault();
      searchRef.current?.focus();
      return;
    }
    if (navigationModes.length === 0) return;
    const currentIndex = Math.max(0, navigationModes.findIndex((mode) => mode.id === focusedId));
    const columns = 4;
    const keyOffset =
      event.key === "ArrowRight" ? 1
      : event.key === "ArrowLeft" ? -1
      : event.key === "ArrowDown" ? columns
      : event.key === "ArrowUp" ? -columns
      : 0;
    if (keyOffset !== 0) {
      event.preventDefault();
      const nextIndex = Math.min(navigationModes.length - 1, Math.max(0, currentIndex + keyOffset));
      setFocusedId(navigationModes[nextIndex].id);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      selectMode(focusedId, true);
    }
  }

  return (
    <>
      <div
        className="rounded-lg px-3 py-2 min-w-0"
        style={{ background: "rgba(10,30,18,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
          <div
            className="text-[9px] font-black tracking-[0.25em] uppercase flex-shrink-0"
            style={{ color: D.sub }}
          >
            Game mode
          </div>
          <div className="text-[10px] truncate" style={{ color: D.muted }}>
            {Math.max(1, selectedIndex + 1)}/{modeOptions.length}
          </div>
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-black truncate" style={{ color: D.goldBright }}>
              {selectedMode.name}
            </div>
            <div className="mt-0.5 text-[11px] leading-snug" style={{ color: D.sub }}>
              {selectedMode.summary}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: D.muted }}>
              {modeTier(selectedMode)}
            </div>
            <div className="text-[10px]" style={{ color: D.gold }}>
              {"●".repeat(modeChaosLevel(selectedMode))}
            </div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setBrowserOpen(true)}
            className="h-8 rounded-md text-xs font-black transition-all active:scale-95"
            style={{
              background: "rgba(0,0,0,0.32)",
              color: D.goldBright,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Browse modes
          </button>
          <button
            type="button"
            onClick={surpriseMe}
            disabled={disabled}
            className="h-8 rounded-md text-xs font-black transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`,
              color: D.ink,
              border: "none",
            }}
          >
            Surprise me
          </button>
        </div>
      </div>

      {browserOpen && (
        <div
          className="fixed inset-0 z-50 p-2 sm:p-4"
          style={{ background: "rgba(0,0,0,0.72)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Game mode browser"
          onKeyDown={handleBrowserKeyDown}
          tabIndex={-1}
        >
          <div
            className="h-full max-w-[1180px] mx-auto rounded-lg overflow-hidden flex flex-col"
            style={{
              background: "#0a1813",
              border: `1px solid ${D.panelBorder}`,
              boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
            }}
          >
            <div
              className="flex items-center justify-between gap-2 px-3 py-2"
              style={{ borderBottom: `1px solid ${D.panelBorder}` }}
            >
              <div className="flex gap-1 overflow-x-auto">
                {MODE_TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => persistTier(tier)}
                    aria-pressed={activeTier === tier}
                    className="h-8 px-3 rounded-md text-[11px] font-black uppercase tracking-wide whitespace-nowrap"
                    style={
                      activeTier === tier
                        ? { background: `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`, color: D.ink, border: "none" }
                        : { background: "rgba(255,255,255,0.05)", color: D.sub, border: "1px solid rgba(255,255,255,0.08)" }
                    }
                  >
                    {tier}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setBrowserOpen(false)}
                aria-label="Close mode browser"
                className="w-8 h-8 rounded-md text-lg font-black leading-none"
                style={{ background: "rgba(255,255,255,0.06)", color: D.sub, border: "1px solid rgba(255,255,255,0.08)" }}
              >
                x
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[150px_minmax(0,1fr)_260px] flex-1 min-h-0">
              <div
                className="hidden lg:flex flex-col gap-2 p-3"
                style={{ borderRight: `1px solid ${D.panelBorder}` }}
              >
                <div className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: D.sub }}>
                  Axis
                </div>
                {MODE_AXES.map((axis) => (
                  <label
                    key={axis}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-bold"
                    style={{ background: "rgba(255,255,255,0.04)", color: D.goldBright }}
                  >
                    <input
                      type="checkbox"
                      checked={axisFilters.has(axis)}
                      onChange={() => toggleAxis(axis)}
                      className="accent-[#c9a54a]"
                    />
                    {axis}
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setAxisFilters(new Set())}
                  className="h-7 rounded-md text-[11px] font-bold"
                  style={{ background: "rgba(0,0,0,0.28)", color: D.muted, border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  Clear filters
                </button>
              </div>

              <div className="flex flex-col min-h-0">
                <div
                  className="lg:hidden flex gap-1 overflow-x-auto px-3 py-2"
                  style={{ borderBottom: `1px solid ${D.panelBorder}` }}
                >
                  {MODE_AXES.map((axis) => (
                    <button
                      key={axis}
                      type="button"
                      onClick={() => toggleAxis(axis)}
                      aria-pressed={axisFilters.has(axis)}
                      className="h-7 px-2 rounded-md text-[10px] font-black uppercase tracking-wide whitespace-nowrap"
                      style={
                        axisFilters.has(axis)
                          ? { background: D.accent, color: "#03150d", border: "none" }
                          : { background: "rgba(255,255,255,0.05)", color: D.sub, border: "1px solid rgba(255,255,255,0.08)" }
                      }
                    >
                      {axis}
                    </button>
                  ))}
                </div>

                {activeTier === "select" && !searchActive && (
                  <div
                    className="flex flex-wrap gap-1 px-3 py-2"
                    style={{ borderBottom: `1px solid ${D.panelBorder}` }}
                  >
                    <span className="self-center text-[9px] font-black uppercase tracking-[0.25em] mr-1" style={{ color: D.muted }}>
                      Mechanic
                    </span>
                    {SELECT_SUB_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectSubFilter((prev) => (prev === tag ? null : tag))}
                        aria-pressed={selectSubFilter === tag}
                        className="h-7 px-2 rounded-md text-[10px] font-black tracking-wide whitespace-nowrap"
                        style={
                          selectSubFilter === tag
                            ? { background: D.accent, color: "#03150d", border: "none" }
                            : { background: "rgba(255,255,255,0.05)", color: D.sub, border: "1px solid rgba(255,255,255,0.08)" }
                        }
                      >
                        {tag}
                      </button>
                    ))}
                    {selectSubFilter && (
                      <button
                        type="button"
                        onClick={() => setSelectSubFilter(null)}
                        className="h-7 px-2 rounded-md text-[10px] font-bold"
                        style={{ background: "rgba(0,0,0,0.28)", color: D.muted, border: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        clear
                      </button>
                    )}
                  </div>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto p-3">
                  <ModeGridSection
                    title="Recent"
                    modes={recentModes}
                    selectedId={selectedMode.id}
                    focusedId={focusedId}
                    favoriteIds={favoriteIds}
                    onFocus={setFocusedId}
                    onSelect={(modeId) => selectMode(modeId, true)}
                    onFavorite={toggleFavorite}
                    disabled={disabled}
                  />
                  <ModeGridSection
                    title="Favorites"
                    modes={favoriteModes}
                    selectedId={selectedMode.id}
                    focusedId={focusedId}
                    favoriteIds={favoriteIds}
                    onFocus={setFocusedId}
                    onSelect={(modeId) => selectMode(modeId, true)}
                    onFavorite={toggleFavorite}
                    disabled={disabled}
                  />
                  <ModeGridSection
                    title={searchActive ? "All sections" : `${activeTier} modes`}
                    modes={filteredTierModes}
                    selectedId={selectedMode.id}
                    focusedId={focusedId}
                    favoriteIds={favoriteIds}
                    onFocus={setFocusedId}
                    onSelect={(modeId) => selectMode(modeId, true)}
                    onFavorite={toggleFavorite}
                    disabled={disabled}
                    groupByTier={searchActive}
                    emptyLabel="No modes match the current filters."
                  />
                </div>
              </div>

              <div
                className="hidden lg:flex flex-col p-3 min-h-0"
                style={{ borderLeft: `1px solid ${D.panelBorder}` }}
              >
                <ModeDetail
                  mode={focusedMode}
                  selected={focusedMode.id === selectedMode.id}
                  favorite={favoriteIds.includes(focusedMode.id)}
                  disabled={disabled}
                  onFavorite={() => toggleFavorite(focusedMode.id)}
                  onSelect={() => selectMode(focusedMode.id, true)}
                />
              </div>
            </div>

            <div
              className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 p-3"
              style={{ borderTop: `1px solid ${D.panelBorder}` }}
            >
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search flush, hidden, wild..."
                className="h-9 rounded-md px-3 text-sm font-bold outline-none"
                style={{ background: "rgba(0,0,0,0.35)", color: D.goldBright, border: "1px solid rgba(255,255,255,0.1)" }}
                aria-label="Search game modes"
              />
              <button
                type="button"
                onClick={surpriseMe}
                disabled={disabled}
                className="h-9 px-4 rounded-md text-xs font-black uppercase tracking-wide disabled:opacity-45 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`, color: D.ink, border: "none" }}
              >
                Surprise me
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModeGridSection({
  title,
  modes,
  selectedId,
  focusedId,
  favoriteIds,
  onFocus,
  onSelect,
  onFavorite,
  disabled,
  groupByTier = false,
  emptyLabel,
}: {
  title: string;
  modes: readonly DingGameModeDefinition[];
  selectedId: string;
  focusedId: string;
  favoriteIds: readonly string[];
  onFocus: (modeId: string) => void;
  onSelect: (modeId: string) => void;
  onFavorite: (modeId: string) => void;
  disabled: boolean;
  groupByTier?: boolean;
  emptyLabel?: string;
}) {
  if (modes.length === 0) {
    return emptyLabel ? <div className="text-xs py-6 text-center" style={{ color: D.muted }}>{emptyLabel}</div> : null;
  }
  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: D.sub }}>
          {title}
        </h3>
        <span className="text-[10px]" style={{ color: D.muted }}>
          {modes.length}
        </span>
      </div>
      {groupByTier ? (
        MODE_TIERS.map((tier) => {
          const tierModes = modes.filter((mode) => modeTier(mode) === tier);
          if (tierModes.length === 0) return null;
          return (
            <div key={tier} className="mb-3">
              <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: D.muted }}>{tier}</div>
              <ModeCardGrid modes={tierModes} selectedId={selectedId} focusedId={focusedId} favoriteIds={favoriteIds} onFocus={onFocus} onSelect={onSelect} onFavorite={onFavorite} disabled={disabled} title={title} />
            </div>
          );
        })
      ) : (
        <ModeCardGrid modes={modes} selectedId={selectedId} focusedId={focusedId} favoriteIds={favoriteIds} onFocus={onFocus} onSelect={onSelect} onFavorite={onFavorite} disabled={disabled} title={title} />
      )}
    </section>
  );
}

function ModeCardGrid({
  modes,
  selectedId,
  focusedId,
  favoriteIds,
  onFocus,
  onSelect,
  onFavorite,
  disabled,
  title,
}: {
  modes: readonly DingGameModeDefinition[];
  selectedId: string;
  focusedId: string;
  favoriteIds: readonly string[];
  onFocus: (modeId: string) => void;
  onSelect: (modeId: string) => void;
  onFavorite: (modeId: string) => void;
  disabled: boolean;
  title: string;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
      {modes.map((mode) => (
        <ModeCard
          key={`${title}-${mode.id}`}
          mode={mode}
          selected={mode.id === selectedId}
          focused={mode.id === focusedId}
          favorite={favoriteIds.includes(mode.id)}
          disabled={disabled}
          onFocus={() => onFocus(mode.id)}
          onSelect={() => onSelect(mode.id)}
          onFavorite={() => onFavorite(mode.id)}
        />
      ))}
    </div>
  );
}

function ModeCard({
  mode,
  selected,
  focused,
  favorite,
  disabled,
  onFocus,
  onSelect,
  onFavorite,
}: {
  mode: DingGameModeDefinition;
  selected: boolean;
  focused: boolean;
  favorite: boolean;
  disabled: boolean;
  onFocus: () => void;
  onSelect: () => void;
  onFavorite: () => void;
}) {
  const axes = modeAxes(mode);
  return (
    <div className="relative h-[132px]">
      <button
        type="button"
        onClick={onFocus}
        onDoubleClick={onSelect}
        className="h-full w-full rounded-lg p-2 pr-7 text-left flex flex-col transition-all active:scale-[0.98]"
        style={{
          background: selected ? "rgba(201,165,74,0.18)" : focused ? "rgba(47,184,115,0.14)" : "rgba(10,30,18,0.76)",
          color: D.goldBright,
          border: selected
            ? `1px solid ${D.gold}`
            : focused
            ? `1px solid ${D.accent}`
            : "1px solid rgba(255,255,255,0.08)",
        }}
        aria-label={`${mode.name}, ${axes.join(" ")}, ${modeTier(mode)} tier`}
      >
        <div className="font-black text-xs leading-tight line-clamp-2">{mode.name}</div>
        <div className="mt-1 text-[10px] leading-snug line-clamp-3" style={{ color: D.sub }}>
          {mode.summary}
        </div>
        <div className="mt-auto flex items-center justify-between gap-1">
          <div className="flex flex-wrap gap-0.5 min-w-0">
            {axes.slice(0, 3).map((axis) => (
              <span
                key={axis}
                className="rounded px-1 py-0.5 text-[8px] font-black uppercase tracking-wide"
                style={{ background: "rgba(255,255,255,0.07)", color: D.sub }}
              >
                {axis}
              </span>
            ))}
            {axes.length > 3 && (
              <span className="text-[8px] self-center" style={{ color: D.muted }}>
                +{axes.length - 3}
              </span>
            )}
          </div>
          <span className="text-[10px] flex-shrink-0" style={{ color: D.gold }}>
            {"●".repeat(modeChaosLevel(mode))}
          </span>
        </div>
        {disabled && <span className="sr-only">Host only selection</span>}
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onFavorite();
        }}
        className="absolute right-1.5 top-1.5 w-5 h-5 rounded text-[11px] font-black"
        style={{
          background: favorite ? "rgba(201,165,74,0.22)" : "rgba(255,255,255,0.06)",
          color: favorite ? D.gold : D.muted,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        aria-pressed={favorite}
        aria-label={`${favorite ? "Remove favorite" : "Favorite"} ${mode.name}`}
      >
        {favorite ? "*" : "+"}
      </button>
    </div>
  );
}

function ModeDetail({
  mode,
  selected,
  favorite,
  disabled,
  onFavorite,
  onSelect,
}: {
  mode: DingGameModeDefinition;
  selected: boolean;
  favorite: boolean;
  disabled: boolean;
  onFavorite: () => void;
  onSelect: () => void;
}) {
  const axes = modeAxes(mode);
  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: D.sub }}>
        Focused mode
      </div>
      <h2 className="mt-2 text-2xl font-black leading-tight" style={{ color: D.goldBright }}>
        {mode.name}
      </h2>
      <div className="mt-2 flex flex-wrap gap-1">
        <span className="rounded px-2 py-1 text-[10px] font-black uppercase" style={{ background: "rgba(255,255,255,0.07)", color: D.sub }}>
          {modeTier(mode)}
        </span>
        {axes.map((axis) => (
          <span key={axis} className="rounded px-2 py-1 text-[10px] font-black uppercase" style={{ background: "rgba(255,255,255,0.07)", color: D.sub }}>
            {axis}
          </span>
        ))}
        <span className="rounded px-2 py-1 text-[10px] font-black" style={{ background: "rgba(201,165,74,0.14)", color: D.gold }}>
          {"●".repeat(modeChaosLevel(mode))}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: D.sub }}>
        {mode.detail}
      </p>
      <div className="mt-3 rounded-lg p-3" style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: D.muted }}>
          Example preflop
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="rounded-md px-2 py-1 text-xs font-black" style={{ background: "rgba(255,255,255,0.07)", color: D.goldBright }}>
            {mode.deal.holeCards} dealt
          </div>
          <div className="rounded-md px-2 py-1 text-xs font-black" style={{ background: "rgba(255,255,255,0.07)", color: D.goldBright }}>
            {mode.deal.keepCards ?? mode.deal.holeCards} kept
          </div>
          <div className="rounded-md px-2 py-1 text-xs font-black" style={{ background: "rgba(255,255,255,0.07)", color: D.goldBright }}>
            {mode.deal.communityCards} board
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs" style={{ color: D.muted }}>
        Recommended: 2-6 players, up to 22 total hands.
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {mode.tags.map((tag) => (
          <span
            key={tag}
            className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
            style={{ background: "rgba(255,255,255,0.06)", color: D.muted }}
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
        <button
          type="button"
          onClick={onFavorite}
          className="h-9 rounded-md text-xs font-black"
          style={{ background: "rgba(255,255,255,0.06)", color: D.goldBright, border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {favorite ? "Favorited" : "Favorite"}
        </button>
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled || selected}
          className="h-9 rounded-md text-xs font-black disabled:opacity-45 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`, color: D.ink, border: "none" }}
        >
          {selected ? "Selected" : "Try it"}
        </button>
      </div>
    </div>
  );
}

function modeTier(mode: DingGameModeDefinition): ModeTier {
  return mode.tier;
}

function modeAxes(mode: DingGameModeDefinition): readonly ModeAxis[] {
  const axes: ModeAxis[] = [];
  if (mode.phaseEffects) axes.push("Events");
  if (mode.infoFeatures) axes.push("Info");
  if (
    mode.deal.visibleHoleCards ||
    mode.deal.visibleHoleCardDetail ||
    mode.deal.visibleCommunityCardDetail ||
    mode.deal.visibleCommunityCardDetails ||
    mode.tags.includes("visibility")
  ) {
    axes.push("Visibility");
  }
  if (
    mode.wildCards ||
    mode.wildCardsByPhase ||
    mode.excludedRanks ||
    mode.excludedMetas ||
    mode.forceRankByMeta ||
    mode.identityResolution ||
    mode.syntheticPair ||
    mode.rankTransform ||
    mode.suitTransform ||
    mode.deal.possibleIdentities ||
    (mode.deal.deck && mode.deal.deck !== "standard")
  ) {
    axes.push("Identity");
  }
  if (
    mode.deal.boards ||
    mode.deal.communityCards !== 5 ||
    mode.deal.visibleCommunityCards ||
    mode.deal.visibleCommunityIndexes ||
    mode.deal.scoreCommunityCards ||
    (mode.deal.boardLayout && mode.deal.boardLayout.kind !== "linear")
  ) {
    axes.push("Board");
  }
  if (mode.deal.dealChoice?.selectionPhase || mode.deal.publicCardSelection === "playerChoice") {
    axes.push("Choice");
  }
  if (mode.score !== "high") axes.push("Objective");
  if (axes.length === 0) axes.push("Deal");
  return axes;
}

function modeChaosLevel(mode: DingGameModeDefinition): number {
  switch (mode.tier) {
    case "insanity": return 5;
    case "chaos": return 4;
    case "wild": return 3;
    case "select": return 2;
    case "twist": return 2;
    case "standard": return 1;
  }
}


function modeMatchesQuery(mode: DingGameModeDefinition, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    mode.id,
    mode.name,
    mode.shortName,
    mode.summary,
    mode.detail,
    modeTier(mode),
    ...modeAxes(mode),
    ...mode.tags,
  ].join(" ").toLowerCase();
  return haystack.includes(needle);
}

function dedupeModes(modes: readonly DingGameModeDefinition[]): DingGameModeDefinition[] {
  const seen = new Set<string>();
  const result: DingGameModeDefinition[] = [];
  for (const mode of modes) {
    if (seen.has(mode.id)) continue;
    seen.add(mode.id);
    result.push(mode);
  }
  return result;
}

function readStoredModeIds(key: string, modeOptions: readonly DingGameModeDefinition[]): string[] {
  if (typeof window === "undefined") return [];
  try {
    const validIds = new Set(modeOptions.map((mode) => mode.id));
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string" && validIds.has(id)) : [];
  } catch {
    return [];
  }
}

function writeStoredModeIds(key: string, ids: readonly string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(ids));
}

function isModeTier(value: string | null): value is ModeTier {
  return MODE_TIERS.includes(value as ModeTier);
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
      style={{ background: "rgba(10,30,18,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
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
              background: `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`,
              color: D.ink,
              border: "none",
            }
          : disabled
          ? {
              background: "rgba(0,0,0,0.2)",
              color: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.06)",
            }
          : {
              background: "rgba(0,0,0,0.3)",
              color: D.goldBright,
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
            }
      }
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
