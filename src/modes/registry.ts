/**
 * Client-side mode registry. Maps `state.modeId` (a string the server stamps
 * onto every broadcast) to the React surface area for that mode.
 *
 * Today there's exactly one mode (Ding); the registry exists so adding a
 * second mode is a single import + entry insertion. Per the GameMode-engine
 * plan, the registry shape is:
 *
 *   id → { mode: GameMode, view: GameModeView }
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
