import type { Phase } from "./types";

// Player / room limits
export const MAX_PLAYERS = 8;
export const MAX_TOTAL_HANDS = 22;
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

// Phase order (mode-agnostic shape; Ding currently uses all six entries).
export const PHASE_ORDER: Phase[] = [
  "lobby",
  "preflop",
  "flop",
  "turn",
  "river",
  "reveal",
];

// Community card counts per phase (Ding-specific, lives here for legacy
// callers; once mode plumbing lands this becomes mode.phases-derived).
export const COMMUNITY_CARDS_FOR_PHASE: Record<Phase, number> = {
  lobby: 0,
  preflop: 0,
  flop: 3,
  turn: 4,
  river: 5,
  reveal: 5,
};

// Game phases where chip moves are allowed
export const GAME_PHASES: Phase[] = ["preflop", "flop", "turn", "river"];

/**
 * Single source of truth for phase display metadata. Components that used to
 * touch `PHASE_LABELS / PHASE_STEP_LABELS / PHASE_SHORT_LABELS /
 * PHASE_HISTORY_LABELS` should derive from this. The legacy arrays below are
 * derived re-exports kept for backward compatibility.
 *
 * Eventually each gamemode owns its own `PhaseMeta[]` and these constants go
 * away, but for now the Ding metadata lives here.
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
  { phase: "preflop", label: "preflop", step: "Pre-flop", short: "P", history: "Pre" },
  { phase: "flop", label: "flop", step: "Flop", short: "F", history: "Flop" },
  { phase: "turn", label: "turn", step: "Turn", short: "T", history: "Turn" },
  { phase: "river", label: "river", step: "River", short: "R", history: "River" },
  { phase: "reveal", label: "reveal", step: "Reveal" },
] as const;

const _playablePhases = PHASES_META.filter(
  (m) => m.short !== undefined && m.history !== undefined
);

// Legacy arrays — derived from PHASES_META. Prefer importing PHASES_META
// directly in new code.
export const PHASE_LABELS = _playablePhases.map((m) => m.label) as readonly string[] as
  readonly ["preflop", "flop", "turn", "river"];
export const PHASE_STEP_LABELS = PHASES_META.map((m) => m.step) as readonly string[] as
  readonly ["Pre-flop", "Flop", "Turn", "River", "Reveal"];
export const PHASE_SHORT_LABELS = _playablePhases.map((m) => m.short!) as readonly string[] as
  readonly ["P", "F", "T", "R"];
export const PHASE_HISTORY_LABELS = _playablePhases.map((m) => m.history!) as readonly string[] as
  readonly ["Pre", "Flop", "Turn", "River"];

// Toast duration
export const TOAST_DURATION_MS = 3000;

// End game confirm timeout
export const END_GAME_CONFIRM_MS = 4000;

// Notification fade duration
export const NOTIFICATION_FADE_MS = 2500;
