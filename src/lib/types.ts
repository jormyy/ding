/** Playing card suit. */
export type Suit = "H" | "D" | "C" | "S";

/** Playing card rank. T = Ten. */
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "T"
  | "J"
  | "Q"
  | "K"
  | "A";

/** A single playing card. */
export type Card = { rank: Rank; suit: Suit };

/**
 * A single hand belonging to a player.
 * During the game, cards is [] for hands the viewer does not own (masked by the server).
 */
export type Hand = {
  /** Stable ID format: `${playerId}-${handIndex}` (e.g. "abc-0", "abc-1"). */
  id: string;
  /** ID of the player this hand belongs to. */
  playerId: string;
  /** Hole cards. Empty array when sent to non-owners (server masking). */
  cards: Card[];
  /** Whether this hand has been revealed during the reveal phase. */
  flipped: boolean;
  /** Human-readable made hand name, populated by the server when entering reveal. */
  madeHandName?: string;
};

/** A player (human or bot) in the room. */
export type Player = {
  /** Persistent player ID — stable across reconnects, stored in sessionStorage. */
  id: string;
  /** Current WebSocket connection ID — changes on every reconnect. */
  connId: string;
  /** Display name shown in the UI. */
  name: string;
  /** Whether this player created the room (has start/configure/kick powers). */
  isCreator: boolean;
  /** Whether the player has readied up in the current phase. */
  ready: boolean;
  /** Whether the player currently has an active WebSocket connection. */
  connected: boolean;
  /** True for AI bots (server-side only, no real WebSocket). */
  isBot?: boolean;
  /** True if this player has custom output (name started with -=). */
  isCustom?: boolean;
};

/** Game phase. */
export type Phase =
  | "lobby"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "reveal";

/**
 * The full game state broadcast by the server.
 * The server sends a masked version per-player (opponent hole cards hidden).
 */
export type GameState = {
  phase: Phase;
  players: Player[];
  /** Configured at lobby. Capped by total hand limits based on player count. */
  handsPerPlayer: number;
  /** Total game timer in seconds. 0 = disabled. */
  gameTimerSeconds: number;
  /** Per-round timer in seconds. 0 = disabled. When it expires, all connected players are auto-readied. */
  roundTimerSeconds: number;
  /** Server timestamp (ms) when the current phase started. Null during lobby. */
  phaseStartedAt: number | null;
  /** Server timestamp (ms) when the game started (first phase). Null during lobby. */
  gameStartedAt: number | null;
  /** Community cards revealed so far for this phase. */
  communityCards: Card[];
  /**
   * Board slots, index 0 = rank 1 (best), index N-1 = rank N (worst).
   * `null` = unclaimed slot.
   */
  ranking: (string | null)[];
  /** All hands in the game. Cards are masked for non-owners. */
  hands: Hand[];
  /**
   * During reveal: how many hands have been flipped so far.
   * Flipping proceeds worst-ranked → best-ranked.
   */
  revealIndex: number;
  /** Computed true ranking (best→worst) when entering reveal phase. Null until then. */
  trueRanking: string[] | null;
  /** Map of handId → true rank number (ties share the same number). Null until reveal. */
  trueRanks: Record<string, number> | null;
  /** Inversion count. Null until all hands are flipped in reveal. */
  score: number | null;
  /**
   * Historical rank data per hand.
   * Array index corresponds to phase order: [preflop, flop, turn, river].
   * Null means the hand was unranked at that phase boundary.
   */
  rankHistory: Record<string, (number | null)[]>;
  /** Pending chip-move proposals between players. Cleared at phase boundaries. */
  acquireRequests: AcquireRequest[];
  /** Room chat history, capped at 100 messages server-side. */
  chatMessages: ChatMessage[];
  /** Recent ding events, newest last. Capped server-side at ~20. */
  dingLog: SocialSignal[];
  /** Recent fuckoff events, newest last. Capped server-side at ~20. */
  fuckoffLog: SocialSignal[];
};

/** The three kinds of chip moves between players. */
export type AcquireRequestKind = "acquire" | "offer" | "swap";

/**
 * A pending chip-move proposal from one player to another.
 * The server auto-classifies the `kind` based on current rankings when proposed.
 */
export type AcquireRequest = {
  kind: AcquireRequestKind;
  /** Player who initiated the proposal. */
  initiatorId: string;
  /** The initiator's hand involved in the move. */
  initiatorHandId: string;
  /** The recipient's hand involved (recipient can accept or reject). */
  recipientHandId: string;
};

/** A single chat message in the room. */
export type ChatMessage = {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  /** Unix timestamp in milliseconds. */
  ts: number;
};

/** A social signal event (ding or fuckoff). */
export type SocialSignal = {
  playerId: string;
  playerName: string;
  phase: Phase;
  /** Unix timestamp in milliseconds. */
  ts: number;
};

/**
 * All messages sent from the client to the PartyKit server.
 * Each variant corresponds to a handler in `party/handlers/`.
 */
export type ClientMessage =
  | { type: "join"; name: string; pid: string }
  | { type: "configure"; handsPerPlayer?: number; gameTimerSeconds?: number; roundTimerSeconds?: number }
  | { type: "start" }
  | { type: "move"; handId: string; toIndex: number }
  | { type: "swap"; handIdA: string; handIdB: string }
  | { type: "transferOwnChip"; fromHandId: string; toHandId: string }
  | { type: "proposeChipMove"; initiatorHandId: string; recipientHandId: string }
  | { type: "acceptChipMove"; initiatorHandId: string; recipientHandId: string }
  | { type: "rejectChipMove"; initiatorHandId: string; recipientHandId: string }
  | { type: "cancelChipMove"; initiatorHandId: string; recipientHandId: string }
  | { type: "ready"; ready: boolean }
  | { type: "flip"; handId: string }
  | { type: "unclaim"; handId: string }
  | { type: "playAgain" }
  | { type: "endGame" }
  | { type: "ding" }
  | { type: "fuckoff" }
  | { type: "chat"; text: string }
  | { type: "customOutput"; text: string; rate: number; pitch: number; voiceURI?: string }
  | { type: "kick"; playerId: string }
  | { type: "leave" }
  | { type: "addBot" };

/**
 * All messages sent from the PartyKit server to connected clients.
 * `state` is the primary message type — it carries the full masked game state.
 */
export type ServerMessage =
  | { type: "state"; state: GameState }
  | { type: "welcome"; playerId: string }
  | { type: "ding"; playerName: string }
  | { type: "fuckoff"; playerName: string }
  | { type: "customOutput"; playerName: string; text: string; rate: number; pitch: number; voiceURI?: string }
  | { type: "error"; message: string };
