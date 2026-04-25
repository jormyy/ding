import type { Phase } from "./types";

// Player / room limits
export const MAX_PLAYERS = 8;
export const MAX_TOTAL_HANDS = 22;
export const ROOM_CODE_LENGTH = 4;

// Chat limits
export const MAX_CHAT_MESSAGES = 100;
export const MAX_CHAT_LENGTH = 200;
export const CHAT_THROTTLE_MS = 1000;

// Phase order
export const PHASE_ORDER: Phase[] = [
  "lobby",
  "preflop",
  "flop",
  "turn",
  "river",
  "reveal",
];

// Community card counts per phase
export const COMMUNITY_CARDS_FOR_PHASE: Record<Phase, number> = {
  lobby: 0,
  preflop: 0,
  flop: 3,
  turn: 4,
  river: 5,
  reveal: 5,
};

// Phase display labels
export const PHASE_LABELS = ["preflop", "flop", "turn", "river"] as const;
export const PHASE_STEP_LABELS = ["Pre-flop", "Flop", "Turn", "River", "Reveal"] as const;
export const PHASE_SHORT_LABELS = ["P", "F", "T", "R"] as const;
export const PHASE_HISTORY_LABELS = ["Pre", "Flop", "Turn", "River"] as const;

// Game phases where chip moves are allowed
export const GAME_PHASES: Phase[] = ["preflop", "flop", "turn", "river"];

// Toast duration
export const TOAST_DURATION_MS = 3000;

// End game confirm timeout
export const END_GAME_CONFIRM_MS = 4000;

// Notification fade duration
export const NOTIFICATION_FADE_MS = 2500;

