/**
 * GameMode contract — the plugin shape every gamemode (Ding, future modes)
 * must satisfy. The PartyKit engine is generic over this contract; mode-
 * specific logic lives behind it in `src/modes/<id>/`.
 *
 * # Concepts
 *
 * - `BaseGameState` is the cross-cutting shape every mode shares (modeId,
 *   players, phase, chat, social signals). Per-mode state extends it.
 * - `BaseAction` is the discriminated-union shape of player actions; `type`
 *   is always a string literal.
 * - `GameMode<S, A>` exposes the lifecycle the engine needs: validate, apply,
 *   advance phase, score the final state, declare invariants and masking.
 *
 * # What is NOT in the contract
 *
 * - Lobby/connection management (engine handles)
 * - Bot scheduling / personality (lives in `src/lib/ai/`, parameterized by mode)
 * - Persistence / DO alarms (engine handles)
 * - Broadcast / mask cache (engine handles, calling into `maskingRules`)
 *
 * The `evaluator?` and `strengthScaler?` fields are optional because non-poker
 * modes don't need them — bot poker-specific code paths stay inert.
 */

import type {
  Card,
  ChatMessage,
  ClientMessage,
  Hand,
  Phase,
  Player,
  SocialSignal,
} from "../types";

// -------- Base shapes ----------------------------------------------------

/**
 * Cross-cutting state every mode shares. Per-mode state extends this with
 * mode-specific fields (ranking, hands, community cards, etc.).
 */
export interface BaseGameState {
  /** Stable identifier for the active mode, e.g. "ding". */
  modeId: string;
  /** Mode-defined phase string. Engine treats this as opaque. */
  phase: string;
  /** Players in the room, including bots. */
  players: Player[];
  /** Room chat history (engine-capped). */
  chatMessages: ChatMessage[];
  /** Social-signal logs (engine-capped). */
  dingLog: SocialSignal[];
  /** Social-signal logs (engine-capped). */
  fuckoffLog: SocialSignal[];
}

/** Shape of a player action. Discriminated by `type`. */
export interface BaseAction {
  type: string;
}

/** Identifies the actor behind an incoming action. */
export interface Actor {
  /** Player ID; matches `Player.id`. */
  id: string;
  /** False for bots and offline timer-driven actors. */
  isHuman: boolean;
}

// -------- Validate / Apply ----------------------------------------------

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Side channel passed to applyAction for mode-specific deltas. */
export interface ApplyCtx {
  /** Engine-provided wall clock (ms) — supplied so tests can inject. */
  now: number;
}

/** Outcome of applying an action. */
export interface ApplyResult<S> {
  /**
   * Slices that changed. The engine uses this to invalidate per-player mask
   * caches and to gate broadcast/alarm scheduling. Returning an empty set is
   * a hint that no client needs an update.
   */
  changed: ReadonlySet<keyof S | "*">;
  /** Optional raw payload to broadcast in addition to the state update. */
  rawBroadcast?: string;
  /** If true, close the actor's connection after broadcast (e.g., kicked). */
  closeActor?: boolean;
}

// -------- Phases ---------------------------------------------------------

// `_S` carries the state shape for downstream tooling that wants to type
// state-aware phase predicates; the body of PhaseSpec is intentionally state-
// agnostic today.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface PhaseSpec<_S extends BaseGameState = BaseGameState, A extends BaseAction = BaseAction> {
  /** Phase identifier, e.g. "preflop". */
  readonly id: string;
  /** Display label, e.g. "Pre-flop". */
  readonly label: string;
  /** Single-character short form for compact UIs. Optional. */
  readonly short?: string;
  /** History strip label. Optional. */
  readonly history?: string;
  /**
   * Action types allowed in this phase. If omitted, all actions are allowed
   * (the mode can still reject in `validateAction`).
   */
  readonly allowedActions?: ReadonlySet<A["type"]>;
  /**
   * If non-null, the engine will broadcast a phase-step transition payload
   * when entering this phase. Mode-specific.
   */
  readonly stepLabel?: string;
}

/** Engine-facing phase metadata derived from PhaseSpec[]. */
export interface PhaseMeta {
  phase: string;
  label: string;
  step: string;
  short?: string;
  history?: string;
}

// -------- Invariants & masking ------------------------------------------

export interface InvariantViolation {
  /** Stable rule id (e.g., "no-duplicate-rank"). */
  rule: string;
  /** Human-readable explanation for logs. */
  message: string;
}

/**
 * A masking rule lets a mode declare what to hide from clients without
 * baking poker semantics into the engine. The engine iterates rules in
 * order and applies them to a per-player draft of the broadcast state.
 *
 * Example (Ding): "hide `Hand.cards` from non-owners unless phase=='reveal'
 * AND hand.flipped".
 */
export interface MaskingRule<S extends BaseGameState = BaseGameState> {
  /** Stable id for telemetry. */
  readonly id: string;
  /** Mutate `view` in place to mask fields the player must not see. */
  apply(view: S, viewerId: string): void;
}

// -------- Hand evaluation (poker-style modes) ---------------------------

/**
 * Shape of a "solved" hand. Modes that don't deal cards return null.
 */
export interface SolvedHand {
  /** Mode-internal opaque numeric rank. Higher = better. */
  rank: number;
  /** Display name (e.g., "Two Pair"). */
  name: string;
  /** Mode-internal opaque pointer used to compare two solved hands. */
  raw: unknown;
}

export interface HandEvaluator {
  /**
   * Solve all hands against a board. Returns `null` for hands without enough
   * cards (e.g., empty hole cards on preflop preview).
   */
  solveAll(hands: Hand[], board: Card[]): Map<string, SolvedHand | null>;
  /**
   * Compute the canonical strongest→weakest ranking. Tied hands appear in
   * stable adjacent order.
   */
  trueRanking(hands: Hand[], board: Card[]): string[];
  /**
   * Numeric rank per hand id (1-based; tied hands share a rank).
   */
  trueRanks(trueRanking: string[], hands: Hand[], board: Card[]): Record<string, number>;
  /**
   * Pairwise inversion count between a claimed ranking and the truth.
   */
  countInversions(
    claimedRanking: (string | null)[],
    trueRanking: string[],
    hands: Hand[],
    board: Card[]
  ): number;
  /**
   * Friendly display name for a solved hand (e.g., "Two Pair, Aces and Kings").
   */
  describe(solved: SolvedHand): string;
}

/**
 * Strength scaling — assigns each hand a [0..1] strength estimate used by the
 * AI. Different modes can use different priors. Implementations are expected
 * to memoize by (phase, board signature) internally.
 */
export interface StrengthScaler {
  /** Scalar strength for an actor's own made hand on the visible board. */
  ownHandStrength(hole: Card[], board: Card[]): number;
  /**
   * Monte-Carlo estimate of equity vs random opponents (used for unknown
   * teammate strength inference and range building).
   */
  estimateStrength(hole: Card[], board: Card[], fieldSize: number, nSims?: number): number;
  /**
   * Build a percentile map keyed by 2-card combo for the current board.
   * Implementations should memoize by (excluded-set, board signature).
   */
  buildPercentileMap(excluded: Set<string>, board: Card[]): Map<string, number>;
  /**
   * Build an absolute strength map keyed by 2-card combo for the current board.
   */
  buildAbsoluteStrengthMap(excluded: Set<string>, board: Card[]): Map<string, number>;
}

// -------- The contract --------------------------------------------------

export interface GameMode<
  S extends BaseGameState = BaseGameState,
  A extends BaseAction = BaseAction
> {
  /** Stable id matching `BaseGameState.modeId`. */
  readonly id: string;
  /** Bumped on incompatible state shape changes. Migration logic uses this. */
  readonly version: number;
  /** Phase definitions. The engine uses this for ordering and metadata. */
  readonly phases: ReadonlyArray<PhaseSpec<S, A>>;

  /** Construct a fresh state for a brand-new room. */
  initialState(): S;

  /**
   * Migrate persisted state from an older shape. Optional — if absent and the
   * persisted version differs, the engine starts a fresh state and logs.
   */
  migrate?(raw: unknown, fromVersion: number): S;

  /** Pure validation against current state. No mutation. */
  validateAction(s: Readonly<S>, actor: Actor, a: A): ValidationResult;

  /**
   * Apply an action to a draft state. Engine has already validated. Returns
   * the changed slice set so the engine can invalidate masks and decide
   * whether to broadcast.
   */
  applyAction(draft: S, actor: Actor, a: A, ctx: ApplyCtx): ApplyResult<S>;

  /** True if the mode considers the current state ready to enter the next phase. */
  canAdvancePhase(s: Readonly<S>): boolean;
  /**
   * Advance the phase in place. Returns the from→to transition or null if
   * no advance is possible.
   */
  advancePhase(draft: S): { from: string; to: string } | null;
  /** Final score & ranking for the reveal phase. */
  scoreFinalState(s: Readonly<S>): {
    score: number;
    trueRanking: string[];
    trueRanks: Record<string, number>;
  };

  readonly invariants: ReadonlyArray<(s: Readonly<S>) => InvariantViolation | null>;
  readonly maskingRules: ReadonlyArray<MaskingRule<S>>;
  /**
   * Action types that count toward the AI's "voluntary decision" budget.
   * Things like ready/flip don't count; move/swap/propose/accept/reject do.
   */
  readonly voluntaryActions: ReadonlySet<A["type"]>;

  // Optional, mode-specific:
  evaluator?: HandEvaluator;
  strengthScaler?: StrengthScaler;
}

// -------- Convenience aliases -------------------------------------------

export type DingPhase = Phase;
export type DingAction = ClientMessage;
