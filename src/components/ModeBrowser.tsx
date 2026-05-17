"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import {
  MODE_AXES,
  MODE_TIERS,
  SELECT_SUB_TAGS,
  dedupeModes,
  isModeTier,
  modeAxes,
  modeChaosLevel,
  modeMatchesQuery,
  type DingGameModeDefinition,
  type ModeAxis,
  type ModeTier,
  type SelectSubTag,
} from "@/lib/gameMode";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import { idMap, toggleInSet } from "@/lib/utils";

const MODE_RECENT_KEY = "ding.recentModes.v1";
const MODE_FAVORITES_KEY = "ding.favoriteModes.v1";
const MODE_LAST_TIER_KEY = "ding.lastModeTier.v1";

interface ModeBrowserProps {
  selectedMode: DingGameModeDefinition;
  modeOptions: readonly DingGameModeDefinition[];
  isCreator: boolean;
  onSelectMode: (modeId: string) => void;
}

interface StorageState {
  recentIds: string[];
  favoriteIds: string[];
  lastTier: ModeTier | null;
  rememberRecent: (modeId: string) => void;
  toggleFavorite: (modeId: string) => void;
  setLastTier: (tier: ModeTier) => void;
}

function readStoredModeIds(
  key: string,
  modeOptions: readonly DingGameModeDefinition[],
): string[] {
  if (typeof window === "undefined") return [];
  try {
    const validIds = new Set(modeOptions.map((mode) => mode.id));
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string" && validIds.has(id))
      : [];
  } catch {
    return [];
  }
}

function writeStoredModeIds(key: string, ids: readonly string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(ids));
}

function useModeBrowserStorage(
  modeOptions: readonly DingGameModeDefinition[],
): StorageState {
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [lastTier, setLastTierState] = useState<ModeTier | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRecentIds(readStoredModeIds(MODE_RECENT_KEY, modeOptions));
    setFavoriteIds(readStoredModeIds(MODE_FAVORITES_KEY, modeOptions));
    const stored = window.localStorage.getItem(MODE_LAST_TIER_KEY);
    if (isModeTier(stored)) setLastTierState(stored);
  }, [modeOptions]);

  function rememberRecent(modeId: string) {
    setRecentIds((previous) => {
      const next = [modeId, ...previous.filter((id) => id !== modeId)].slice(0, 12);
      writeStoredModeIds(MODE_RECENT_KEY, next);
      return next;
    });
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

  function setLastTier(tier: ModeTier) {
    setLastTierState(tier);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODE_LAST_TIER_KEY, tier);
    }
  }

  return { recentIds, favoriteIds, lastTier, rememberRecent, toggleFavorite, setLastTier };
}

export default function ModeBrowser({
  selectedMode,
  modeOptions,
  isCreator,
  onSelectMode,
}: ModeBrowserProps) {
  const disabled = !isCreator;
  const searchRef = useRef<HTMLInputElement>(null);
  const lastSelectAtRef = useRef<Map<string, number>>(new Map());
  const storage = useModeBrowserStorage(modeOptions);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [activeTier, setActiveTier] = useState<ModeTier>(selectedMode.tier);
  const [axisFilters, setAxisFilters] = useState<Set<ModeAxis>>(() => new Set());
  const [selectSubFilter, setSelectSubFilter] = useState<SelectSubTag | null>(null);
  const [query, setQuery] = useState("");
  const [focusedId, setFocusedId] = useState(selectedMode.id);

  useEffect(() => {
    setFocusedId(selectedMode.id);
  }, [selectedMode.id]);

  useEffect(() => {
    if (storage.lastTier) setActiveTier(storage.lastTier);
  }, [storage.lastTier]);

  const modeById = useMemo(() => idMap(modeOptions), [modeOptions]);
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
      modeOptions
        .filter((mode) => {
          if (searchActive) return modeMatchesQuery(mode, query);
          if (mode.tier !== activeTier) return false;
          if (axisFilters.size > 0) {
            const axes = modeAxes(mode);
            const hasAny = axes.some((axis) => axisFilters.has(axis));
            if (!hasAny) return false;
          }
          if (selectSubFilter && !mode.tags.includes(selectSubFilter)) {
            return false;
          }
          return modeMatchesQuery(mode, query);
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [activeTier, axisFilters, modeOptions, query, searchActive, selectSubFilter],
  );

  const tierHasSelectionFamily = useMemo(
    () => filteredTierModes.some((mode) => mode.family === "selection"),
    [filteredTierModes],
  );

  const recentModes = useMemo(
    () =>
      storage.recentIds
        .map((id) => modeById.get(id))
        .filter((mode): mode is DingGameModeDefinition => Boolean(mode))
        .filter((mode) => modeMatchesQuery(mode, query))
        .slice(0, 4),
    [modeById, query, storage.recentIds],
  );

  const favoriteModes = useMemo(
    () =>
      storage.favoriteIds
        .map((id) => modeById.get(id))
        .filter((mode): mode is DingGameModeDefinition => Boolean(mode))
        .filter((mode) => modeMatchesQuery(mode, query)),
    [modeById, query, storage.favoriteIds],
  );

  const navigationModes = useMemo(
    () => dedupeModes([...recentModes, ...favoriteModes, ...filteredTierModes]),
    [favoriteModes, filteredTierModes, recentModes],
  );

  function persistTier(tier: ModeTier) {
    setActiveTier(tier);
    storage.setLastTier(tier);
  }

  function toggleAxis(axis: ModeAxis) {
    setAxisFilters((previous) => toggleInSet(previous, axis));
  }

  const selectMode = useCallback((modeId: string, closeBrowser: boolean) => {
    if (disabled) return;
    // Debounce: ignore rapid repeat clicks for the same mode within 300 ms.
    // Try-It buttons were flaky because clicking the same mode twice in quick
    // succession would race the broadcast and leave the selection in an
    // inconsistent state. Tracking last-click time per mode prevents that.
    const now = Date.now();
    const last = lastSelectAtRef.current.get(modeId) ?? 0;
    if (now - last < 300) return;
    lastSelectAtRef.current.set(modeId, now);
    // Optimistically update local focus so the user gets immediate visual
    // feedback even before the broadcast confirms.
    setFocusedId(modeId);
    storage.rememberRecent(modeId);
    onSelectMode(modeId);
    if (closeBrowser) setBrowserOpen(false);
  }, [disabled, onSelectMode]);

  function surpriseMe() {
    const pool = filteredTierModes.length > 0
      ? filteredTierModes
      : modeOptions.filter((mode) => mode.tier === activeTier);
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
        style={{ background: surfaces.panelOverlay, border: `1px solid ${surfaces.neutralFaint}` }}
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
              {selectedMode.tier}
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
              border: `1px solid ${surfaces.dividerLine}`,
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
              background: D.goldButton,
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
              background: D.cardBg,
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
                        ? { background: D.goldButton, color: D.ink, border: "none" }
                        : { background: surfaces.faintFill, color: D.sub, border: `1px solid ${surfaces.subtleBorder}` }
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
                style={{ background: surfaces.neutralFaint, color: D.sub, border: `1px solid ${surfaces.subtleBorder}` }}
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
                    style={{ background: surfaces.disabledOverlay, color: D.goldBright }}
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
                  style={{ background: surfaces.panelDeep, color: D.muted, border: `1px solid ${surfaces.subtleBorder}` }}
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
                          : { background: surfaces.faintFill, color: D.sub, border: `1px solid ${surfaces.subtleBorder}` }
                      }
                    >
                      {axis}
                    </button>
                  ))}
                </div>

                {tierHasSelectionFamily && !searchActive && (
                  <div
                    className="flex flex-wrap gap-1 px-3 py-2"
                    style={{ borderBottom: `1px solid ${D.panelBorder}` }}
                  >
                    <span className="self-center text-[9px] font-black uppercase tracking-[0.25em] mr-1" style={{ color: D.muted }}>
                      Selection
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
                            : { background: surfaces.faintFill, color: D.sub, border: `1px solid ${surfaces.subtleBorder}` }
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
                        style={{ background: surfaces.panelDeep, color: D.muted, border: `1px solid ${surfaces.subtleBorder}` }}
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
                    favoriteIds={storage.favoriteIds}
                    onFocus={setFocusedId}
                    onSelect={(modeId) => selectMode(modeId, true)}
                    onFavorite={storage.toggleFavorite}
                    disabled={disabled}
                  />
                  <ModeGridSection
                    title="Favorites"
                    modes={favoriteModes}
                    selectedId={selectedMode.id}
                    focusedId={focusedId}
                    favoriteIds={storage.favoriteIds}
                    onFocus={setFocusedId}
                    onSelect={(modeId) => selectMode(modeId, true)}
                    onFavorite={storage.toggleFavorite}
                    disabled={disabled}
                  />
                  <ModeGridSection
                    title={searchActive ? "All sections" : `${activeTier} modes`}
                    modes={filteredTierModes}
                    selectedId={selectedMode.id}
                    focusedId={focusedId}
                    favoriteIds={storage.favoriteIds}
                    onFocus={setFocusedId}
                    onSelect={(modeId) => selectMode(modeId, true)}
                    onFavorite={storage.toggleFavorite}
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
                  favorite={storage.favoriteIds.includes(focusedMode.id)}
                  disabled={disabled}
                  onFavorite={() => storage.toggleFavorite(focusedMode.id)}
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
                style={{ background: surfaces.darkIconBg, color: D.goldBright, border: `1px solid ${surfaces.dividerLine}` }}
                aria-label="Search game modes"
              />
              <button
                type="button"
                onClick={surpriseMe}
                disabled={disabled}
                className="h-9 px-4 rounded-md text-xs font-black uppercase tracking-wide disabled:opacity-45 disabled:cursor-not-allowed"
                style={{ background: D.goldButton, color: D.ink, border: "none" }}
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
          const tierModes = modes.filter((mode) => mode.tier === tier);
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
          background: selected ? surfaces.goldLight : focused ? surfaces.accentSoft : "rgba(10,30,18,0.76)",
          color: D.goldBright,
          border: selected
            ? `1px solid ${D.gold}`
            : focused
            ? `1px solid ${D.accent}`
            : `1px solid ${surfaces.subtleBorder}`,
        }}
        aria-label={`${mode.name}, ${axes.join(" ")}, ${mode.tier} tier`}
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
                style={{ background: surfaces.tagBg, color: D.sub }}
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
          background: favorite ? "rgba(201,165,74,0.22)" : surfaces.neutralFaint,
          color: favorite ? D.gold : D.muted,
          border: `1px solid ${surfaces.subtleBorder}`,
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
        <span className="rounded px-2 py-1 text-[10px] font-black uppercase" style={{ background: surfaces.tagBg, color: D.sub }}>
          {mode.tier}
        </span>
        {axes.map((axis) => (
          <span key={axis} className="rounded px-2 py-1 text-[10px] font-black uppercase" style={{ background: surfaces.tagBg, color: D.sub }}>
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
      <div className="mt-3 rounded-lg p-3" style={{ background: surfaces.disabledBg, border: `1px solid ${surfaces.subtleBorder}` }}>
        <div className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: D.muted }}>
          Example preflop
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="rounded-md px-2 py-1 text-xs font-black" style={{ background: surfaces.tagBg, color: D.goldBright }}>
            {mode.deal.holeCards} dealt
          </div>
          <div className="rounded-md px-2 py-1 text-xs font-black" style={{ background: surfaces.tagBg, color: D.goldBright }}>
            {mode.deal.keepCards ?? mode.deal.holeCards} kept
          </div>
          <div className="rounded-md px-2 py-1 text-xs font-black" style={{ background: surfaces.tagBg, color: D.goldBright }}>
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
            style={{ background: surfaces.neutralFaint, color: D.muted }}
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
          style={{ background: surfaces.neutralFaint, color: D.goldBright, border: `1px solid ${surfaces.subtleBorder}` }}
        >
          {favorite ? "Favorited" : "Favorite"}
        </button>
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled || selected}
          className="h-9 rounded-md text-xs font-black disabled:opacity-45 disabled:cursor-not-allowed"
          style={{ background: D.goldButton, color: D.ink, border: "none" }}
        >
          {selected ? "Selected" : "Try it"}
        </button>
      </div>
    </div>
  );
}
