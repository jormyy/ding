import type {
  BoardLayout,
  HierarchyId,
  MetaKind,
  PhaseSubstep,
  QualifierId,
  ScoreRule,
} from "./gameMode/types";

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

export type CardMeta =
  | "joker"
  | "tarot"
  | "cursed"
  | "blessed"
  | "counterfeit"
  | "glitched"
  | "twoSuited"
  | "marked"
  | "trickster";

/** A single playing card. */
export type Card = {
  rank: Rank;
  suit: Suit;
  meta?: CardMeta;
  /** Random art variant assigned at deal time (0–21 for tarot Major Arcana). */
  artVariant?: number;
  possibleIdentities?: Card[];
  justCollapsed?: boolean;
};

export type CardColor = "red" | "black";

/** A card display that may reveal only part of the real card identity. */
export type DisplayedCard = {
  rank?: Rank;
  suit?: Suit;
  color?: CardColor;
  meta?: CardMeta;
  artVariant?: number;
  possibleIdentities?: Card[];
  justCollapsed?: boolean;
};

export type ModeInfo =
  | {
      kind?: "fact";
      id: string;
      label: string;
      value: string;
      payload?: string;
      phase?: Phase;
    }
  | {
      kind: "announce";
      id: string;
      text: string;
      audience: "table" | "player";
      recipientId?: string;
      phase: Phase;
      label?: string;
      value?: string;
    }
  | {
      kind: "card";
      id: string;
      placement: string;
      card: Card;
      subjectId?: string;
      phase: Phase;
      label?: string;
      value?: string;
    }
  | {
      kind: "rat";
      id: string;
      aboutId: string;
      text: string;
      phase: Phase;
      label?: string;
      value?: string;
    };

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
  /** Total hidden+visible cards in this hand, preserved when cards are masked. */
  cardCount?: number;
  /** Cards intentionally visible to everyone before reveal. */
  publicCards?: Card[];
  /** Partial card identities intentionally visible to everyone before reveal. */
  publicCardHints?: DisplayedCard[];
  /** Whether this hand has been revealed during the reveal phase. */
  flipped: boolean;
  /** Human-readable made hand name, populated by the server when entering reveal. */
  madeHandName?: string;
};

export type DealChoiceProgress = {
  /** Number of cards this hand must keep before ranking starts. */
  keepCards: number;
  /** Selected card indexes in the hand's current card order. Masked for non-owners. */
  selectedIndexes: number[] | null;
  /** True once the owner has locked a selection. */
  submitted: boolean;
  /** True when this hand may redraw its full deal once before locking. */
  canMulligan?: boolean;
  /** True once the one-time redraw has been spent. */
  mulliganUsed?: boolean;
  /** True when the selected card will be passed to the left neighbor. */
  tradeUp?: boolean;
  /** True when the unselected card will be passed left and replaced by the right neighbor's discard. */
  inheritance?: boolean;
  /** peekBoard / sacrificeForPeek: server-revealed peeked community cards (owner-only). */
  privatePeekCards?: Card[];
  /** sacrificeForPeek: which hole this hand sacrificed (null = none). */
  sacrificedHoleIndex?: number | null;
  /** optInHole3WithPenalty: true once the player opted to keep all 3. */
  optedThirdHole?: boolean;
  /** blindPool: index in `cards` of the contributed card. */
  blindPoolContribution?: number;
  /** recruit: which card was taken from the right neighbor's discard pile. */
  recruitedFromNeighborIndex?: number | null;
  /** recruit: phase-1 keep is locked; awaiting phase-2 steal. */
  recruitStage?: "keep" | "steal" | "done";
  /** solomon: the splitter's pair-1 / pair-2 proposal (indexes into dealt cards). */
  solomonSplit?: { pair1: number[]; pair2: number[] };
  /** solomon: 0 or 1 — chosen pair index. */
  solomonChosenPair?: 0 | 1;
  /** tablePicks: per-voter ballots; key = voter player id, value = preferred 2 indexes. */
  tablePicksVotes?: Record<string, number[]>;
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
  /**
   * Server timestamp (ms) when the lobby player disconnected, used by the
   * lobby-ghost sweeper. Cleared when they reconnect or leave the lobby.
   */
  disconnectedAt?: number | null;
};

/** Game phase. */
export type Phase =
  | "lobby"
  | "dealChoice"
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
  /**
   * Stable identifier for the active gamemode. The client routes through
   * `getMode(state.modeId)` to find the right view; today only "ding" is
   * registered. Optional on the wire for backwards compat with rooms that
   * persisted state before this field existed — defaults to "ding".
   */
  modeId?: string;
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
  /** Display topology for the visible community cards. */
  communityLayout?: BoardLayout;
  /** Mode-specific public information surfaced by the server. */
  modeInfo?: ModeInfo[];
  /**
   * Board slots, index 0 = rank 1 (best), index N-1 = rank N (worst).
   * `null` = unclaimed slot.
   */
  ranking: (string | null)[];
  /** All hands in the game. Cards are masked for non-owners. */
  hands: Hand[];
  /** Deal-time card selections for modes that deal extra cards before preflop. */
  dealChoices: Record<string, DealChoiceProgress>;
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

  // -------- Phase-effect runtime overrides (broadcast to all clients) --------

  /** Replaces `mode.score` for this round when set by a phase effect. */
  scoreRuleOverride?: ScoreRule;
  /** Qualifier outcome evaluated at reveal; UI surfaces a VOIDED badge when ok is false. */
  qualifierResult?: {
    ok: boolean;
    qualifierId: QualifierId;
    failedReason?: string;
  };
  /** Active hierarchy effect; reveal UI uses this to label the active ordering. */
  handHierarchyId?: HierarchyId;
  /** Hand IDs whose cards moved onto the board (e.g. last-rites absorb). */
  absorbedHandIds?: string[];
  /** Wild rank picked at runtime (e.g. hostageRankBecomesWild — designated hand's first card rank). */
  wildRankByEffect?: Rank;
  /** Hands frozen at the flop and excluded from later phase-effect mutations. */
  lockedHandIds?: string[];
  /** True when board suits are hidden for scoring (stripBoardSuits). */
  suitsStripped?: boolean;
  /** Index of a community card marked wild by markOneBoardWild. */
  markedBoardWildIndex?: number;
  /** Active phase-tempo substep (flopOneAtATime, revertToFlopBriefly, etc.). */
  phaseSubstep?: PhaseSubstep;
  /** Meta-deck target card identity, surfaced via the meta-legend info chip. */
  metaTargetCard?: Card;
  /** Meta-deck flavour identifier for the legend chip. */
  metaKind?: MetaKind;
  /** Auction-row pool of remaining dealt-but-unclaimed cards (only set for auction modes). */
  auctionPool?: {
    cards: Card[];
    remainingIndexes: number[];
    claimQueue: string[];
    claimsPerPlayer: Record<string, number>;
  };
  /** Flop-draft pool of face-up flop cards mid-draft (only set during flopDraftPending substep). */
  flopDraftPool?: {
    cards: Card[];
    remainingIndexes: number[];
    draftedBy: Record<string, number[]>;
  };
  /** Hand IDs that opted into the 3rd hole at deal-choice (drives the reveal penalty). */
  optedHandIds?: string[];

  /**
   * Per-feature extension slot keyed by stable feature id (e.g. "auction",
   * "bridge-bid"). New mode-specific state opts in here instead of growing
   * `GameState` proper. Visibility is feature-controlled via maskers;
   * anything without a registered masker is omitted from the broadcast.
   */
  modeExt?: Record<string, unknown>;
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
  /** Optional handId when the signal refers to a specific hand. */
  handId?: string;
};

export type ChaosEventType = string;

export type ChaosEvent = {
  event: ChaosEventType;
  affected: string[];
  phase: Phase;
  modeId: string;
};

/**
 * All messages sent from the client to the PartyKit server.
 * Each variant corresponds to a handler in `party/handlers/`.
 */
export type ClientMessage =
  | { type: "join"; name: string; pid: string }
  | { type: "configure"; handsPerPlayer?: number; gameTimerSeconds?: number; roundTimerSeconds?: number; modeId?: string }
  | { type: "start" }
  | { type: "chooseDealCards"; handId: string; indexes: number[] }
  | { type: "mulliganHand"; handId: string }
  | { type: "auctionClaim"; poolCardIndex: number }
  | { type: "contributeToBlindPool"; handId: string; cardIndex: number }
  | { type: "sacrificeHole"; handId: string; cardIndex: number | null }
  | { type: "optInThirdHole"; handId: string; optIn: boolean }
  | { type: "recruitFromNeighbor"; handId: string; neighborDiscardIndex: number }
  | { type: "solomonSplit"; handId: string; pair1: number[]; pair2: number[] }
  | { type: "solomonChoose"; targetHandId: string; chosenPair: 0 | 1 }
  | { type: "tablePicksVote"; targetHandId: string; indexes: number[] }
  | { type: "draftFlopCard"; poolCardIndex: number }
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
  | { type: "ding"; handId?: string }
  | { type: "fuckoff"; handId?: string }
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
  | ({ type: "chaos-event" } & ChaosEvent)
  | { type: "ding"; playerName: string }
  | { type: "fuckoff"; playerName: string }
  | { type: "customOutput"; playerName: string; text: string; rate: number; pitch: number; voiceURI?: string }
  | { type: "error"; message: string };
