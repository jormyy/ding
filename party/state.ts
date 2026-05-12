import type * as Party from "partykit/server";
import type {
  Card,
  ChaosEvent,
  DealChoiceProgress,
  DisplayedCard,
  GameState,
  Hand,
  ModeInfo,
  Phase,
} from "../src/lib/types";
import {
  visibleCommunityCardCount,
  visibleCommunityCardDetail,
  visibleCommunityCardDetails,
  visibleHoleCardCount,
  visibleHoleCardDetail,
  visibleHoleCardIndexes,
  type HoleCardVisibilityDetail,
} from "../src/lib/gameMode";

/**
 * Server-side game state. Extends the client-visible `GameState` with
 * unmasked card data that must never be sent to clients.
 *
 * `allCommunityCards` holds all 5 community cards; `communityCards` on the
 * base type is sliced per-phase for broadcast.
 */
export interface ServerGameState extends GameState {
  /** All 5 community cards (unmasked). Sliced for broadcast via `buildClientState`. */
  allCommunityCards: Card[];
  /** Remaining shuffled deck during deal-choice mutations such as mulligans. */
  dealDeck: Card[];
  /** Burn cards from the initial deal, available to information modes. */
  burnCards: Card[];
  /**
   * Monotonic generation counter — bumped by the action dispatcher whenever
   * an applied action might have changed any client-visible slice. Used by:
   *
   *   - the bot action fingerprint (replaces JSON.stringify), and
   *   - any future mask cache that wants a single int as its invalidation key.
   *
   * Treat this as engine-internal: do not include it in client broadcasts
   * (it lives only on the server-side extension).
   */
  gen: number;
  /** Transient typed chaos-event messages waiting to be broadcast. */
  pendingChaosEvents: ChaosEvent[];
}

/** Create a fresh empty server state for a new room. */
export function createInitialState(): ServerGameState {
  return {
    modeId: "ding",
    phase: "lobby",
    players: [],
    handsPerPlayer: 1,
    gameTimerSeconds: 0,
    roundTimerSeconds: 0,
    phaseStartedAt: null,
    gameStartedAt: null,
    communityCards: [],
    ranking: [],
    hands: [],
    dealChoices: {},
    revealIndex: 0,
    trueRanking: null,
    trueRanks: null,
    score: null,
    rankHistory: {},
    allCommunityCards: [],
    dealDeck: [],
    burnCards: [],
    acquireRequests: [],
    chatMessages: [],
    dingLog: [],
    fuckoffLog: [],
    pendingChaosEvents: [],
    gen: 0,
  };
}

function maskHandsForPlayer(
  hands: Hand[],
  playerId: string,
  phase: Phase,
  modeId: string | undefined
): Hand[] {
  const visiblePublicCount = visibleHoleCardCount(modeId, phase);
  const visibleDetail = visibleHoleCardDetail(modeId, phase);
  const visibleIndexes = visibleHoleCardIndexes(modeId, phase);
  return hands.map((hand) => {
    const cardCount = hand.cardCount ?? hand.cards.length;
    const storedPublicCards = hand.publicCards ?? [];
    const dynamicPublicCards = visibleDetail === "full"
      ? selectVisibleHoleCards(hand.cards, visiblePublicCount, visibleIndexes)
      : [];
    const publicCards = dynamicPublicCards.length > storedPublicCards.length
      ? dynamicPublicCards
      : storedPublicCards;
    const publicCardHints = buildPublicCardHints(hand.cards, visiblePublicCount, visibleDetail, visibleIndexes);
    if (hand.playerId === playerId) return { ...hand, cardCount, publicCards, publicCardHints };
    if (hand.flipped && phase === "reveal") return { ...hand, cardCount, publicCards, publicCardHints };
    return { ...hand, cards: [], cardCount, publicCards, publicCardHints };
  });
}

function buildPublicCardHints(
  cards: Card[],
  count: number,
  detail: HoleCardVisibilityDetail,
  indexes?: readonly number[]
): DisplayedCard[] {
  if (detail === "full" || count <= 0) return [];
  return selectVisibleHoleCards(cards, count, indexes).map((card) => {
    switch (detail) {
      case "suit":
        return { suit: card.suit };
      case "rank":
        return { rank: card.rank };
      case "color":
        return { color: card.suit === "H" || card.suit === "D" ? "red" : "black" };
      default:
        return {};
    }
  });
}

function selectVisibleHoleCards(cards: Card[], count: number, indexes?: readonly number[]): Card[] {
  if (count <= 0) return [];
  if (indexes !== undefined) {
    return indexes.slice(0, count).flatMap((index) => cards[index] === undefined ? [] : [cards[index]]);
  }
  return cards.slice(0, count);
}

function maskDealChoicesForPlayer(
  dealChoices: Record<string, DealChoiceProgress>,
  hands: Hand[],
  playerId: string
): Record<string, DealChoiceProgress> {
  const ownerByHand = new Map(hands.map((hand) => [hand.id, hand.playerId]));
  const masked: Record<string, DealChoiceProgress> = {};
  for (const [handId, choice] of Object.entries(dealChoices)) {
    masked[handId] = ownerByHand.get(handId) === playerId
      ? choice
      : { ...choice, selectedIndexes: null };
  }
  return masked;
}

/**
 * Build a masked client-side view of the game state for a specific player.
 *
 * - Slices community cards to the correct count for the current phase.
 * - Strips opponent hole cards from all `Hand` objects except the viewer's own.
 * - In reveal phase, shows cards for hands that have already been flipped.
 */
export function buildClientState(state: ServerGameState, playerId: string): GameState {
  const count = visibleCommunityCardCount(state.modeId, state.phase);
  const communityCardsToShow = buildVisibleCommunityCards(
    state.allCommunityCards.slice(0, count),
    visibleCommunityCardDetail(state.modeId, state.phase),
    visibleCommunityCardDetails(state.modeId, state.phase)
  );

  return {
    modeId: state.modeId ?? "ding",
    phase: state.phase,
    players: state.players,
    handsPerPlayer: state.handsPerPlayer,
    gameTimerSeconds: state.gameTimerSeconds,
    roundTimerSeconds: state.roundTimerSeconds,
    phaseStartedAt: state.phaseStartedAt,
    gameStartedAt: state.gameStartedAt,
    communityCards: communityCardsToShow,
    modeInfo: buildModeInfo(state),
    ranking: state.ranking,
    hands: maskHandsForPlayer(state.hands, playerId, state.phase, state.modeId),
    dealChoices: maskDealChoicesForPlayer(state.dealChoices ?? {}, state.hands, playerId),
    revealIndex: state.revealIndex,
    trueRanking: state.trueRanking,
    trueRanks: state.trueRanks,
    score: state.score,
    rankHistory: state.rankHistory,
    acquireRequests: state.acquireRequests,
    chatMessages: state.chatMessages,
    dingLog: state.dingLog,
    fuckoffLog: state.fuckoffLog,
  };
}

function buildModeInfo(state: ServerGameState): ModeInfo[] {
  switch (state.modeId) {
    case "card-counters":
      return [{ id: "deck-count", label: "Deck", value: `${state.dealDeck.length} cards remain` }];
    case "suit-census":
      return [{ id: "suit-census", label: "Suits", value: suitCounts(state.dealDeck) }];
    case "rank-census":
      return [{ id: "rank-census", label: "Ranks", value: rankCounts(state.dealDeck) }];
    case "burn-reveal":
      return [{ id: "burn-reveal", label: "Burn", value: cardList(state.burnCards) }];
    case "hint-card":
      return state.phase === "turn"
        ? [{ id: "hint-card", label: "Hint", value: cardList(state.dealDeck.slice(0, 1)) }]
        : [];
    case "decoy":
      return [{ id: "decoy", label: "Decoy", value: "One table card is a decoy and does not score" }];
    case "lying-mirror":
      return state.phase === "flop"
        ? [{ id: "lying-mirror", label: "Mirror", value: `Fake flop: ${cardList(state.dealDeck.slice(0, 3))}` }]
        : [];
    case "whisper-chain":
      return [{ id: "whisper-chain", label: "Whisper", value: "Each player has one neighbor-card hint" }];
    case "periscope":
      return state.phase === "river"
        ? [{ id: "periscope", label: "Periscope", value: "One opponent hole-card hint is available" }]
        : [];
    case "spotlight-rotation":
      return [{ id: "spotlight", label: "Spotlight", value: `Rotating public hand for ${state.phase}` }];
    case "half-lit-holes":
      return [{ id: "half-lit-holes", label: "Half-Lit", value: `Visible slot alternates on ${state.phase}` }];
    case "mirror-hole":
      return [{ id: "mirror-hole", label: "Mirror", value: "Neighbor-hole information is mirrored cooperatively" }];
    case "group-mind":
      return [{ id: "group-mind", label: "Group", value: `Shared hole-card slot for ${state.phase}` }];
    case "tag-team":
      return [{ id: "tag-team", label: "Tag", value: "Neighbor hand knowledge is shared with the table" }];
    case "smoke-hole":
      return [{ id: "smoke-hole", label: "Smoke", value: state.phase === "preflop" || state.phase === "flop" ? "Hole cards show suits only" : "Hole cards are clear" }];
    case "heat-map":
      return [{ id: "heat-map", label: "Heat", value: deckHeat(state.dealDeck) }];
    case "suit-heat":
      return [{ id: "suit-heat", label: "Suit Heat", value: suitHeat(state.dealDeck) }];
    case "sample-draw":
      return state.phase === "river"
        ? [{ id: "sample-draw", label: "Sample", value: cardList(state.dealDeck.slice(0, 3)) }]
        : [];
    case "past-trace":
      return [{ id: "past-trace", label: "Trace", value: "No prior hand trace in this room yet" }];
    case "tell":
      return [{ id: "tell", label: "Tell", value: tellFact(state) }];
    case "communal-glance":
      return [{ id: "communal-glance", label: "Glance", value: "One hole-card slot is shared by the table" }];
    case "suit-whisper":
      return [{ id: "suit-whisper", label: "Suit Whisper", value: missingSuitWhisper(state.hands) }];
    case "rank-whisper":
      return [{ id: "rank-whisper", label: "Rank Whisper", value: missingRankWhisper(state.hands) }];
    case "phantom-card":
      return [{ id: "phantom-card", label: "Phantom", value: state.dealDeck[0] === undefined ? "No phantom rank available" : `${state.dealDeck[0].rank} is not in at least one hand` }];
    case "late-hand-reveal":
      return state.phase === "river"
        ? [{ id: "late-hand-reveal", label: "Reveal", value: "All hole cards are now public" }]
        : [];
    case "earthquake":
      return eventModeInfo("earthquake", "Earthquake", state.phase, "board order rotated at turn");
    case "tornado":
      return eventModeInfo("tornado", "Tornado", state.phase, "hole cards rotate at turn");
    case "lightning":
      return eventModeInfo("lightning", "Lightning", state.phase, "first hole cards upgrade at river");
    case "flood":
      return [{ id: "flood", label: "Flood", value: "Ranks 2-5 are wild at reveal" }];
    case "drought":
      return eventModeInfo("drought", "Drought", state.phase, "face cards vanish at turn");
    case "plague":
      return eventModeInfo("plague", "Plague", state.phase, "sevens vanish at turn");
    case "solar-flare":
      return eventModeInfo("solar-flare", "Flare", state.phase, "suits rotate at turn");
    case "meteor":
      return eventModeInfo("meteor", "Meteor", state.phase, "one visible board card is replaced at turn");
    case "mirror-universe":
      return eventModeInfo("mirror-universe", "Mirror", state.phase, "ranks invert at river");
    case "wildfire":
      return eventModeInfo("wildfire", "Wildfire", state.phase, "river-adjacent ranks burn at river");
    case "avalanche":
      return [{ id: "avalanche", label: "Avalanche", value: "Board reveals 3 / 5 / 7 cards" }];
    case "storm-surge":
      return eventModeInfo("storm-surge", "Surge", state.phase, "oldest board card is swept away each street");
    case "static":
      return eventModeInfo("static", "Static", state.phase, "community suits rotate each street");
    case "wormhole":
      return eventModeInfo("wormhole", "Wormhole", state.phase, "first two hands exchange cards at river");
    case "black-hole":
      return eventModeInfo("black-hole", "Black Hole", state.phase, "last board card vanishes at river");
    case "gravity-well":
      return eventModeInfo("gravity-well", "Gravity", state.phase, "highest hole cards upgrade at river");
    case "heat-wave":
      return eventModeInfo("heat-wave", "Heat Wave", state.phase, "face cards become aces at turn");
    case "cold-snap":
      return eventModeInfo("cold-snap", "Cold Snap", state.phase, "face cards become twos at turn");
    case "fog-bank":
      return [{ id: "fog-bank", label: "Fog", value: "Community cards show only color until reveal" }];
    case "rainstorm":
      return eventModeInfo("rainstorm", "Rain", state.phase, "one community card is replaced each street");
    case "aurora":
      return eventModeInfo("aurora", "Aurora", state.phase, "suits rotate at river");
    case "hurricane":
      return eventModeInfo("hurricane", "Hurricane", state.phase, "each hand loses one hole at river");
    case "ice-age":
      return [{ id: "ice-age", label: "Ice", value: "Even ranks are skipped by scoring" }];
    case "volcano":
      return eventModeInfo("volcano", "Volcano", state.phase, "first hole cards are destroyed at river");
    case "quantum-shuffle":
      return eventModeInfo("quantum-shuffle", "Quantum", state.phase, "all hole cards redistribute at turn");
    case "schrodingers-hole":
      return [{ id: "schrodingers-hole", label: "Schrodinger", value: "Hole cards have unresolved alternate identities" }];
    case "quantum-flop":
      return [{ id: "quantum-flop", label: "Quantum", value: "Three flop realities are in play" }];
    case "probability-cloud":
      return [{ id: "probability-cloud", label: "Cloud", value: "Board cards have possible alternate identities" }];
    case "holographic-card":
      return [{ id: "holographic-card", label: "Holo", value: "A community card may be seen as multiple identities" }];
    case "schrodingers-board":
      return [{ id: "schrodingers-board", label: "Board", value: "The board has unresolved alternate identities" }];
    case "card-multiverse":
      return [{ id: "card-multiverse", label: "Multiverse", value: "Four board outcomes are ranked" }];
    case "reality-tear":
      return [{ id: "reality-tear", label: "Tear", value: "Cards can hold alternate identities" }];
    case "identity-crisis":
      return eventModeInfo("identity-crisis", "Crisis", state.phase, "a hole card and board card swap at turn");
    case "drunken-display":
      return [{ id: "drunken-display", label: "Drunken", value: "Cards wobble through possible identities" }];
    case "photographic-negative":
      return [{ id: "photographic-negative", label: "Negative", value: "Community color display is inverted through river" }];
    case "synesthesia":
      return [{ id: "synesthesia", label: "Synesthesia", value: "Community display filter rotates by phase" }];
    case "shapeshifter":
      return eventModeInfo("shapeshifter", "Shifter", state.phase, "first community card shifts rank each street");
    case "card-rebellion":
      return eventModeInfo("card-rebellion", "Rebellion", state.phase, "hands rotate at turn");
    case "card-theatre":
      return [{ id: "card-theatre", label: "Theatre", value: theatreClue(state) }];
    case "card-whisper-network":
      return [{ id: "card-whisper-network", label: "Network", value: tellFact(state) }];
    case "card-conscience":
      return [{ id: "card-conscience", label: "Conscience", value: conscienceRank(state) }];
    case "card-festival":
      return eventModeInfo("card-festival", "Festival", state.phase, "first community card boosts to ace at river");
    case "card-marriage":
      return [{ id: "card-marriage", label: "Marriage", value: "Cards are bonded in table-order pairs" }];
    case "anti-memory":
      return [{ id: "anti-memory", label: "Anti-Memory", value: "Seen board cards fade by phase" }];
    case "photographic-memory":
      return [{ id: "photographic-memory", label: "Memory", value: "Remember the flop after it disappears" }];
    case "memory-hole":
      return eventModeInfo("memory-hole", "Memory Hole", state.phase, "one community card is replaced and hidden at turn");
    case "time-echo":
      return eventModeInfo("time-echo", "Time Echo", state.phase, "board reverts to flop at river");
    case "reality-skip":
      return [{ id: "reality-skip", label: "Skip", value: `Timeline skips and returns at ${state.phase}` }];
    case "reverse-universe":
      return eventModeInfo("reverse-universe", "Reverse", state.phase, "board and player order reverse at river");
    case "card-singularity":
      return eventModeInfo("card-singularity", "Singularity", state.phase, "first two hole cards merge at turn");
    case "glitch-wars":
      return eventModeInfo("glitch-wars", "Glitch Wars", state.phase, "first board card absorbs second board suit at turn");
    case "card-convergence":
      return eventModeInfo("card-convergence", "Converge", state.phase, "sevens converge into aces at river");
    case "card-halo":
      return [{ id: "card-halo", label: "Halo", value: "Adjacent ranks create a synthetic pair aura" }];
    case "card-vortex":
      return eventModeInfo("card-vortex", "Vortex", state.phase, "hole-card ranks rotate at turn");
    case "card-eclipse-total":
      return eventModeInfo("card-eclipse-total", "Eclipse", state.phase, "highest rank in play vanishes at river");
    case "card-plague-spread":
      return eventModeInfo("card-plague-spread", "Spread", state.phase, "one more card converts to seven each street");
    case "card-diaspora":
      return eventModeInfo("card-diaspora", "Diaspora", state.phase, "first hole cards rotate at turn");
    case "card-soup":
      return eventModeInfo("card-soup", "Soup", state.phase, "holes mix with burn cards at turn");
    case "card-madness":
      return eventModeInfo("card-madness", "Madness", state.phase, "all holes and board cards rotate at turn");
    case "card-tide":
      return eventModeInfo("card-tide", "Tide", state.phase, "all ranks shift upward each street");
    case "card-drift":
      return eventModeInfo("card-drift", "Drift", state.phase, "hole-card ranks shift upward each street");
    case "recursive-board":
      return eventModeInfo("recursive-board", "Recursive", state.phase, "board duplicates at turn");
    case "mirror-hand":
      return [{ id: "mirror-hand", label: "Mirror Hand", value: "Hands carry mirrored possible identities" }];
    case "twin-universes":
      return [{ id: "twin-universes", label: "Twin", value: "Two board universes are scored" }];
    case "mirror-world":
      return [{ id: "mirror-world", label: "Mirror World", value: "Two realities are visible" }];
    case "card-constellation":
      return [{ id: "card-constellation", label: "Constellation", value: "Sevens form a wild constellation" }];
    case "card-karma":
      return [{ id: "card-karma", label: "Karma", value: "No prior round karma card in this room yet" }];
    case "card-resurrection":
      return [{ id: "card-resurrection", label: "Resurrection", value: "Discarded cards return to the community" }];
    case "card-memorial":
      return [{ id: "card-memorial", label: "Memorial", value: "A sixth memorial card opens at reveal" }];
    case "hex-card":
      return [{ id: "hex-card", label: "Hex", value: "Hex holder is forced to the bottom rank" }];
    case "blessed-card-absolute":
      return [{ id: "blessed-card-absolute", label: "Bless", value: "Blessed holder is forced to the top rank" }];
    case "doomsday-card":
      return eventModeInfo("doomsday-card", "Doomsday", state.phase, "all ranks invert at river");
    case "card-cipher":
      return eventModeInfo("card-cipher", "Cipher", state.phase, "ranks are encoded by the river card at river");
    case "card-decoy":
      return [{ id: "card-decoy", label: "Decoy", value: "One visible community card does not score" }];
    case "card-static":
      return eventModeInfo("card-static", "Static", state.phase, "first hole and board cards flicker each street");
    case "cell-division":
      return eventModeInfo("cell-division", "Division", state.phase, "hands split into two at reveal");
    case "card-schism":
      return eventModeInfo("card-schism", "Schism", state.phase, "remaining deck splits to high half at turn");
    case "card-pendulum":
      return [{ id: "card-pendulum", label: "Pendulum", value: "Sevens are the swinging wild rank" }];
    case "card-pinball":
      return eventModeInfo("card-pinball", "Pinball", state.phase, "first board card bounces into a hole slot each street");
    case "card-inheritance":
      return [{ id: "card-inheritance", label: "Inheritance", value: "Discarded cards inherit from the board before disappearing" }];
    case "doppelganger-deck":
      return [{ id: "doppelganger-deck", label: "Doppel", value: "Duplicate card identities are in the deck" }];
    case "telepathic-river":
      return state.phase === "river"
        ? [{ id: "telepathic-river", label: "Telepathy", value: "A neighbor's hole card feels high or low" }]
        : [];
    case "card-whisper":
      return state.phase === "river"
        ? [{ id: "card-whisper", label: "Whisper", value: tellFact(state) }]
        : [];
    case "card-lunar":
      return [{ id: "card-lunar", label: "Lunar", value: "Hearts are waxing as wild cards" }];
    case "pandemonium":
      return eventModeInfo("pandemonium", "Pandemonium", state.phase, "capstone chaos changes every street");
    default:
      return [];
  }
}

function eventModeInfo(id: string, label: string, phase: Phase, detail: string): ModeInfo[] {
  return [{ id, label, value: `${detail}; current phase ${phase}` }];
}

function deckHeat(cards: readonly Card[]): string {
  let high = 0;
  let low = 0;
  for (const card of cards) {
    if (rankValue(card.rank) >= 8) high++;
    else low++;
  }
  if (high === low) return `balanced (${high} high / ${low} low)`;
  return high > low ? `high-skewed (${high} high / ${low} low)` : `low-skewed (${high} high / ${low} low)`;
}

function suitHeat(cards: readonly Card[]): string {
  const counts = { H: 0, D: 0, C: 0, S: 0 };
  for (const card of cards) counts[card.suit]++;
  const [suit, count] = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return `${suit} leads with ${count}`;
}

function tellFact(state: ServerGameState): string {
  if (state.allCommunityCards.length > 0) return `Board card 1 is ${state.allCommunityCards[0].rank}${state.allCommunityCards[0].suit}`;
  return `${state.dealDeck.length} deck cards remain`;
}

function theatreClue(state: ServerGameState): string {
  const hand = state.hands[0];
  if (!hand) return "No hand is on stage yet";
  return `${hand.id} has ${hand.cards.length} card${hand.cards.length === 1 ? "" : "s"} on stage`;
}

function conscienceRank(state: ServerGameState): string {
  const used = new Set<string>();
  for (const card of state.allCommunityCards) used.add(card.rank);
  for (const hand of state.hands) {
    for (const card of hand.cards) used.add(card.rank);
  }
  const ranks: Card["rank"][] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const missing = ranks.find((rank) => !used.has(rank));
  return missing === undefined ? "Every rank is in use" : `${missing} is unused`;
}

function missingSuitWhisper(hands: readonly Hand[]): string {
  const suits: Card["suit"][] = ["H", "D", "C", "S"];
  for (const hand of hands) {
    const present = new Set(hand.cards.map((card) => card.suit));
    const missing = suits.find((suit) => !present.has(suit));
    if (missing !== undefined) return `${hand.id} does not hold ${missing}`;
  }
  return "Every sampled hand covers all suits";
}

function missingRankWhisper(hands: readonly Hand[]): string {
  const ranks: Card["rank"][] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  for (const hand of hands) {
    const present = new Set(hand.cards.map((card) => card.rank));
    const missing = ranks.find((rank) => !present.has(rank));
    if (missing !== undefined) return `${hand.id} does not hold ${missing}`;
  }
  return "No missing rank hint available";
}

function rankValue(rank: Card["rank"]): number {
  const values: Record<Card["rank"], number> = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    T: 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  };
  return values[rank];
}

function suitCounts(cards: readonly Card[]): string {
  const counts = { H: 0, D: 0, C: 0, S: 0 };
  for (const card of cards) counts[card.suit]++;
  return `H${counts.H} D${counts.D} C${counts.C} S${counts.S}`;
}

function rankCounts(cards: readonly Card[]): string {
  const counts = new Map<string, number>();
  for (const card of cards) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  return Array.from(counts.entries()).map(([rank, count]) => `${rank}${count}`).join(" ");
}

function cardList(cards: readonly Card[]): string {
  return cards.length === 0 ? "none" : cards.map((card) => `${card.rank}${card.suit}`).join(" ");
}

function buildVisibleCommunityCards(
  cards: Card[],
  detail: HoleCardVisibilityDetail,
  detailsByIndex: Record<number, HoleCardVisibilityDetail>
): Card[] {
  if (detail === "full" && Object.keys(detailsByIndex).length === 0) return cards;
  return cards.map((card, index) => {
    switch (detailsByIndex[index] ?? detail) {
      case "suit":
        return { suit: card.suit } as Card;
      case "rank":
        return { rank: card.rank } as Card;
      case "color":
        return { color: card.suit === "H" || card.suit === "D" ? "red" : "black" } as unknown as Card;
      case "hidden":
        return {} as Card;
      default:
        return card;
    }
  });
}

/**
 * Per-player mask cache. Skipping `conn.send` when the masked output is
 * byte-identical to the previous broadcast removes the dominant cost in
 * chatty rooms (every action triggers a broadcast, but most actions don't
 * change every player's view).
 */
export class MaskBroadcaster {
  private lastJsonByPlayer: Map<string, string> = new Map();

  /** Drop a player's cache entry on disconnect to keep the map bounded. */
  forget(playerId: string): void {
    this.lastJsonByPlayer.delete(playerId);
  }

  /** Reset the entire cache (e.g., after `playAgain` rebuilds state). */
  reset(): void {
    this.lastJsonByPlayer.clear();
  }

  broadcast(
    state: ServerGameState,
    connections: Map<string, Party.Connection>
  ): void {
    // Build connId → playerId once instead of state.players.find per connection.
    const playerByConn = new Map<string, string>();
    for (const p of state.players) playerByConn.set(p.connId, p.id);

    for (const [connId, conn] of connections) {
      const playerId = playerByConn.get(connId) ?? "";
      const clientState = buildClientState(state, playerId);
      const payload = JSON.stringify({ type: "state", state: clientState });
      const previous = this.lastJsonByPlayer.get(playerId);
      if (previous === payload) continue;
      this.lastJsonByPlayer.set(playerId, payload);
      conn.send(payload);
    }
  }
}

const defaultBroadcaster = new MaskBroadcaster();

/**
 * Broadcast the masked game state to every connected client through the
 * default `MaskBroadcaster` so byte-identical re-broadcasts are skipped.
 */
export function broadcastStateTo(
  _room: Party.Room,
  state: ServerGameState,
  connections: Map<string, Party.Connection>
) {
  defaultBroadcaster.broadcast(state, connections);
}

/** Drop a single player's cache entry from the default broadcaster. */
export function forgetPlayerInBroadcaster(playerId: string): void {
  defaultBroadcaster.forget(playerId);
}
