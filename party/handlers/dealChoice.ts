import { getGameModeDefinition, keepBestCards } from "../../src/lib/gameMode";
import type { Card } from "../../src/lib/types";
import type { Handler } from "./types";

export const chooseDealCards: Handler = (state, player, msg) => {
  if (msg.type !== "chooseDealCards") return { kind: "ignore" };
  if (state.phase !== "dealChoice") return { kind: "ignore" };

  const mode = getGameModeDefinition(state.modeId);
  const dealChoice = mode.deal.dealChoice;
  const isExposeChoice = mode.deal.publicCardSelection === "playerChoice";
  if (!dealChoice?.selectionPhase && !isExposeChoice) return { kind: "ignore" };

  const hand = state.hands.find((candidate) => candidate.id === msg.handId);
  if (!hand || hand.playerId !== player.id) return { kind: "ignore" };

  const choice = state.dealChoices[msg.handId];
  if (!choice || choice.submitted) return { kind: "ignore" };

  const selected = normalizeIndexes(msg.indexes, hand.cards.length);
  if (selected.length !== choice.keepCards) return { kind: "ignore" };

  choice.selectedIndexes = selected;
  choice.submitted = true;

  if (allDealChoicesReady(state)) {
    finishDealChoicePhase(state);
  }

  return { kind: "broadcast" };
};

export const mulliganHand: Handler = (state, player, msg) => {
  if (msg.type !== "mulliganHand") return { kind: "ignore" };
  if (state.phase !== "dealChoice") return { kind: "ignore" };

  const mode = getGameModeDefinition(state.modeId);
  const dealChoice = mode.deal.dealChoice;
  if (!dealChoice?.selectionPhase || !dealChoice.mulligan) return { kind: "ignore" };

  const hand = state.hands.find((candidate) => candidate.id === msg.handId);
  if (!hand || hand.playerId !== player.id) return { kind: "ignore" };

  const choice = state.dealChoices[msg.handId];
  if (!choice || choice.submitted || !choice.canMulligan || choice.mulliganUsed) {
    return { kind: "ignore" };
  }

  if (state.dealDeck.length < dealChoice.dealtCards) return { kind: "ignore" };

  hand.cards = state.dealDeck.splice(0, dealChoice.dealtCards);
  hand.cardCount = hand.cards.length;
  hand.publicCards = hand.cards.slice(0, mode.deal.publicCards ?? 0);
  choice.selectedIndexes = null;
  choice.mulliganUsed = true;

  return { kind: "broadcast" };
};

function normalizeIndexes(indexes: readonly number[], cardCount: number): number[] {
  const unique = new Set<number>();
  for (const index of indexes) {
    if (!Number.isInteger(index) || index < 0 || index >= cardCount) continue;
    unique.add(index);
  }
  return [...unique].sort((a, b) => a - b);
}

function allDealChoicesReady(
  state: Parameters<Handler>[0]
): boolean {
  for (const hand of state.hands) {
    const choice = state.dealChoices[hand.id];
    if (!choice) continue;
    if (choice.submitted) continue;
    const owner = state.players.find((candidate) => candidate.id === hand.playerId);
    if (owner?.connected && !owner.isBot) return false;
  }
  return true;
}

function finishDealChoicePhase(state: Parameters<Handler>[0]): void {
  const mode = getGameModeDefinition(state.modeId);
  if (mode.deal.publicCardSelection === "playerChoice") {
    applyExposeChoice(state);
  } else if (mode.deal.dealChoice?.inheritance) {
    applyInheritance(state);
  } else if (mode.deal.dealChoice?.tradeUp) {
    applyTradeUp(state);
  } else {
    for (const hand of state.hands) {
      const choice = state.dealChoices[hand.id];
      if (!choice) continue;

      const selectedIndexes = choice.selectedIndexes ?? fallbackKeepIndexes(hand.cards, choice.keepCards);
      hand.cards = selectedIndexes
        .map((index) => hand.cards[index])
        .filter((card): card is Card => card !== undefined);
      refreshHandVisibility(hand, mode.deal.publicCards ?? 0);
    }
  }

  state.dealChoices = {};
  state.dealDeck = [];
  state.ranking = Array(state.hands.length).fill(null);
  state.acquireRequests = [];
  state.communityCards = [];
  state.phase = "preflop";
  state.phaseStartedAt = Date.now();
  for (const p of state.players) p.ready = false;
}

function applyExposeChoice(state: Parameters<Handler>[0]): void {
  for (const hand of state.hands) {
    const choice = state.dealChoices[hand.id];
    if (!choice) continue;
    const selectedIndexes = choice.selectedIndexes ?? fallbackExposeIndexes(choice.keepCards);
    hand.publicCards = selectedIndexes
      .map((index) => hand.cards[index])
      .filter((card): card is Card => card !== undefined);
    hand.cardCount = hand.cards.length;
  }
}

function applyInheritance(state: Parameters<Handler>[0]): void {
  const publicCount = getGameModeDefinition(state.modeId).deal.publicCards ?? 0;
  const playerIds = state.players.map((player) => player.id);
  const handByOwnerAndIndex = new Map<string, Parameters<Handler>[0]["hands"][number]>();
  for (const hand of state.hands) {
    handByOwnerAndIndex.set(`${hand.playerId}:${handIndexFromId(hand.id)}`, hand);
  }

  const planByOwnerAndIndex = new Map<string, { keptCards: Card[]; discardedCard: Card | null }>();
  for (const hand of state.hands) {
    const choice = state.dealChoices[hand.id];
    if (!choice) continue;
    const handIndex = handIndexFromId(hand.id);
    const selectedIndexes = choice.selectedIndexes ?? fallbackKeepIndexes(hand.cards, choice.keepCards);
    const selectedSet = new Set(selectedIndexes);
    const keptCards = selectedIndexes
      .map((index) => hand.cards[index])
      .filter((card): card is Card => card !== undefined);
    const discardedCard =
      hand.cards.find((_card, index) => !selectedSet.has(index)) ?? null;
    planByOwnerAndIndex.set(`${hand.playerId}:${handIndex}`, { keptCards, discardedCard });
  }

  for (let playerIndex = 0; playerIndex < playerIds.length; playerIndex++) {
    const targetPlayerId = playerIds[playerIndex];
    const rightPlayerId = playerIds[(playerIndex + playerIds.length - 1) % playerIds.length];
    for (let handIndex = 0; handIndex < state.handsPerPlayer; handIndex++) {
      const targetHand = handByOwnerAndIndex.get(`${targetPlayerId}:${handIndex}`);
      const targetPlan = planByOwnerAndIndex.get(`${targetPlayerId}:${handIndex}`);
      const rightPlan = planByOwnerAndIndex.get(`${rightPlayerId}:${handIndex}`);
      if (!targetHand || !targetPlan || !rightPlan?.discardedCard) continue;
      targetHand.cards = [...targetPlan.keptCards, rightPlan.discardedCard];
    }
  }

  for (const hand of state.hands) {
    refreshHandVisibility(hand, publicCount);
  }
}

function applyTradeUp(state: Parameters<Handler>[0]): void {
  const publicCount = getGameModeDefinition(state.modeId).deal.publicCards ?? 0;
  const playerIds = state.players.map((player) => player.id);
  const handByOwnerAndIndex = new Map<string, Parameters<Handler>[0]["hands"][number]>();
  for (const hand of state.hands) {
    handByOwnerAndIndex.set(`${hand.playerId}:${handIndexFromId(hand.id)}`, hand);
  }

  const selectedByOwnerAndIndex = new Map<string, { targetIndex: number; card: Card }>();
  for (const hand of state.hands) {
    const choice = state.dealChoices[hand.id];
    if (!choice) continue;
    const handIndex = handIndexFromId(hand.id);
    const selectedIndexes = choice.selectedIndexes ?? fallbackTradeUpIndexes(hand.cards, choice.keepCards);
    const targetIndex = selectedIndexes[0] ?? 0;
    const card = hand.cards[targetIndex];
    if (!card) continue;
    selectedByOwnerAndIndex.set(`${hand.playerId}:${handIndex}`, { targetIndex, card });
  }

  for (let playerIndex = 0; playerIndex < playerIds.length; playerIndex++) {
    const sourcePlayerId = playerIds[playerIndex];
    const leftPlayerId = playerIds[(playerIndex + 1) % playerIds.length];
    for (let handIndex = 0; handIndex < state.handsPerPlayer; handIndex++) {
      const source = selectedByOwnerAndIndex.get(`${sourcePlayerId}:${handIndex}`);
      const target = selectedByOwnerAndIndex.get(`${leftPlayerId}:${handIndex}`);
      const targetHand = handByOwnerAndIndex.get(`${leftPlayerId}:${handIndex}`);
      if (!source || !target || !targetHand) continue;
      targetHand.cards[target.targetIndex] = source.card;
    }
  }

  for (const hand of state.hands) {
    refreshHandVisibility(hand, publicCount);
  }
}

function handIndexFromId(handId: string): number {
  const raw = handId.slice(handId.lastIndexOf("-") + 1);
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function refreshHandVisibility(hand: Parameters<Handler>[0]["hands"][number], publicCount: number): void {
  hand.cardCount = hand.cards.length;
  hand.publicCards = hand.cards.slice(0, publicCount);
}

function fallbackKeepIndexes(cards: readonly Card[], keepCards: number): number[] {
  const kept = keepBestCards(cards, keepCards);
  const used = new Set<number>();
  const indexes: number[] = [];
  for (const keptCard of kept) {
    const index = cards.findIndex((candidate, i) => !used.has(i) && candidate === keptCard);
    if (index !== -1) {
      used.add(index);
      indexes.push(index);
    }
  }
  return indexes.sort((a, b) => a - b);
}

function fallbackExposeIndexes(keepCards: number): number[] {
  const indexes: number[] = [];
  for (let index = 0; index < keepCards; index++) indexes.push(index);
  return indexes;
}

function fallbackTradeUpIndexes(cards: readonly Card[], keepCards: number): number[] {
  if (cards.length === 0 || keepCards <= 0) return [];
  const best = new Set(fallbackKeepIndexes(cards, Math.max(0, cards.length - keepCards)));
  const indexes: number[] = [];
  for (let index = 0; index < cards.length && indexes.length < keepCards; index++) {
    if (!best.has(index)) indexes.push(index);
  }
  return indexes.length > 0 ? indexes : [0];
}
