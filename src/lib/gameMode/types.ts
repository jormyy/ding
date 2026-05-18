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
  CardMeta,
  ChatMessage,
  Hand,
  Phase,
  Player,
  Rank,
  SocialSignal,
  Suit,
} from "../types";

// -------- Mode data types ------------------------------------------------

export const DEFAULT_GAME_MODE_ID = "ding";

export type DeckKind =
  | "standard"
  | "short"
  | "stripped"
  | "bottomHalf"
  | "double"
  | "triple"
  | "half"
  | "pinochle"
  | "tarot"
  | "suitHeavy"
  | "suitLight"
  | "jokers"
  | "cursed"
  | "blessed"
  | "glitch"
  | "twoSuited"
  | "marked"
  | "trickster";

export type HoleCardVisibilityDetail = "full" | "suit" | "rank" | "color" | "hidden";

export type PublicHoleCardSelection = "first" | "highest" | "lowest" | "playerChoice";

export type ScoreRule =
  | "high"
  | "lowball"
  | "flush"
  | "straight"
  | "pairs"
  | "red"
  | "black"
  | "invertedHigh";

/** A qualifier evaluated at reveal; failure marks the round VOIDED. */
export type QualifierId =
  | "requireTopHandIsFlush"
  | "requireAllHandsPaired"
  | "requireTopHandNoFaceCards"
  | "requireAllHandsHaveFace"
  | "requireTopHandRainbow"
  | "requireAdjacentTie"
  | "requireTightSpread"
  | "requireWideSpread"
  | "requireRedRiver"
  | "requirePocketSourceTop"
  | "requirePairToQualify"
  | "excludePairTier";

/** A ranking re-orderer applied at showdown after the base sort. */
export type HierarchyId =
  | "hierarchyByMeta"
  | "cyclicHandHierarchy"
  | "pactMergeFirstLast"
  | "colorTeamAssign"
  | "adjacentRankBonus"
  | "matchRankInherit"
  | "forceAdjacentTie"
  | "crowdedRankPenalty"
  | "enforceOneCardPerBoardRow"
  | "bridgeCardChoice"
  | "uniqueHandClassRequired";

/** Active sub-phase within an outer phase (phase-tempo theatre effects). */
export type PhaseSubstep =
  | "flop1"
  | "flop2"
  | "flop3"
  | "flopRevert"
  | "flopDuplicate"
  | "rewindToTurn"
  | "flopDraftPending";

/** Meta-deck flavour identifier shown in the legend info-chip. */
export type MetaKind =
  | "cursed"
  | "blessed"
  | "marked"
  | "trickster"
  | "glitched"
  | "counterfeit"
  | "twoSuited"
  | "tarot"
  | "joker";

export type DealConstraint =
  | "pocketPair"
  | "sharedFirstCard"
  | "differentSuits"
  | "sameSuit"
  | "connectedRanks"
  | "gappedRanks"
  | "polarRanks"
  | "lowRanks"
  | "highRanks"
  | "atLeastOneFace"
  | "bichrome"
  | "monochrome"
  | "fixedGap5";

export interface GameModeDealRule {
  /** Cards consumed per hand before any automatic keep/discard rule. */
  holeCards: number;
  /** Cards kept in the hand after deal. Omitted means keep every hole card. */
  keepCards?: number;
  /** Player-driven deal-time keep selection. */
  dealChoice?: {
    dealtCards: number;
    keepCards: number;
    selectionPhase: boolean;
    /** Allows one full-hand redraw during deal choice before locking. */
    mulligan?: boolean;
    /** Selects one card to pass left before preflop. */
    tradeUp?: boolean;
    /** Keeps one local card and inherits the right neighbor's discarded card. */
    inheritance?: boolean;
    /** Open auction over a public row of dealt cards. */
    auction?: boolean;
    /** Each player contributes one hole to a face-down center pool, draws back blind. */
    blindPool?: boolean;
    /** Allows peeking at N community cards before locking the hand. */
    peekBoard?: number;
    /** Discard one hole to peek the flop one phase early. */
    sacrificeForPeek?: boolean;
    /** Steal one card from the next player's discard pile. */
    recruit?: boolean;
    /** Split four cards into two pairs and another player chooses which pair you keep. */
    solomon?: boolean;
    /** Other players choose which of your dealt cards you keep. */
    tablePicks?: boolean;
    /** Opt to receive an extra hole in exchange for a tier penalty at reveal. */
    optInHole3WithPenalty?: boolean;
  };
  /** Cards from each hand shown to every player before reveal. */
  publicCards?: number;
  /** Which hole cards become public when publicCards is set. Defaults to first dealt. */
  publicCardSelection?: PublicHoleCardSelection;
  /** Cards from each hand shown to every player by phase. Overrides publicCards when set. */
  visibleHoleCards?: Partial<Record<Phase, number>>;
  /** Which parts of visible hole cards are shown. Defaults to full card identity. */
  visibleHoleCardDetail?: HoleCardVisibilityDetail | Partial<Record<Phase, HoleCardVisibilityDetail>>;
  /** Optional explicit hole-card indexes to expose by phase. Defaults to the first N cards. */
  visibleHoleCardIndexes?: Partial<Record<Phase, number[]>>;
  /** Total community cards dealt for showdown. */
  communityCards: number;
  /** Display topology for the community cards. Defaults to a five-slot linear row. */
  boardLayout?: BoardLayout;
  /** Optional board grouping for modes that score hands against separate boards. */
  boards?: {
    count?: number;
    cardsPerBoard?: number;
    cardIndexes?: number[][];
    scoring: "best";
  };
  /** Community cards visible in each phase. Reveal always shows all cards. */
  visibleCommunityCards?: Partial<Record<Phase, number>>;
  /** Explicit community-card indexes visible per phase. When set, overrides `visibleCommunityCards`
   *  and lets modes reveal non-contiguous positions (e.g. corner-symmetric L reveal). */
  visibleCommunityIndexes?: Partial<Record<Phase, ReadonlyArray<number>>>;
  /** Optional canonical scoring prefix when display-only effects add non-scoring board slots. */
  scoreCommunityCards?: number;
  /** Which parts of visible community cards are shown before reveal. Defaults to full card identity. */
  visibleCommunityCardDetail?: Partial<Record<Phase, HoleCardVisibilityDetail>>;
  /** Per-card overrides for visible community-card display, keyed by community-card index. */
  visibleCommunityCardDetails?: Partial<Record<Phase, Record<number, HoleCardVisibilityDetail>>>;
  /** Adds alternate unresolved identities to dealt cards without changing physical card count. */
  possibleIdentities?: "holes" | "board" | "holesAndBoard";
  /** Add automatically discarded keepCards to the community board after the regular board. */
  discardedCardsToCommunity?: boolean;
  /** Marks the first N kept hole cards in each hand as counterfeit after dealing. */
  counterfeitHoleCards?: number;
  /** Replaces the last N kept hole cards in each hand with a freshly-minted tarot (random arcana). */
  forceTarotHoleCards?: number;
  /** Deck family to deal from. */
  deck?: DeckKind;
  /** Optional constrained hand construction before the board is dealt. */
  constraint?: DealConstraint;
}

export type BoardSlot = {
  row: number;
  col: number;
  group?: string;
  scoresAs?: "primary" | "mirror" | "decoy";
};

export type BoardLayout =
  | { kind: "linear"; slots: number }
  | { kind: "dual"; primary: number; secondary: number; secondaryRole: "mirror" | "decoy" | "vault" }
  | { kind: "L"; arm: number; stem: number }
  | { kind: "grid"; slots: BoardSlot[] }
  /** Four cardinal positions (N/E/S/W). `slots` defaults to 4 if omitted. */
  | { kind: "compass"; slots?: number }
  /** Circular ring of N community cards. */
  | { kind: "wheel"; slots: number }
  /** N steps where each step is offset diagonally. */
  | { kind: "staircase"; slots: number }
  /** Five cards forming a plus sign (center + 4 arms). */
  | { kind: "plus" };

export type PhaseEffectId =
  | "randomReplaceVisibleCommunity"
  | "reverseCommunity"
  | "mirrorCommunity"
  | "shuffleCommunity"
  | "rotateHoleCardsClockwise"
  | "incrementFirstHolePerHand"
  | "removeFaceCards"
  | "removeSevens"
  | "reassignAllSuits"
  | "invertAllRanks"
  | "removeAdjacentToRiver"
  | "stormSurge"
  | "scrambleCommunitySuits"
  | "swapFirstCardsFirstTwoHands"
  | "removeLastCommunity"
  | "upgradeHighestHole"
  | "faceCardsToAces"
  | "faceCardsToTwos"
  | "removeOneHolePerHand"
  | "removeFirstHolePerHand"
  | "shuffleAllHoleCards"
  | "swapFirstHoleWithFirstCommunity"
  | "incrementFirstCommunityRank"
  | "festivalBoostFirstCommunity"
  | "revertBoardToFlop"
  | "reverseTableAndBoard"
  | "singularityAverageFirstTwoHoles"
  | "firstCommunityAbsorbsSecondSuit"
  | "convergeSevensToAces"
  | "rotateHoleRanksAcrossHands"
  | "removeHighestRankInPlay"
  | "spreadPlagueToFirstCard"
  | "rotateFirstHoleCardsClockwise"
  | "mixHolesWithBurn"
  | "rotateAllCardPositions"
  | "incrementAllRanks"
  | "incrementAllHoleRanks"
  | "cipherRanksWithRiver"
  | "staticFlickerFirstCards"
  | "splitHandsAtReveal"
  | "schismDeckHighOnly"
  | "lockMajorityColor"
  | "zeroHighRanks"
  | "breakBoardPairs"
  | "adoptRedScoring"
  | "adoptBlackScoring"
  | "invertScoringNow"
  | "requirePairToQualify"
  | "armRankInvert"
  | "executeRankInvert"
  | "riverOverwritesSuit"
  | "coinflipScoreRule"
  | "stripBoardSuits"
  | "markOneBoardWild"
  | "shuffleHandAssignment"
  | "crossHandCardSwap"
  | "absorbLastHandToBoard"
  | "hierarchyByMeta"
  | "enforceOneCardPerBoardRow"
  | "bridgeCardChoice"
  | "cyclicHandHierarchy"
  | "adjacentRankBonus"
  | "uniqueHandClassRequired"
  | "matchRankInherit"
  | "pactMergeFirstLast"
  | "colorTeamAssign"
  | "hostageRankBecomesWild"
  | "bestCardClockwise"
  | "forceAdjacentTie"
  | "crowdedRankPenalty"
  | "requireTopHandIsFlush"
  | "requireAllHandsPaired"
  | "requireTopHandNoFaceCards"
  | "requireAllHandsHaveFace"
  | "requireTopHandRainbow"
  | "requireAdjacentTie"
  | "requireTightSpread"
  | "requireWideSpread"
  | "requireRedRiver"
  | "requirePocketSourceTop"
  | "rerollFlopAtTurn"
  | "revertToFlopBriefly"
  | "flopOneAtATime"
  | "duplicateFlopPhase"
  | "rewindToTurnAfterReveal"
  | "lockTopHalfAtFlop"
  | "markFirstBoard"
  | "blessedTierBump"
  | "cursedTierDemote"
  | "tricksterSwapRight"
  | "glitchCopyNeighbor"
  | "tarotRankShift"
  | "counterfeitInversion"
  | "chosenJokerImprint"
  | "markedTwinWild"
  | "excludePairTier"
  | "optedTierPenalty"
  | "draftFromFlop";

export type InfoFeatureId =
  | "anti-memory"
  | "aurora"
  | "avalanche"
  | "black-hole"
  | "blessed-card-absolute"
  | "burn-reveal"
  | "card-cipher"
  | "card-conscience"
  | "card-constellation"
  | "card-convergence"
  | "card-decoy"
  | "card-diaspora"
  | "card-drift"
  | "card-eclipse-total"
  | "card-festival"
  | "card-halo"
  | "card-inheritance"
  | "card-karma"
  | "card-lunar"
  | "card-madness"
  | "card-marriage"
  | "card-memorial"
  | "card-multiverse"
  | "card-pendulum"
  | "card-pinball"
  | "card-plague-spread"
  | "card-rebellion"
  | "card-resurrection"
  | "card-schism"
  | "card-singularity"
  | "card-soup"
  | "card-static"
  | "card-theatre"
  | "card-tide"
  | "card-vortex"
  | "card-whisper"
  | "card-whisper-network"
  | "cell-division"
  | "cold-snap"
  | "communal-glance"
  | "deck-count"
  | "decoy"
  | "doomsday-card"
  | "doppelganger-deck"
  | "drought"
  | "drunken-display"
  | "earthquake"
  | "flood"
  | "fog-bank"
  | "glitch-wars"
  | "gravity-well"
  | "group-mind"
  | "half-lit-holes"
  | "heat-map"
  | "heat-wave"
  | "hex-card"
  | "hint-card"
  | "holographic-card"
  | "hurricane"
  | "ice-age"
  | "identity-crisis"
  | "late-hand-reveal"
  | "lightning"
  | "lying-mirror"
  | "memory-hole"
  | "meteor"
  | "mirror-hand"
  | "mirror-hole"
  | "mirror-universe"
  | "mirror-world"
  | "pandemonium"
  | "past-trace"
  | "periscope"
  | "phantom-card"
  | "photographic-memory"
  | "photographic-negative"
  | "plague"
  | "probability-cloud"
  | "quantum-flop"
  | "quantum-shuffle"
  | "rainstorm"
  | "rank-census"
  | "rank-whisper"
  | "reality-skip"
  | "reality-tear"
  | "recursive-board"
  | "reverse-universe"
  | "sample-draw"
  | "schrodingers-board"
  | "schrodingers-hole"
  | "shapeshifter"
  | "smoke-hole"
  | "solar-flare"
  | "spotlight"
  | "static"
  | "storm-surge"
  | "suit-census"
  | "suit-heat"
  | "suit-whisper"
  | "synesthesia"
  | "tag-team"
  | "telepathic-river"
  | "tell"
  | "time-echo"
  | "tornado"
  | "twin-universes"
  | "volcano"
  | "whisper-chain"
  | "wild-rank-roulette"
  | "wildfire"
  | "wormhole"
  | "audit-trail"
  | "auction-row"
  | "back-room"
  | "bipolar-judge"
  | "black-tide"
  | "book-spread"
  | "bookends"
  | "bridge"
  | "chessboard"
  | "chosen-one"
  | "chromatic"
  | "civil-war"
  | "clergy"
  | "clock"
  | "color-lock"
  | "commit-flop"
  | "compass"
  | "confession"
  | "counter-cuff"
  | "crab-bucket"
  | "crowd-pick"
  | "decoys"
  | "dossier"
  | "double-down"
  | "double-flop"
  | "effigy"
  | "encore"
  | "final-coin"
  | "flop-draft"
  | "flop-loop"
  | "flopless"
  | "gap-club"
  | "hostage"
  | "instant-river"
  | "inversion-tide"
  | "island-chain"
  | "judgment-day"
  | "keystone"
  | "last-rites"
  | "last-word"
  | "late-flop"
  | "low-noon"
  | "match-game"
  | "mirror-match-jr"
  | "mirror-meta"
  | "mission-flush"
  | "mission-loud"
  | "mission-low-spread"
  | "mission-pair"
  | "mission-pocket"
  | "mission-quiet"
  | "mission-rainbow"
  | "mission-red-river"
  | "mission-twins"
  | "mission-wide"
  | "monochrome"
  | "mute-reveal"
  | "neighbor-bonus"
  | "omen"
  | "oracle-peek"
  | "oracle-says"
  | "pact"
  | "pair-summit"
  | "pause-flop"
  | "peasant-deal"
  | "pickpocket"
  | "plus-sign"
  | "prophecy"
  | "prophets"
  | "pulled-rug"
  | "pyramid"
  | "recruit"
  | "red-herring"
  | "red-tide"
  | "relay-baton"
  | "relic"
  | "reverse-stream"
  | "rock-paper"
  | "royal-deal"
  | "rumor-mill"
  | "runners"
  | "sacrifice"
  | "same-rank"
  | "second-place-cup"
  | "secret-trade"
  | "seismograph"
  | "slow-flop"
  | "solo-act"
  | "solomon-cut"
  | "staircase"
  | "straight-only"
  | "sudden-glare"
  | "suit-court"
  | "tarot-tower"
  | "time-loop"
  | "tomorrow"
  | "two-faced"
  | "weather-report"
  | "wheel"
  | "worst-of-all"
  | "meta-legend";

import type { ModeFamily, ModeTier, SubTag } from "./tagVocabulary";

export interface DingGameModeDefinition {
  id: string;
  name: string;
  shortName: string;
  summary: string;
  detail: string;
  /** Primary mechanic group — the most load-bearing "what kind of thing is this". */
  family: ModeFamily;
  tags: readonly SubTag[];
  /** Curation tier shown in the lobby browser. Set explicitly per mode. */
  tier: ModeTier;
  deal: GameModeDealRule;
  phaseEffects?: Partial<Record<Phase, readonly PhaseEffectId[]>>;
  wildCards?: {
    ranks?: readonly Rank[];
    suits?: readonly Suit[];
    metas?: readonly CardMeta[];
  };
  /**
   * Optional per-phase wild-card definitions. The reveal-phase entry is used
   * for showdown scoring; earlier-phase entries describe the rotating wild as
   * the hand progresses, surfaced via info chips.
   */
  wildCardsByPhase?: Partial<Record<Phase, {
    ranks?: readonly Rank[];
    suits?: readonly Suit[];
    metas?: readonly CardMeta[];
  }>>;
  excludedRanks?: readonly Rank[];
  excludedMetas?: readonly CardMeta[];
  forceRankByMeta?: {
    first?: CardMeta;
    last?: CardMeta;
  };
  identityResolution?: "bestPossible";
  infoFeatures?: readonly InfoFeatureId[];
  syntheticPair?: "adjacent" | "spread";
  rankTransform?: "inverted";
  suitTransform?: "color";
  score: ScoreRule;
}

export const standardDeal: GameModeDealRule = {
  holeCards: 2,
  communityCards: 5,
};

export const baseVisibleCommunity: Record<Phase, number> = {
  lobby: 0,
  dealChoice: 0,
  preflop: 0,
  flop: 3,
  turn: 4,
  river: 5,
  reveal: 5,
};

// -------- Base shapes ----------------------------------------------------

/**
 * Cross-cutting state every mode shares. Per-mode state extends this with
 * mode-specific fields (ranking, hands, community cards, etc.).
 */
interface BaseGameState {
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
interface BaseAction {
  type: string;
}

/** Identifies the actor behind an incoming action. */
interface Actor {
  /** Player ID; matches `Player.id`. */
  id: string;
  /** False for bots and offline timer-driven actors. */
  isHuman: boolean;
}

// -------- Validate / Apply ----------------------------------------------

type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Side channel passed to applyAction for mode-specific deltas. */
interface ApplyCtx {
  /** Engine-provided wall clock (ms) — supplied so tests can inject. */
  now: number;
}

/** Outcome of applying an action. */
interface ApplyResult<S> {
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
interface MaskingRule<S extends BaseGameState = BaseGameState> {
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
