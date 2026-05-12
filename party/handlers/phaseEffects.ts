import { getGameModeDefinition, type PhaseEffectId } from "../../src/lib/gameModes";
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

export function applyModePhaseEffects(state: ServerGameState, phase: Phase): ChaosEvent[] {
  const mode = getGameModeDefinition(state.modeId);
  const effects = mode.phaseEffects?.[phase] ?? [];
  const events: ChaosEvent[] = [];
  for (const effect of effects) {
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
        removeCardsWhere(state, (card) => card.rank === "J" || card.rank === "Q" || card.rank === "K");
        break;
      case "removeSevens":
        removeCardsWhere(state, (card) => card.rank === "7");
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
      case "removeEvenRanks":
        removeCardsWhere(state, (card) => isEvenRank(card.rank));
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
    }
    events.push({
      event: effect,
      affected: affectedForEffect(effect, state),
      phase,
      modeId: mode.id,
    });
  }
  return events;
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

function isEvenRank(rank: Rank): boolean {
  return rank === "2" || rank === "4" || rank === "6" || rank === "8" || rank === "T" || rank === "Q";
}
