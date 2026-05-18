import type { Card, Hand, Rank } from "../types";
import { createDeck, isFace, isRed, shuffleDeck } from "../deckUtils";
import { incrementMapCount } from "../utils";
import { RANK_VALUE } from "../rankValue";
import { getGameModeDefinition } from "./registry";
import type { PublicHoleCardSelection } from "./types";

interface ModeDealResult {
  hands: Hand[];
  communityCards: Card[];
  remainingDeck: Card[];
  burnCards: Card[];
}

export function createDeckForMode(modeId: string | undefined): Card[] {
  const mode = getGameModeDefinition(modeId);
  const deck = createDeck();
  switch (mode.deal.deck) {
    case "short":
      return deck.filter((card) => RANK_VALUE[card.rank] >= 6);
    case "stripped":
      return deck.filter((card) => RANK_VALUE[card.rank] >= 8);
    case "bottomHalf":
      return deck.filter((card) => RANK_VALUE[card.rank] <= 9);
    case "double":
      return duplicateDeck(deck, 2);
    case "triple":
      return duplicateDeck(deck, 3);
    case "half":
      return shuffleDeck(deck).slice(0, 26);
    case "pinochle":
      return duplicateDeck(deck.filter((card) => RANK_VALUE[card.rank] >= 9), 2);
    case "tarot":
      return deck.concat([
        { rank: "A", suit: "H", meta: "tarot", artVariant: Math.floor(Math.random() * 22) },
        { rank: "A", suit: "S", meta: "tarot", artVariant: Math.floor(Math.random() * 22) },
      ]);
    case "suitHeavy":
      return deck.concat(deck.filter((card) => card.suit === "H").map((card) => ({ ...card })));
    case "suitLight":
      return deck.filter((card) => card.suit !== "H" || RANK_VALUE[card.rank] >= 9);
    case "jokers":
      return deck.concat([
        { rank: "A", suit: "H", meta: "joker" },
        { rank: "A", suit: "S", meta: "joker" },
      ]);
    case "cursed":
      return markCard(deck, "A", "H", "cursed");
    case "blessed":
      return markCard(deck, "A", "H", "blessed");
    case "glitch":
      return markCard(deck, "A", "H", "glitched");
    case "twoSuited":
      return markCard(deck, "A", "H", "twoSuited");
    case "marked":
      return markCard(deck, "A", "H", "marked");
    case "trickster":
      return markCard(deck, "A", "H", "trickster");
    case "standard":
    default:
      return deck;
  }
}

function markCard(deck: readonly Card[], rank: Rank, suit: Card["suit"], meta: NonNullable<Card["meta"]>): Card[] {
  return deck.map((card) => card.rank === rank && card.suit === suit ? { ...card, meta } : card);
}

function duplicateDeck(deck: readonly Card[], copies: number): Card[] {
  const out: Card[] = [];
  for (let copy = 0; copy < copies; copy++) {
    out.push(...deck.map((card) => ({ ...card })));
  }
  return out;
}

export function dealCardsForMode(
  deck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number,
  modeId: string | undefined
): ModeDealResult {
  const mode = getGameModeDefinition(modeId);
  let remainingDeck = deck.slice();
  const cardsToDeal = mode.deal.dealChoice?.dealtCards ?? mode.deal.holeCards;
  const dealtHands = dealConstrainedHands(
    remainingDeck,
    playerIds,
    handsPerPlayer,
    cardsToDeal,
    mode.deal.constraint
  );

  const hands: Hand[] = [];
  const discardedCommunityCards: Card[] = [];
  const publicCount = mode.deal.publicCards ?? 0;
  const publicCardSelection = mode.deal.publicCardSelection ?? "first";
  const isExposeChoice = publicCardSelection === "playerChoice";
  for (const playerId of playerIds) {
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      const dealt = dealtHands[playerId][handIndex] ?? [];
      const cards = mode.deal.dealChoice?.selectionPhase || isExposeChoice
        ? dealt.slice()
        : keepBestCards(dealt, mode.deal.dealChoice?.keepCards ?? mode.deal.keepCards);
      markCounterfeitHoleCards(cards, mode.deal.counterfeitHoleCards);
      forceTarotHoleCards(cards, mode.deal.forceTarotHoleCards);
      if (mode.deal.discardedCardsToCommunity && !mode.deal.dealChoice?.selectionPhase) {
        discardedCommunityCards.push(...dealt.filter((card) => !cards.includes(card)));
      }
      hands.push({
        id: `${playerId}-${handIndex}`,
        playerId,
        cards,
        cardCount: cards.length,
        publicCards: isExposeChoice ? [] : selectPublicCards(cards, publicCount, publicCardSelection),
        flipped: false,
      });
    }
  }

  const communityCards: Card[] = [];
  const burnCards: Card[] = [];
  const burn = () => {
    const next = remainingDeck.shift();
    if (next) burnCards.push(next);
  };
  const drawCommunity = (count: number) => {
    for (let i = 0; i < count && communityCards.length < mode.deal.communityCards; i++) {
      const next = remainingDeck.shift();
      if (next) communityCards.push(next);
    }
  };

  if (mode.deal.communityCards > 0) {
    burn(); // burn before first board packet
    drawCommunity(Math.min(3, mode.deal.communityCards));
  }
  if (communityCards.length < mode.deal.communityCards) {
    burn(); // burn before turn packet
    drawCommunity(1);
  }
  if (communityCards.length < mode.deal.communityCards) {
    burn(); // burn before river packet
    drawCommunity(mode.deal.communityCards - communityCards.length);
  }
  communityCards.push(...discardedCommunityCards);
  applyPossibleIdentities(mode.deal.possibleIdentities, hands, communityCards);

  return {
    hands,
    communityCards,
    remainingDeck,
    burnCards,
  };
}

function applyPossibleIdentities(
  scope: ReturnType<typeof getGameModeDefinition>["deal"]["possibleIdentities"],
  hands: Hand[],
  communityCards: Card[]
): void {
  if (scope === "holes" || scope === "holesAndBoard") {
    for (const hand of hands) {
      hand.cards = hand.cards.map(withAlternateIdentity);
      hand.publicCards = hand.publicCards?.map(withAlternateIdentity);
    }
  }
  if (scope === "board" || scope === "holesAndBoard") {
    for (let index = 0; index < communityCards.length; index++) {
      communityCards[index] = withAlternateIdentity(communityCards[index]);
    }
  }
}

function withAlternateIdentity(card: Card): Card {
  return {
    ...card,
    possibleIdentities: [
      stripIdentity(card),
      alternateIdentity(card),
    ],
  };
}

function stripIdentity(card: Card): Card {
  const { possibleIdentities: _possibleIdentities, ...rest } = card;
  return { ...rest };
}

function alternateIdentity(card: Card): Card {
  const ranks: readonly Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const suits: readonly Card["suit"][] = ["H", "D", "C", "S"];
  const rank = ranks[(ranks.indexOf(card.rank) + 1) % ranks.length];
  const suit = suits[(suits.indexOf(card.suit) + 1) % suits.length];
  return { rank, suit, meta: card.meta };
}

function selectPublicCards(
  cards: readonly Card[],
  count: number,
  selection: PublicHoleCardSelection
): Card[] {
  if (count <= 0) return [];
  if (selection === "first") return cards.slice(0, count);
  if (selection === "playerChoice") return [];

  const sorted = cards.slice().sort((a, b) => {
    const delta = RANK_VALUE[b.rank] - RANK_VALUE[a.rank];
    return selection === "highest" ? delta : -delta;
  });
  return sorted.slice(0, count);
}

function markCounterfeitHoleCards(cards: Card[], count: number | undefined): void {
  if (!count) return;
  for (let index = 0; index < Math.min(count, cards.length); index++) {
    cards[index] = { ...cards[index], meta: "counterfeit" };
  }
}

function forceTarotHoleCards(cards: Card[], count: number | undefined): void {
  if (!count || count <= 0) return;
  const start = Math.max(0, cards.length - count);
  for (let index = start; index < cards.length; index++) {
    cards[index] = { ...cards[index], meta: "tarot", artVariant: Math.floor(Math.random() * 22) };
  }
}

function dealConstrainedHands(
  remainingDeck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number,
  cardsToDeal: number,
  constraint: ReturnType<typeof getGameModeDefinition>["deal"]["constraint"]
): Record<string, Card[][]> {
  switch (constraint) {
    case "pocketPair":
      return dealPocketPairHands(remainingDeck, playerIds, handsPerPlayer);
    case "sharedFirstCard":
      return dealSharedFirstCardHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal);
    case "differentSuits":
      return dealDifferentSuitHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal);
    case "sameSuit":
      return dealSameSuitHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal);
    case "connectedRanks":
      return dealConnectedRankHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal);
    case "gappedRanks":
      return dealGappedRankHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal);
    case "polarRanks":
      return dealPolarRankHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal);
    case "lowRanks":
      return dealRankBandHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal, isLowRank);
    case "highRanks":
      return dealRankBandHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal, isHighRank);
    case "atLeastOneFace":
      return dealAtLeastOneRankHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal, (card) => isFace(card.rank));
    case "bichrome":
      return dealColorPredicateHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal, false);
    case "monochrome":
      return dealColorPredicateHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal, true);
    case "fixedGap5":
      return dealRankGapHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal, 5);
    default:
      return dealRoundRobinHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal);
  }
}


function dealAtLeastOneRankHands(
  remainingDeck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number,
  cardsToDeal: number,
  predicate: (card: Card) => boolean
): Record<string, Card[][]> {
  const dealtHands = initHandBuckets(playerIds, handsPerPlayer);
  for (const playerId of playerIds) {
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      dealtHands[playerId][handIndex] = drawHandWithAtLeastOne(remainingDeck, cardsToDeal, predicate);
    }
  }
  return dealtHands;
}

function drawHandWithAtLeastOne(remainingDeck: Card[], cardsToDeal: number, predicate: (card: Card) => boolean): Card[] {
  const seedIndex = remainingDeck.findIndex(predicate);
  if (seedIndex === -1) {
    const fallback: Card[] = [];
    for (let i = 0; i < cardsToDeal; i++) {
      const next = remainingDeck.shift();
      if (next) fallback.push(next);
    }
    return fallback;
  }
  const seed = remainingDeck.splice(seedIndex, 1)[0];
  const out: Card[] = [seed];
  for (let i = 1; i < cardsToDeal; i++) {
    const next = remainingDeck.shift();
    if (next) out.push(next);
  }
  return out;
}

function dealColorPredicateHands(
  remainingDeck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number,
  cardsToDeal: number,
  sameColor: boolean
): Record<string, Card[][]> {
  const dealtHands = initHandBuckets(playerIds, handsPerPlayer);
  for (const playerId of playerIds) {
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      dealtHands[playerId][handIndex] = drawColorPairAndFill(remainingDeck, cardsToDeal, sameColor);
    }
  }
  return dealtHands;
}

function drawColorPairAndFill(remainingDeck: Card[], cardsToDeal: number, sameColor: boolean): Card[] {
  if (cardsToDeal < 2) {
    const out: Card[] = [];
    for (let i = 0; i < cardsToDeal; i++) {
      const next = remainingDeck.shift();
      if (next) out.push(next);
    }
    return out;
  }
  for (let firstIndex = 0; firstIndex < remainingDeck.length; firstIndex++) {
    const first = remainingDeck[firstIndex];
    const firstIsRed = isRed(first.suit);
    const secondIndex = remainingDeck.findIndex((candidate, index) => {
      if (index === firstIndex) return false;
      const secondIsRed = isRed(candidate.suit);
      return sameColor ? secondIsRed === firstIsRed : secondIsRed !== firstIsRed;
    });
    if (secondIndex === -1) continue;
    const second = remainingDeck[secondIndex];
    const a = Math.max(firstIndex, secondIndex);
    const b = Math.min(firstIndex, secondIndex);
    remainingDeck.splice(a, 1);
    remainingDeck.splice(b, 1);
    const out: Card[] = [first, second];
    for (let i = 2; i < cardsToDeal; i++) {
      const next = remainingDeck.shift();
      if (next) out.push(next);
    }
    return out;
  }
  return drawHandWithAtLeastOne(remainingDeck, cardsToDeal, () => true);
}

function dealRankGapHands(
  remainingDeck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number,
  cardsToDeal: number,
  gap: number
): Record<string, Card[][]> {
  if (cardsToDeal !== 2) return dealRoundRobinHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal);
  const dealtHands = initHandBuckets(playerIds, handsPerPlayer);
  for (const playerId of playerIds) {
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      dealtHands[playerId][handIndex] = drawFirstRankGapPair(remainingDeck, gap);
    }
  }
  return dealtHands;
}

function initHandBuckets(playerIds: readonly string[], handsPerPlayer: number): Record<string, Card[][]> {
  const dealtHands: Record<string, Card[][]> = {};
  for (const playerId of playerIds) {
    dealtHands[playerId] = [];
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      dealtHands[playerId].push([]);
    }
  }
  return dealtHands;
}

function dealRoundRobinHands(
  remainingDeck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number,
  cardsToDeal: number
): Record<string, Card[][]> {
  const dealtHands = initHandBuckets(playerIds, handsPerPlayer);
  for (let card = 0; card < cardsToDeal; card++) {
    for (const playerId of playerIds) {
      for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
        const next = remainingDeck.shift();
        if (next) dealtHands[playerId][handIndex].push(next);
      }
    }
  }
  return dealtHands;
}

function dealPocketPairHands(
  remainingDeck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number
): Record<string, Card[][]> {
  const dealtHands = initHandBuckets(playerIds, handsPerPlayer);
  for (const playerId of playerIds) {
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      dealtHands[playerId][handIndex] = drawFirstRankPair(remainingDeck);
    }
  }
  return dealtHands;
}

function dealSharedFirstCardHands(
  remainingDeck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number,
  cardsToDeal: number
): Record<string, Card[][]> {
  const dealtHands = initHandBuckets(playerIds, handsPerPlayer);
  const sharedCard = remainingDeck.shift();
  for (const playerId of playerIds) {
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      if (sharedCard) dealtHands[playerId][handIndex].push(sharedCard);
    }
  }
  for (let card = 1; card < cardsToDeal; card++) {
    for (const playerId of playerIds) {
      for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
        const next = remainingDeck.shift();
        if (next) dealtHands[playerId][handIndex].push(next);
      }
    }
  }
  return dealtHands;
}

function dealDifferentSuitHands(
  remainingDeck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number,
  cardsToDeal: number
): Record<string, Card[][]> {
  if (cardsToDeal !== 2) {
    return dealRoundRobinHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal);
  }

  const dealtHands = initHandBuckets(playerIds, handsPerPlayer);
  for (const playerId of playerIds) {
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      dealtHands[playerId][handIndex] = drawFirstDifferentSuitPair(remainingDeck);
    }
  }
  return dealtHands;
}

function dealSameSuitHands(
  remainingDeck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number,
  cardsToDeal: number
): Record<string, Card[][]> {
  if (cardsToDeal !== 2) {
    return dealRoundRobinHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal);
  }

  const dealtHands = initHandBuckets(playerIds, handsPerPlayer);
  for (const playerId of playerIds) {
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      dealtHands[playerId][handIndex] = drawFirstSameSuitPair(remainingDeck);
    }
  }
  return dealtHands;
}

function dealConnectedRankHands(
  remainingDeck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number,
  cardsToDeal: number
): Record<string, Card[][]> {
  if (cardsToDeal !== 2) {
    return dealRoundRobinHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal);
  }

  const dealtHands = initHandBuckets(playerIds, handsPerPlayer);
  for (const playerId of playerIds) {
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      dealtHands[playerId][handIndex] = drawFirstRankGapPair(remainingDeck, 1);
    }
  }
  return dealtHands;
}

function dealGappedRankHands(
  remainingDeck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number,
  cardsToDeal: number
): Record<string, Card[][]> {
  if (cardsToDeal !== 2) {
    return dealRoundRobinHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal);
  }

  const dealtHands = initHandBuckets(playerIds, handsPerPlayer);
  for (const playerId of playerIds) {
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      dealtHands[playerId][handIndex] = drawFirstRankGapPair(remainingDeck, 2);
    }
  }
  return dealtHands;
}

function dealPolarRankHands(
  remainingDeck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number,
  cardsToDeal: number
): Record<string, Card[][]> {
  if (cardsToDeal !== 2) {
    return dealRoundRobinHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal);
  }

  const dealtHands = initHandBuckets(playerIds, handsPerPlayer);
  for (const playerId of playerIds) {
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      dealtHands[playerId][handIndex] = drawFirstPolarRankPair(remainingDeck);
    }
  }
  return dealtHands;
}

function dealRankBandHands(
  remainingDeck: Card[],
  playerIds: readonly string[],
  handsPerPlayer: number,
  cardsToDeal: number,
  inBand: (card: Card) => boolean
): Record<string, Card[][]> {
  if (cardsToDeal !== 2) {
    return dealRoundRobinHands(remainingDeck, playerIds, handsPerPlayer, cardsToDeal);
  }

  const dealtHands = initHandBuckets(playerIds, handsPerPlayer);
  for (const playerId of playerIds) {
    for (let handIndex = 0; handIndex < handsPerPlayer; handIndex++) {
      dealtHands[playerId][handIndex] = drawFirstRankBandPair(remainingDeck, inBand);
    }
  }
  return dealtHands;
}

function drawFirstRankPair(remainingDeck: Card[]): Card[] {
  for (let firstIndex = 0; firstIndex < remainingDeck.length; firstIndex++) {
    const first = remainingDeck[firstIndex];
    const secondIndex = remainingDeck.findIndex((candidate, index) => {
      return index > firstIndex && candidate.rank === first.rank;
    });
    if (secondIndex === -1) continue;
    const second = remainingDeck[secondIndex];
    remainingDeck.splice(secondIndex, 1);
    remainingDeck.splice(firstIndex, 1);
    return [first, second];
  }
  return [];
}

function drawFirstDifferentSuitPair(remainingDeck: Card[]): Card[] {
  const first = remainingDeck.shift();
  if (!first) return [];
  const secondIndex = remainingDeck.findIndex((candidate) => candidate.suit !== first.suit);
  const second = secondIndex >= 0 ? remainingDeck.splice(secondIndex, 1)[0] : remainingDeck.shift();
  return second ? [first, second] : [first];
}

function drawFirstSameSuitPair(remainingDeck: Card[]): Card[] {
  for (let firstIndex = 0; firstIndex < remainingDeck.length; firstIndex++) {
    const first = remainingDeck[firstIndex];
    const secondIndex = remainingDeck.findIndex((candidate, index) => {
      return index > firstIndex && candidate.suit === first.suit;
    });
    if (secondIndex === -1) continue;
    const second = remainingDeck[secondIndex];
    remainingDeck.splice(secondIndex, 1);
    remainingDeck.splice(firstIndex, 1);
    return [first, second];
  }
  return [];
}

function drawFirstRankGapPair(remainingDeck: Card[], gap: number): Card[] {
  for (let firstIndex = 0; firstIndex < remainingDeck.length; firstIndex++) {
    const first = remainingDeck[firstIndex];
    const secondIndex = remainingDeck.findIndex((candidate, index) => {
      return index > firstIndex && Math.abs(RANK_VALUE[candidate.rank] - RANK_VALUE[first.rank]) === gap;
    });
    if (secondIndex === -1) continue;
    const second = remainingDeck[secondIndex];
    remainingDeck.splice(secondIndex, 1);
    remainingDeck.splice(firstIndex, 1);
    return [first, second];
  }
  return [];
}

function drawFirstPolarRankPair(remainingDeck: Card[]): Card[] {
  for (let firstIndex = 0; firstIndex < remainingDeck.length; firstIndex++) {
    const first = remainingDeck[firstIndex];
    const firstIsHigh = isHighRank(first);
    const secondIndex = remainingDeck.findIndex((candidate, index) => {
      return index > firstIndex && isHighRank(candidate) !== firstIsHigh;
    });
    if (secondIndex === -1) continue;
    const second = remainingDeck[secondIndex];
    remainingDeck.splice(secondIndex, 1);
    remainingDeck.splice(firstIndex, 1);
    return [first, second];
  }
  return [];
}

function drawFirstRankBandPair(remainingDeck: Card[], inBand: (card: Card) => boolean): Card[] {
  for (let firstIndex = 0; firstIndex < remainingDeck.length; firstIndex++) {
    const first = remainingDeck[firstIndex];
    if (!inBand(first)) continue;
    const secondIndex = remainingDeck.findIndex((candidate, index) => {
      return index > firstIndex && inBand(candidate);
    });
    if (secondIndex === -1) continue;
    const second = remainingDeck[secondIndex];
    remainingDeck.splice(secondIndex, 1);
    remainingDeck.splice(firstIndex, 1);
    return [first, second];
  }
  return [];
}

function isHighRank(card: Card): boolean {
  return RANK_VALUE[card.rank] >= 8;
}

function isLowRank(card: Card): boolean {
  return RANK_VALUE[card.rank] <= 7;
}

export function keepBestCards(cards: readonly Card[], keepCards: number | undefined): Card[] {
  if (keepCards === undefined || keepCards >= cards.length) return cards.slice();
  if (keepCards <= 0) return [];

  let best: Card[] = cards.slice(0, keepCards);
  let bestScore = scoreStartingCards(best);
  for (const combo of combinations(cards, keepCards)) {
    const score = scoreStartingCards(combo);
    if (score > bestScore) {
      best = combo;
      bestScore = score;
    }
  }
  return best;
}

function combinations(cards: readonly Card[], size: number): Card[][] {
  const out: Card[][] = [];
  const walk = (start: number, selected: Card[]) => {
    if (selected.length === size) {
      out.push(selected.slice());
      return;
    }
    for (let i = start; i <= cards.length - (size - selected.length); i++) {
      selected.push(cards[i]);
      walk(i + 1, selected);
      selected.pop();
    }
  };
  walk(0, []);
  return out;
}

function scoreStartingCards(cards: readonly Card[]): number {
  if (cards.length === 0) return 0;
  const ranks = cards.map((card) => RANK_VALUE[card.rank]).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const rank of ranks) incrementMapCount(counts, rank);
  const multiplicity = Math.max(...counts.values());
  const pairBoost = multiplicity > 1 ? 100 * multiplicity : 0;
  const suitedBoost = cards.length > 1 && cards.every((card) => card.suit === cards[0].suit) ? 4 : 0;
  const connectedBoost =
    ranks.length > 1 && ranks[0] - ranks[ranks.length - 1] <= ranks.length ? 3 : 0;
  return pairBoost + suitedBoost + connectedBoost + ranks.reduce((sum, rank, idx) => {
    return sum + rank / Math.pow(20, idx);
  }, 0);
}
