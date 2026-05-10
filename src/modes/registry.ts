/**
 * Client-side mode registry. Maps `state.modeId` (a string the server stamps
 * onto every broadcast) to the React surface area for that mode.
 *
 * Today there's exactly one mode (Ding); the registry exists so adding a
 * second mode is a single import + entry insertion. Per the GameMode-engine
 * plan, the registry shape is:
 *
 *   id → { mode: GameMode, view: GameModeView }
 *
 * Until `state.modeId` is wired into the server broadcast, callers that need
 * to look up "the" mode use `getDefaultMode()`.
 */

import type { ComponentType } from "react";

export interface ClientPhaseMeta {
  phase: string;
  label: string;
  step: string;
  short?: string;
  history?: string;
}

export interface GameModeView {
  id: string;
  phases: ClientPhaseMeta[];
  /** Optional rendered components — mode owns its lobby/game/reveal screens. */
  Lobby?: ComponentType<{ code: string }>;
  Game?: ComponentType;
  Reveal?: ComponentType;
}

const registry = new Map<string, GameModeView>();

export function registerMode(view: GameModeView): void {
  registry.set(view.id, view);
}

/** Look up a mode by id, or null if not registered. */
export function getMode(id: string): GameModeView | null {
  return registry.get(id) ?? null;
}

/**
 * Returns the only registered mode (Ding for now). Throws if zero modes are
 * registered. Use this from contexts where `state.modeId` is not yet
 * available (transitional during the engine migration).
 */
export function getDefaultMode(): GameModeView {
  const first = registry.values().next();
  if (first.done) throw new Error("No game modes registered. Did you import src/modes/ding/view?");
  return first.value;
}

export function listModes(): ReadonlyArray<GameModeView> {
  return Array.from(registry.values());
}
