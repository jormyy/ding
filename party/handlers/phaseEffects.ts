import {
  getGameModeDefinition,
  type HierarchyId,
  type PhaseEffectId,
  type QualifierId,
  type ScoreRule,
} from "../../src/lib/gameMode";
import type { Card, ChaosEvent, Phase, Rank, Suit } from "../../src/lib/types";
import type { ServerGameState } from "../state";

const RANKS: readonly Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const SUITS: readonly Suit[] = ["H", "D", "C", "S"];
const INVERTED_RANK: Record<Rank, Rank> = {
  A: "2",
  K: "3",
  Q: "4",
  J: "5",
  T: "6",
  "9": "7",
  "8": "8",
  "7": "9",
  "6": "T",
  "5": "J",
  "4": "Q",
  "3": "K",
  "2": "A",
};

/** IDs that simply arm a qualifier on state for evaluation at showdown. */
const QUALIFIER_EFFECTS: readonly QualifierId[] = [
  "requireTopHandIsFlush",
  "requireAllHandsPaired",
  "requireTopHandNoFaceCards",
  "requireAllHandsHaveFace",
  "requireTopHandRainbow",
  "requireAdjacentTie",
  "requireTightSpread",
  "requireWideSpread",
  "requireRedRiver",
  "requirePocketSourceTop",
  "requirePairToQualify",
  "excludePairTier",
];

/** IDs that install a hierarchy reorderer for showdown. */
const HIERARCHY_EFFECTS: readonly HierarchyId[] = [
  "hierarchyByMeta",
  "cyclicHandHierarchy",
  "pactMergeFirstLast",
  "colorTeamAssign",
  "adjacentRankBonus",
  "matchRankInherit",
  "forceAdjacentTie",
  "crowdedRankPenalty",
  "enforceOneCardPerBoardRow",
  "bridgeCardChoice",
  "uniqueHandClassRequired",
];

function isQualifierEffect(effect: PhaseEffectId): effect is QualifierId {
  return (QUALIFIER_EFFECTS as readonly string[]).includes(effect);
}

function isHierarchyEffect(effect: PhaseEffectId): effect is HierarchyId {
  return (HIERARCHY_EFFECTS as readonly string[]).includes(effect);
}

export function applyModePhaseEffects(state: ServerGameState, phase: Phase): ChaosEvent[] {
  const mode = getGameModeDefinition(state.modeId);
  const effects = mode.phaseEffects?.[phase] ?? [];
  const events: ChaosEvent[] = [];
  for (const effect of effects) {
    // Generic dispatch for qualifier / hierarchy effects: install on state and
    // let the showdown registry evaluate them. We do this before the switch so
    // each effect doesn't need its own boilerplate case.
    if (isQualifierEffect(effect)) {
      state.pendingQualifier = effect;
      // mutationVersion bump so non-owner masked broadcasts pick up the chip.
      state.mutationVersion++;
      events.push(buildChaosEvent(effect, state, phase, mode.id));
      continue;
    }
    if (isHierarchyEffect(effect)) {
      state.handHierarchyId = effect;
      state.mutationVersion++;
      events.push(buildChaosEvent(effect, state, phase, mode.id));
      continue;
    }

    switch (effect) {
      case "randomReplaceVisibleCommunity":
        replaceVisibleCommunityCard(state);
        break;
      case "reverseCommunity":
        state.allCommunityCards.reverse();
        break;
      case "mirrorCommunity":
        mirrorCommunity(state);
        break;
      case "shuffleCommunity":
        state.allCommunityCards = rotateCards(state.allCommunityCards, 1);
        break;
      case "rotateHoleCardsClockwise":
        rotateHoleCardsClockwise(state);
        break;
      case "incrementFirstHolePerHand":
        mutateHoleCardAt(state, 0, incrementCardRank);
        break;
      case "removeFaceCards":
        removeAndRefillBoard(state, (card) => card.rank === "J" || card.rank === "Q" || card.rank === "K");
        break;
      case "removeSevens":
        removeAndRefillBoard(state, (card) => card.rank === "7");
        break;
      case "reassignAllSuits":
        mapAllCards(state, rotateCardSuit);
        break;
      case "invertAllRanks":
        mapAllCards(state, (card) => ({ ...card, rank: INVERTED_RANK[card.rank] }));
        break;
      case "removeAdjacentToRiver":
        removeAdjacentToRiver(state);
        break;
      case "stormSurge":
        state.allCommunityCards.shift();
        break;
      case "scrambleCommunitySuits":
        state.allCommunityCards = state.allCommunityCards.map(rotateCardSuit);
        break;
      case "swapFirstCardsFirstTwoHands":
        swapFirstCardsFirstTwoHands(state);
        break;
      case "removeLastCommunity":
        state.allCommunityCards.pop();
        break;
      case "upgradeHighestHole":
        upgradeHighestHole(state);
        break;
      case "faceCardsToAces":
        mapAllCards(state, (card) => isFace(card.rank) ? { ...card, rank: "A" } : card);
        break;
      case "faceCardsToTwos":
        mapAllCards(state, (card) => isFace(card.rank) ? { ...card, rank: "2" } : card);
        break;
      case "removeOneHolePerHand":
        for (const hand of state.hands) hand.cards.pop();
        break;
      case "removeFirstHolePerHand":
        for (const hand of state.hands) hand.cards.shift();
        break;
      case "shuffleAllHoleCards":
        shuffleAllHoleCards(state);
        break;
      case "swapFirstHoleWithFirstCommunity":
        swapFirstHoleWithFirstCommunity(state);
        break;
      case "incrementFirstCommunityRank":
        if (state.allCommunityCards[0]) state.allCommunityCards[0] = incrementCardRank(state.allCommunityCards[0]);
        break;
      case "festivalBoostFirstCommunity":
        if (state.allCommunityCards[0]) state.allCommunityCards[0] = { ...state.allCommunityCards[0], rank: "A" };
        break;
      case "revertBoardToFlop":
        state.allCommunityCards = state.allCommunityCards.slice(0, 3);
        break;
      case "reverseTableAndBoard":
        state.allCommunityCards.reverse();
        state.players.reverse();
        break;
      case "singularityAverageFirstTwoHoles":
        singularityAverageFirstTwoHoles(state);
        break;
      case "firstCommunityAbsorbsSecondSuit":
        if (state.allCommunityCards[0] && state.allCommunityCards[1]) {
          state.allCommunityCards[0] = { ...state.allCommunityCards[0], suit: state.allCommunityCards[1].suit };
        }
        break;
      case "convergeSevensToAces":
        mapAllCards(state, (card) => card.rank === "7" ? { ...card, rank: "A" } : card);
        break;
      case "rotateHoleRanksAcrossHands":
        rotateHoleRanksAcrossHands(state);
        break;
      case "removeHighestRankInPlay":
        removeHighestRankInPlay(state);
        break;
      case "spreadPlagueToFirstCard":
        spreadPlagueToFirstCard(state);
        break;
      case "rotateFirstHoleCardsClockwise":
        rotateFirstHoleCardsClockwise(state);
        break;
      case "mixHolesWithBurn":
        mixHolesWithBurn(state);
        break;
      case "rotateAllCardPositions":
        rotateAllCardPositions(state);
        break;
      case "incrementAllRanks":
        mapAllCards(state, incrementCardRank);
        break;
      case "incrementAllHoleRanks":
        for (const hand of state.hands) hand.cards = hand.cards.map(incrementCardRank);
        break;
      case "cipherRanksWithRiver":
        cipherRanksWithRiver(state);
        break;
      case "staticFlickerFirstCards":
        mutateHoleCardAt(state, 0, incrementCardRank);
        if (state.allCommunityCards[0]) state.allCommunityCards[0] = incrementCardRank(state.allCommunityCards[0]);
        break;
      case "splitHandsAtReveal":
        splitHandsAtReveal(state);
        break;
      case "schismDeckHighOnly":
        state.dealDeck = state.dealDeck.filter((card) => RANKS.indexOf(card.rank) >= RANKS.indexOf("8"));
        break;
      case "lockMajorityColor":
        lockMajorityColor(state);
        break;
      case "zeroHighRanks":
        removeCardsWhere(state, (card) => RANKS.indexOf(card.rank) >= RANKS.indexOf("6"));
        break;
      case "breakBoardPairs":
        breakBoardPairs(state);
        break;
      case "adoptRedScoring":
        state.scoreRuleOverride = "red";
        break;
      case "adoptBlackScoring":
        state.scoreRuleOverride = "black";
        break;
      case "invertScoringNow":
        mapAllCards(state, (card) => ({ ...card, rank: INVERTED_RANK[card.rank] }));
        break;
      case "armRankInvert":
        // Arms inverted-high scoring for reveal — the actual rank flip happens
        // in showdown via rankTransform when state.scoreRuleOverride === "invertedHigh".
        state.scoreRuleOverride = "invertedHigh";
        break;
      case "executeRankInvert":
        mapAllCards(state, (card) => ({ ...card, rank: INVERTED_RANK[card.rank] }));
        break;
      case "riverOverwritesSuit":
        riverOverwritesSuit(state);
        break;
      case "coinflipScoreRule": {
        const choice: ScoreRule = Math.random() < 0.5 ? "red" : "black";
        state.scoreRuleOverride = choice;
        break;
      }
      case "stripBoardSuits":
        state.suitsStripped = true;
        break;
      case "markOneBoardWild":
        markOneBoardWild(state);
        break;
      case "shuffleHandAssignment":
        shuffleHandAssignment(state);
        break;
      case "crossHandCardSwap":
        crossHandCardSwap(state);
        break;
      case "absorbLastHandToBoard":
        absorbLastHandToBoard(state);
        break;
      case "hostageRankBecomesWild":
        hostageRankBecomesWild(state);
        break;
      case "bestCardClockwise":
        bestCardClockwise(state);
        break;
      case "rerollFlopAtTurn":
        rerollFlopAtTurn(state);
        break;
      case "revertToFlopBriefly":
        state.phaseSubstep = "flopRevert";
        break;
      case "flopOneAtATime":
        // Sub-phase machinery: tick the substep label so visibility can slice
        // 1, 2, then 3 cards across consecutive flop arrivals. The visibility
        // module reads state.phaseSubstep when computing visibleCommunityCardCount.
        state.phaseSubstep = state.phaseSubstep === "flop1"
          ? "flop2"
          : state.phaseSubstep === "flop2"
            ? "flop3"
            : "flop1";
        break;
      case "duplicateFlopPhase":
        state.phaseSubstep = "flopDuplicate";
        duplicateFlopPhase(state);
        break;
      case "rewindToTurnAfterReveal":
        state.phaseSubstep = "rewindToTurn";
        break;
      case "lockTopHalfAtFlop":
        lockTopHalfAtFlop(state);
        break;
      case "markFirstBoard":
        markFirstBoard(state);
        break;
      case "tricksterSwapRight":
        tricksterSwapRight(state);
        break;
      case "glitchCopyNeighbor":
        glitchCopyNeighbor(state);
        break;
      case "tarotRankShift":
        mapAllCards(state, incrementCardRank);
        break;
      case "counterfeitInversion":
        mapAllCards(state, (card) => card.meta === "counterfeit" ? { ...card, rank: INVERTED_RANK[card.rank] } : card);
        break;
      case "blessedTierBump":
      case "cursedTierDemote":
      case "chosenJokerImprint":
      case "markedTwinWild":
        // Deleted: these reinforce forceRankByMeta which already runs at
        // showdown via applyMetaRankForces. Keeping them would re-apply the
        // same ordering twice. The cases survive as no-ops only to keep older
        // catalog.generated.ts entries from throwing during the rollout.
        break;
      case "optedTierPenalty":
        // The bump is applied post-showdown in lifecycle.ts (we need the
        // ranking to exist before we can reorder it). Tag state here so the
        // post-showdown step knows the penalty was armed; the chaos event
        // surfaces via the generic dispatcher tail.
        state.pendingOptedTierPenalty = true;
        break;
      case "draftFromFlop":
        // The actual draft pool is opened in lifecycle.ts when the flop phase
        // begins (it needs to deal 6 cards before phase effects run). This
        // case tags the substep so we record the chaos event and so any
        // future read of state.phaseSubstep here is meaningful.
        if (state.phaseSubstep !== "flopDraftPending") {
          state.phaseSubstep = "flopDraftPending";
        }
        break;
      // Qualifier and hierarchy effects (requireTopHandIsFlush,
      // hierarchyByMeta, etc.) are dispatched generically above the switch
      // and narrowed out of the union before reaching this point.
    }
    state.mutationVersion++;
    events.push(buildChaosEvent(effect, state, phase, mode.id));
  }
  return events;
}

function buildChaosEvent(
  effect: PhaseEffectId,
  state: ServerGameState,
  phase: Phase,
  modeId: string,
): ChaosEvent {
  return {
    event: effect,
    affected: affectedForEffect(effect, state),
    phase,
    modeId,
  };
}

function affectedForEffect(effect: PhaseEffectId, state: ServerGameState): string[] {
  switch (effect) {
    case "randomReplaceVisibleCommunity":
    case "reverseCommunity":
    case "mirrorCommunity":
    case "shuffleCommunity":
    case "removeAdjacentToRiver":
    case "stormSurge":
    case "scrambleCommunitySuits":
    case "removeLastCommunity":
    case "festivalBoostFirstCommunity":
    case "revertBoardToFlop":
    case "firstCommunityAbsorbsSecondSuit":
    case "removeHighestRankInPlay":
    case "cipherRanksWithRiver":
      return ["community"];
    case "schismDeckHighOnly":
      return ["deck"];
    case "splitHandsAtReveal":
      return state.hands.map((hand) => hand.id);
    default:
      return ["community", ...state.hands.map((hand) => hand.id)];
  }
}

function replaceVisibleCommunityCard(state: ServerGameState): void {
  const replacement = state.dealDeck.shift();
  if (!replacement || state.allCommunityCards.length === 0) return;
  const visibleCount = Math.min(4, state.allCommunityCards.length);
  const index = Math.floor(Math.random() * visibleCount);
  state.allCommunityCards[index] = replacement;
}

function mirrorCommunity(state: ServerGameState): void {
  const base = state.allCommunityCards.slice(0, 5);
  if (base.length < 5) return;
  state.allCommunityCards = base.concat(base.map(copyCard));
}

function copyCard(card: Card): Card {
  return { ...card };
}

function rotateCards<T>(items: readonly T[], offset: number): T[] {
  if (items.length === 0) return [];
  const normalized = offset % items.length;
  return items.slice(normalized).concat(items.slice(0, normalized));
}

function rotateHoleCardsClockwise(state: ServerGameState): void {
  const snapshots = state.hands.map((hand) => hand.cards.map(copyCard));
  if (snapshots.length <= 1) return;
  state.hands.forEach((hand, index) => {
    const fromIndex = (index - 1 + snapshots.length) % snapshots.length;
    hand.cards = snapshots[fromIndex];
  });
}

function mutateHoleCardAt(state: ServerGameState, index: number, mapper: (card: Card) => Card): void {
  for (const hand of state.hands) {
    const card = hand.cards[index];
    if (card !== undefined) hand.cards[index] = mapper(card);
  }
}

function incrementCardRank(card: Card): Card {
  const index = RANKS.indexOf(card.rank);
  return { ...card, rank: RANKS[Math.min(RANKS.length - 1, index + 1)] };
}

function rotateCardSuit(card: Card): Card {
  const index = SUITS.indexOf(card.suit);
  return { ...card, suit: SUITS[(index + 1) % SUITS.length] };
}

function mapAllCards(state: ServerGameState, mapper: (card: Card) => Card): void {
  state.allCommunityCards = state.allCommunityCards.map(mapper);
  state.dealDeck = state.dealDeck.map(mapper);
  state.burnCards = state.burnCards.map(mapper);
  for (const hand of state.hands) {
    hand.cards = hand.cards.map(mapper);
    hand.publicCards = hand.publicCards?.map(mapper);
  }
}

function removeCardsWhere(state: ServerGameState, predicate: (card: Card) => boolean): void {
  state.allCommunityCards = state.allCommunityCards.filter((card) => !predicate(card));
  for (const hand of state.hands) {
    hand.cards = hand.cards.filter((card) => !predicate(card));
    hand.publicCards = hand.publicCards?.filter((card) => !predicate(card));
    hand.cardCount = hand.cards.length;
  }
}

/** Remove board cards matching `predicate` and refill from the deal deck so
 *  the community board keeps its original card count (subject to deck supply).
 *  Used by drought / plague which catalog-promise "replaced by fresh draws". */
function removeAndRefillBoard(state: ServerGameState, predicate: (card: Card) => boolean): void {
  const target = state.allCommunityCards.length;
  state.allCommunityCards = state.allCommunityCards.filter((card) => !predicate(card));
  for (const hand of state.hands) {
    hand.cards = hand.cards.filter((card) => !predicate(card));
    hand.publicCards = hand.publicCards?.filter((card) => !predicate(card));
    hand.cardCount = hand.cards.length;
  }
  // Refill board from the head of dealDeck, skipping further matches so we
  // don't immediately re-trigger.
  while (state.allCommunityCards.length < target && state.dealDeck.length > 0) {
    const next = state.dealDeck.shift();
    if (!next) break;
    if (predicate(next)) continue;
    state.allCommunityCards.push(next);
  }
}

function removeAdjacentToRiver(state: ServerGameState): void {
  const river = state.allCommunityCards[4] ?? state.allCommunityCards[state.allCommunityCards.length - 1];
  if (!river) return;
  const riverIndex = RANKS.indexOf(river.rank);
  const adjacent = new Set<Rank>();
  const lower = RANKS[riverIndex - 1];
  const upper = RANKS[riverIndex + 1];
  if (lower) adjacent.add(lower);
  if (upper) adjacent.add(upper);
  removeCardsWhere(state, (card) => adjacent.has(card.rank));
}

function swapFirstCardsFirstTwoHands(state: ServerGameState): void {
  const left = state.hands[0];
  const right = state.hands[1];
  if (!left || !right || !left.cards[0] || !right.cards[0]) return;
  const temp = left.cards[0];
  left.cards[0] = right.cards[0];
  right.cards[0] = temp;
}

function upgradeHighestHole(state: ServerGameState): void {
  for (const hand of state.hands) {
    if (hand.cards.length === 0) continue;
    let highestIndex = 0;
    for (let index = 1; index < hand.cards.length; index++) {
      if (RANKS.indexOf(hand.cards[index].rank) > RANKS.indexOf(hand.cards[highestIndex].rank)) highestIndex = index;
    }
    hand.cards[highestIndex] = incrementCardRank(hand.cards[highestIndex]);
  }
}

function shuffleAllHoleCards(state: ServerGameState): void {
  const cards = state.hands.flatMap((hand) => hand.cards.map(copyCard));
  const rotated = rotateCards(cards, 1);
  let cursor = 0;
  for (const hand of state.hands) {
    const count = hand.cards.length;
    hand.cards = rotated.slice(cursor, cursor + count);
    cursor += count;
  }
}

function swapFirstHoleWithFirstCommunity(state: ServerGameState): void {
  const hand = state.hands[0];
  const community = state.allCommunityCards[0];
  if (!hand || !hand.cards[0] || !community) return;
  const temp = hand.cards[0];
  hand.cards[0] = community;
  state.allCommunityCards[0] = temp;
}

function singularityAverageFirstTwoHoles(state: ServerGameState): void {
  for (const hand of state.hands) {
    if (hand.cards.length < 2) continue;
    const [left, right] = hand.cards;
    const averageIndex = Math.floor((RANKS.indexOf(left.rank) + RANKS.indexOf(right.rank)) / 2);
    hand.cards = [{ ...left, rank: RANKS[averageIndex] }].concat(hand.cards.slice(2));
    hand.cardCount = hand.cards.length;
  }
}

function rotateHoleRanksAcrossHands(state: ServerGameState): void {
  const cards = state.hands.flatMap((hand) => hand.cards);
  const ranks = rotateCards(cards.map((card) => card.rank), 1);
  let cursor = 0;
  for (const hand of state.hands) {
    hand.cards = hand.cards.map((card) => ({ ...card, rank: ranks[cursor++] ?? card.rank }));
  }
}

function removeHighestRankInPlay(state: ServerGameState): void {
  const cards = state.hands.flatMap((hand) => hand.cards).concat(state.allCommunityCards);
  const highest = cards.reduce<Rank | null>((best, card) => {
    if (best === null) return card.rank;
    return RANKS.indexOf(card.rank) > RANKS.indexOf(best) ? card.rank : best;
  }, null);
  if (highest === null) return;
  removeCardsWhere(state, (card) => card.rank === highest);
}

function spreadPlagueToFirstCard(state: ServerGameState): void {
  for (const hand of state.hands) {
    const index = hand.cards.findIndex((card) => card.rank !== "7");
    if (index !== -1) {
      hand.cards[index] = { ...hand.cards[index], rank: "7" };
      return;
    }
  }
  const boardIndex = state.allCommunityCards.findIndex((card) => card.rank !== "7");
  if (boardIndex !== -1) state.allCommunityCards[boardIndex] = { ...state.allCommunityCards[boardIndex], rank: "7" };
}

function rotateFirstHoleCardsClockwise(state: ServerGameState): void {
  const firstCards = state.hands.map((hand) => hand.cards[0]).filter((card): card is Card => card !== undefined);
  if (firstCards.length <= 1) return;
  const rotated = rotateCards(firstCards.map(copyCard), firstCards.length - 1);
  let cursor = 0;
  for (const hand of state.hands) {
    if (hand.cards[0]) hand.cards[0] = rotated[cursor++];
  }
}

function mixHolesWithBurn(state: ServerGameState): void {
  const holeCounts = state.hands.map((hand) => hand.cards.length);
  const mixed = rotateCards(state.hands.flatMap((hand) => hand.cards.map(copyCard)).concat(state.burnCards.map(copyCard)), 1);
  let cursor = 0;
  for (let handIndex = 0; handIndex < state.hands.length; handIndex++) {
    const count = holeCounts[handIndex];
    state.hands[handIndex].cards = mixed.slice(cursor, cursor + count);
    cursor += count;
  }
}

function rotateAllCardPositions(state: ServerGameState): void {
  const handCounts = state.hands.map((hand) => hand.cards.length);
  const boardCount = state.allCommunityCards.length;
  const stream = rotateCards(
    state.hands.flatMap((hand) => hand.cards.map(copyCard)).concat(state.allCommunityCards.map(copyCard)),
    1
  );
  let cursor = 0;
  for (let index = 0; index < state.hands.length; index++) {
    const count = handCounts[index];
    state.hands[index].cards = stream.slice(cursor, cursor + count);
    cursor += count;
  }
  state.allCommunityCards = stream.slice(cursor, cursor + boardCount);
}

function cipherRanksWithRiver(state: ServerGameState): void {
  const river = state.allCommunityCards[4] ?? state.allCommunityCards[state.allCommunityCards.length - 1];
  if (!river) return;
  const shift = RANKS.indexOf(river.rank);
  const cipher = (card: Card): Card => ({
    ...card,
    rank: RANKS[(RANKS.indexOf(card.rank) + shift) % RANKS.length],
  });
  mapAllCards(state, cipher);
}

function splitHandsAtReveal(state: ServerGameState): void {
  const originals = state.hands.slice();
  const splitByOriginal = new Map<string, string>();
  const nextHands = originals.flatMap((hand) => {
    if (hand.cards.length < 2) return [hand];
    const splitId = `${hand.id}-split`;
    splitByOriginal.set(hand.id, splitId);
    const [first, second, ...rest] = hand.cards;
    return [
      { ...hand, cards: [first, ...rest], cardCount: 1 + rest.length, publicCards: [], flipped: false },
      { ...hand, id: splitId, cards: [second], cardCount: 1, publicCards: [], flipped: false },
    ];
  });
  state.hands = nextHands;
  const baseRanking = state.ranking.length > 0
    ? state.ranking.filter((id): id is string => id !== null)
    : originals.map((hand) => hand.id);
  state.ranking = baseRanking.flatMap((id) => {
    const splitId = splitByOriginal.get(id);
    return splitId ? [id, splitId] : [id];
  });
}

function isFace(rank: Rank): boolean {
  return rank === "J" || rank === "Q" || rank === "K";
}

function isRed(suit: Suit): boolean {
  return suit === "H" || suit === "D";
}

function lockMajorityColor(state: ServerGameState): void {
  let red = 0;
  let black = 0;
  for (const card of state.allCommunityCards) {
    if (isRed(card.suit)) red++;
    else black++;
  }
  if (red === 0 && black === 0) return;
  const keepRed = red >= black;
  removeCardsWhere(state, (card) => isRed(card.suit) !== keepRed);
}

function breakBoardPairs(state: ServerGameState): void {
  const counts = new Map<Rank, number>();
  for (const card of state.allCommunityCards) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  const dupes = new Set<Rank>();
  for (const [rank, count] of counts) if (count > 1) dupes.add(rank);
  if (dupes.size === 0) return;
  removeCardsWhere(state, (card) => dupes.has(card.rank));
}

function riverOverwritesSuit(state: ServerGameState): void {
  const river = state.allCommunityCards[4] ?? state.allCommunityCards[state.allCommunityCards.length - 1];
  if (!river) return;
  state.allCommunityCards = state.allCommunityCards.map((card) =>
    card.suit === river.suit ? { ...card, rank: river.rank } : card,
  );
}

function shuffleHandAssignment(state: ServerGameState): void {
  const snapshots = state.hands.map((hand) => hand.cards.map(copyCard));
  if (snapshots.length <= 1) return;
  const rotated = snapshots.slice(1).concat(snapshots.slice(0, 1));
  state.hands.forEach((hand, index) => {
    hand.cards = rotated[index];
  });
}

function crossHandCardSwap(state: ServerGameState): void {
  if (state.hands.length < 2) return;
  const firstSnapshots = state.hands.map((hand) => (hand.cards[0] ? copyCard(hand.cards[0]) : null));
  const lastSnapshots = state.hands.map((hand) =>
    hand.cards.length > 0 ? copyCard(hand.cards[hand.cards.length - 1]) : null,
  );
  state.hands.forEach((hand, index) => {
    const nextLast = lastSnapshots[(index + 1) % lastSnapshots.length];
    if (hand.cards.length > 0 && nextLast) hand.cards[0] = nextLast;
    const ownFirst = firstSnapshots[index];
    if (hand.cards.length > 0 && ownFirst) hand.cards[hand.cards.length - 1] = ownFirst;
  });
}

function absorbLastHandToBoard(state: ServerGameState): void {
  if (state.hands.length === 0) return;
  const last = state.hands[state.hands.length - 1];
  if (!last || last.cards.length === 0) return;
  state.allCommunityCards = state.allCommunityCards.concat(last.cards.map(copyCard));
  state.absorbedHandIds = [...(state.absorbedHandIds ?? []), last.id];
  last.cards = [];
  last.cardCount = 0;
}

function hostageRankBecomesWild(state: ServerGameState): void {
  const designated = state.hands[0];
  if (!designated || designated.cards.length === 0) return;
  const wildRank = designated.cards[0].rank;
  state.wildRankByEffect = wildRank;
  state.dealDeck = state.dealDeck.map((card) =>
    card.rank === wildRank ? { ...card, meta: "joker" } : card,
  );
  // Also tag any matching board cards already in play so the showdown wild
  // path picks them up — otherwise the chip says "K is wild" but K's already
  // on the board play as their face values.
  state.allCommunityCards = state.allCommunityCards.map((card) =>
    card.rank === wildRank ? { ...card, meta: "joker" } : card,
  );
}

function markOneBoardWild(state: ServerGameState): void {
  if (state.allCommunityCards.length === 0) return;
  const index = 0; // First card by default — modes that want a different choice can extend later.
  state.markedBoardWildIndex = index;
  state.allCommunityCards[index] = { ...state.allCommunityCards[index], meta: "joker" };
}

function duplicateFlopPhase(state: ServerGameState): void {
  // Re-roll the first 3 community cards from the deal deck (the "second flop").
  if (state.allCommunityCards.length < 3) return;
  for (let i = 0; i < 3; i++) {
    const replacement = state.dealDeck.shift();
    if (!replacement) break;
    state.allCommunityCards[i] = replacement;
  }
}

function lockTopHalfAtFlop(state: ServerGameState): void {
  // Rough mid-hand ranking: hands with higher hole-card top-rank are "locked".
  // We capture half of the hands (rounded down) and freeze them by ID so
  // later phase-effect cases can skip them.
  if (state.hands.length < 2) {
    state.lockedHandIds = [];
    return;
  }
  const sorted = state.hands
    .slice()
    .sort((a, b) => {
      const aTop = Math.max(0, ...a.cards.map((card) => RANKS.indexOf(card.rank)));
      const bTop = Math.max(0, ...b.cards.map((card) => RANKS.indexOf(card.rank)));
      return bTop - aTop;
    });
  state.lockedHandIds = sorted.slice(0, Math.floor(state.hands.length / 2)).map((hand) => hand.id);
}

function bestCardClockwise(state: ServerGameState): void {
  if (state.hands.length <= 1) return;
  const best = state.hands.map((hand) => {
    if (hand.cards.length === 0) return null;
    let topIndex = 0;
    for (let index = 1; index < hand.cards.length; index++) {
      if (RANKS.indexOf(hand.cards[index].rank) > RANKS.indexOf(hand.cards[topIndex].rank)) topIndex = index;
    }
    return { card: copyCard(hand.cards[topIndex]), index: topIndex };
  });
  state.hands.forEach((hand, index) => {
    const fromIndex = (index - 1 + state.hands.length) % state.hands.length;
    const incoming = best[fromIndex];
    const own = best[index];
    if (incoming && own) hand.cards[own.index] = incoming.card;
  });
}

function rerollFlopAtTurn(state: ServerGameState): void {
  if (state.allCommunityCards.length < 3) return;
  for (let index = 0; index < 3; index++) {
    const replacement = state.dealDeck.shift();
    if (!replacement) break;
    state.allCommunityCards[index] = replacement;
  }
}

function markFirstBoard(state: ServerGameState): void {
  if (state.allCommunityCards[0]) {
    state.allCommunityCards[0] = { ...state.allCommunityCards[0], meta: "marked" };
  }
}

function tricksterSwapRight(state: ServerGameState): void {
  const tricksterIndex = state.hands.findIndex((hand) => hand.cards.some((card) => card.meta === "trickster"));
  if (tricksterIndex < 0) return;
  const rightIndex = (tricksterIndex + 1) % state.hands.length;
  const left = state.hands[tricksterIndex];
  const right = state.hands[rightIndex];
  if (!left || !right || left.cards.length === 0 || right.cards.length === 0) return;
  const leftIdx = left.cards.findIndex((card) => card.meta === "trickster");
  if (leftIdx < 0) return;
  const temp = left.cards[leftIdx];
  left.cards[leftIdx] = right.cards[0];
  right.cards[0] = temp;
}

function glitchCopyNeighbor(state: ServerGameState): void {
  const board = state.allCommunityCards;
  for (let index = 0; index < board.length; index++) {
    if (board[index].meta === "glitched") {
      const neighbor = board[index + 1] ?? board[index - 1];
      if (neighbor) board[index] = { ...board[index], rank: neighbor.rank, suit: neighbor.suit };
      return;
    }
  }
}
