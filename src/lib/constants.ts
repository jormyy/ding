import type { Phase } from "./types";

// Player / room limits
export const MAX_PLAYERS = 8;
export const ROOM_CODE_LENGTH = 6;

/**
 * How long a disconnected lobby player lingers before the server evicts
 * them. Prevents disconnected ghosts from holding seats and blocking new
 * joiners. Reconnects within the window restore the seat.
 */
export const LOBBY_GRACE_MS = 30_000;

// Chat limits
export const MAX_CHAT_MESSAGES = 100;
export const MAX_CHAT_LENGTH = 200;
export const CHAT_THROTTLE_MS = 1000;
export const MAX_SIGNAL_LOG = 20;

/**
 * Single source of truth for phase display metadata. Components derive
 * whatever per-phase strings they need from this list. The Ding metadata
 * lives here until each gamemode owns its own `PhaseMeta[]`.
 */
export type PhaseMeta = {
  phase: Phase;
  /** Lowercase label, e.g. "flop". */
  label: string;
  /** Human-readable step label shown in the phase strip, e.g. "Flop". */
  step: string;
  /** Single-character short label for compact UIs, e.g. "F". Omitted for `reveal`. */
  short?: string;
  /** History strip label, e.g. "Flop". Omitted for `reveal`. */
  history?: string;
};

export const PHASES_META: readonly PhaseMeta[] = [
  { phase: "dealChoice", label: "dealChoice", step: "Choose" },
  { phase: "preflop", label: "preflop", step: "Pre-flop", short: "P", history: "Pre" },
  { phase: "flop", label: "flop", step: "Flop", short: "F", history: "Flop" },
  { phase: "turn", label: "turn", step: "Turn", short: "T", history: "Turn" },
  { phase: "river", label: "river", step: "River", short: "R", history: "River" },
  { phase: "reveal", label: "reveal", step: "Reveal" },
] as const;

// Toast duration
export const TOAST_DURATION_MS = 3000;

// End game confirm timeout
export const END_GAME_CONFIRM_MS = 4000;

// Notification fade duration
export const NOTIFICATION_FADE_MS = 2500;
