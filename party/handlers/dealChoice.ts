/**
 * Deal-choice message handlers + finalization dispatcher.
 *
 * Each ClientMessage handler validates and pre-mutates `state.dealChoices`
 * for one specific protocol action. When `allDealChoicesReady` is true,
 * `finishDealChoicePhase` hands off to the variant registry under
 * `src/lib/gameMode/dealChoices/` — that file owns the variant's actual
 * finalization mutation (combining selections into final hands, applying
 * trade-up rotations, etc.). Adding a new variant: add a file under
 * `src/lib/gameMode/dealChoices/` and one import line in `index.ts` there;
 * this file only changes when a new ClientMessage type is added.
 */
import { getGameModeDefinition } from "../../src/lib/gameMode";
import {
  dealChoiceVariantRegistry,
  fallbackKeepIndexes,
  applyStandardKeep,
} from "../../src/lib/gameMode/dealChoices";
import "../../src/lib/gameMode/dealChoices"; // populate variant registry
import { resolveDealChoiceVariant } from "../../src/lib/gameMode/dealChoiceVariant";
import { handIndexFromId } from "../../src/lib/handId";
import { filterDefined, filterHandsByPlayer, findHandById, idMap, incrementMapCount, leftNeighbor, rightNeighbor } from "../../src/lib/utils";
import type { ServerGameState } from "../state";
import { isValidCardIndex, lookupOwnedHandChoice } from "./dealChoiceHelpers";
import type { Handler } from "./types";

type StateHand = ServerGameState["hands"][number];

export const chooseDealCards: Handler = (state, player, msg) => {
  if (msg.type !== "chooseDealCards") return { kind: "ignore" };
  if (state.phase !== "dealChoice") return { kind: "ignore" };

  const mode = getGameModeDefinition(state.modeId);
  const dealChoice = mode.deal.dealChoice;
  const isExposeChoice = mode.deal.publicCardSelection === "playerChoice";
  if (!dealChoice?.selectionPhase && !isExposeChoice) return { kind: "ignore" };

  const owned = lookupOwnedHandChoice(state, player, msg.handId);
  if (!owned) return { kind: "ignore" };
  const { hand, choice } = owned;

  // optInHole3WithPenalty mutates `choice.keepCards` at runtime, so read it
  // from the choice rather than the static `mode.deal.dealChoice.keepCards`.
  const selected = normalizeIndexes(msg.indexes, hand.cards.length);
  if (selected.length !== choice.keepCards) return { kind: "ignore" };

  choice.selectedIndexes = selected;
  // Recruit is two-phase: the steal step fires after the keep step locks.
  if (dealChoice?.recruit) {
    choice.recruitStage = "steal";
  } else {
    choice.submitted = true;
  }

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

  const owned = lookupOwnedHandChoice(state, player, msg.handId);
  if (!owned) return { kind: "ignore" };
  const { hand, choice } = owned;
  if (!choice.canMulligan || choice.mulliganUsed) return { kind: "ignore" };

  if (state.dealDeck.length < dealChoice.dealtCards) return { kind: "ignore" };

  hand.cards = state.dealDeck.splice(0, dealChoice.dealtCards);
  hand.cardCount = hand.cards.length;
  hand.publicCards = hand.cards.slice(0, mode.deal.publicCards ?? 0);
  choice.selectedIndexes = null;
  choice.mulliganUsed = true;
  choice.submitted = true;

  if (allDealChoicesReady(state)) {
    finishDealChoicePhase(state);
  }

  return { kind: "broadcast" };
};

export const sacrificeHole: Handler = (state, player, msg) => {
  if (msg.type !== "sacrificeHole") return { kind: "ignore" };
  if (state.phase !== "dealChoice") return { kind: "ignore" };
  const mode = getGameModeDefinition(state.modeId);
  if (!mode.deal.dealChoice?.sacrificeForPeek) return { kind: "ignore" };

  const owned = lookupOwnedHandChoice(state, player, msg.handId);
  if (!owned) return { kind: "ignore" };
  const { hand, choice } = owned;

  if (msg.cardIndex === null) {
    choice.sacrificedHoleIndex = null;
    choice.privatePeekCards = undefined;
    return { kind: "broadcast" };
  }

  if (!isValidCardIndex(msg.cardIndex, hand.cards.length)) return { kind: "ignore" };

  choice.sacrificedHoleIndex = msg.cardIndex;
  choice.privatePeekCards = state.allCommunityCards.slice(0, 3);
  const survivorIndex = hand.cards.findIndex((_card, index) => index !== msg.cardIndex);
  if (survivorIndex !== -1) {
    choice.selectedIndexes = [survivorIndex];
    choice.submitted = true;
  }
  if (allDealChoicesReady(state)) finishDealChoicePhase(state);
  return { kind: "broadcast" };
};

export const optInThirdHole: Handler = (state, player, msg) => {
  if (msg.type !== "optInThirdHole") return { kind: "ignore" };
  if (state.phase !== "dealChoice") return { kind: "ignore" };
  const mode = getGameModeDefinition(state.modeId);
  if (!mode.deal.dealChoice?.optInHole3WithPenalty) return { kind: "ignore" };

  const owned = lookupOwnedHandChoice(state, player, msg.handId);
  if (!owned) return { kind: "ignore" };
  const { hand, choice } = owned;

  choice.optedThirdHole = msg.optIn;
  // The standard chooseDealCards validator reads choice.keepCards, so toggle
  // it here. Earlier selections become invalid under the new budget.
  choice.keepCards = msg.optIn ? hand.cards.length : (mode.deal.dealChoice.keepCards ?? 2);
  choice.selectedIndexes = null;
  return { kind: "broadcast" };
};

export const contributeToBlindPool: Handler = (state, player, msg) => {
  if (msg.type !== "contributeToBlindPool") return { kind: "ignore" };
  if (state.phase !== "dealChoice") return { kind: "ignore" };
  const mode = getGameModeDefinition(state.modeId);
  if (!mode.deal.dealChoice?.blindPool) return { kind: "ignore" };

  const owned = lookupOwnedHandChoice(state, player, msg.handId);
  if (!owned) return { kind: "ignore" };
  const { hand, choice } = owned;

  if (!isValidCardIndex(msg.cardIndex, hand.cards.length)) return { kind: "ignore" };

  choice.blindPoolContribution = msg.cardIndex;
  choice.selectedIndexes = [msg.cardIndex];
  choice.submitted = true;

  if (allDealChoicesReady(state)) finishDealChoicePhase(state);
  return { kind: "broadcast" };
};

export const auctionClaim: Handler = (state, player, msg) => {
  if (msg.type !== "auctionClaim") return { kind: "ignore" };
  if (state.phase !== "dealChoice") return { kind: "ignore" };
  const mode = getGameModeDefinition(state.modeId);
  if (!mode.deal.dealChoice?.auction) return { kind: "ignore" };

  const pool = state.auctionPool;
  if (!pool || pool.claimQueue.length === 0) return { kind: "ignore" };
  if (pool.claimQueue[0] !== player.id) return { kind: "ignore" };
  if (!Number.isInteger(msg.poolCardIndex)) return { kind: "ignore" };
  if (!pool.remainingIndexes.includes(msg.poolCardIndex)) return { kind: "ignore" };

  const keep = mode.deal.dealChoice.keepCards;
  const myHands = filterHandsByPlayer(state.hands, player.id);
  const claimsSoFar = pool.claimsPerPlayer[player.id] ?? 0;
  const targetHandIndex = claimsSoFar % myHands.length;
  const targetHand = myHands[targetHandIndex];
  if (!targetHand) return { kind: "ignore" };

  const card = pool.cards[msg.poolCardIndex];
  if (!card) return { kind: "ignore" };

  targetHand.cards.push(card);
  pool.remainingIndexes = pool.remainingIndexes.filter((i) => i !== msg.poolCardIndex);
  pool.claimsPerPlayer[player.id] = claimsSoFar + 1;

  pool.claimQueue.shift();
  const totalNeeded = keep * myHands.length;
  if ((pool.claimsPerPlayer[player.id] ?? 0) < totalNeeded) {
    pool.claimQueue.push(player.id);
  }

  const playersById = idMap(state.players);
  while (pool.claimQueue.length > 0 && pool.remainingIndexes.length > 0) {
    const headId = pool.claimQueue[0];
    const owner = playersById.get(headId);
    if (!owner) {
      pool.claimQueue.shift();
      continue;
    }
    if (owner.isBot || !owner.connected) {
      autoClaimForPlayer(state, pool, owner.id, keep);
      continue;
    }
    break;
  }
  if (pool.remainingIndexes.length === 0 || pool.claimQueue.length === 0) {
    for (const hand of state.hands) {
      const choice = state.dealChoices[hand.id];
      if (!choice) continue;
      choice.submitted = true;
    }
    finishDealChoicePhase(state);
  }
  return { kind: "broadcast" };
};

function autoClaimForPlayer(
  state: ServerGameState,
  pool: NonNullable<ServerGameState["auctionPool"]>,
  playerId: string,
  keep: number,
): void {
  // Shift the queue head BEFORE any early-return so the outer drain loop
  // can't deadlock on a malformed seat (e.g. zero hands).
  pool.claimQueue.shift();

  const myHands = filterHandsByPlayer(state.hands, playerId);
  if (myHands.length === 0) return;

  let bestPick = -1;
  let bestRank = -1;
  for (const i of pool.remainingIndexes) {
    const r = RANK_ORDER.indexOf(pool.cards[i].rank);
    if (r > bestRank) { bestRank = r; bestPick = i; }
  }
  if (bestPick === -1) return;

  const claimsSoFar = pool.claimsPerPlayer[playerId] ?? 0;
  const targetHand = myHands[claimsSoFar % myHands.length];
  if (!targetHand) return;
  targetHand.cards.push(pool.cards[bestPick]);
  pool.remainingIndexes = pool.remainingIndexes.filter((i) => i !== bestPick);
  pool.claimsPerPlayer[playerId] = claimsSoFar + 1;

  const totalNeeded = keep * myHands.length;
  if ((pool.claimsPerPlayer[playerId] ?? 0) < totalNeeded) {
    pool.claimQueue.push(playerId);
  }
}

const RANK_ORDER = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;

export const recruitFromNeighbor: Handler = (state, player, msg) => {
  if (msg.type !== "recruitFromNeighbor") return { kind: "ignore" };
  if (state.phase !== "dealChoice") return { kind: "ignore" };
  const mode = getGameModeDefinition(state.modeId);
  if (!mode.deal.dealChoice?.recruit) return { kind: "ignore" };

  const owned = lookupOwnedHandChoice(state, player, msg.handId);
  if (!owned) return { kind: "ignore" };
  const { hand, choice } = owned;
  if (choice.recruitStage !== "steal") return { kind: "ignore" };

  const playerIds = state.players.map((p) => p.id);
  const ownerIndex = playerIds.indexOf(player.id);
  if (ownerIndex < 0) return { kind: "ignore" };
  const rightId = rightNeighbor(playerIds, ownerIndex);
  const handIndex = handIndexFromId(hand.id);
  const rightHand = state.hands.find(
    (h) => h.playerId === rightId && handIndexFromId(h.id) === handIndex,
  );
  if (!rightHand) return { kind: "ignore" };

  const rightChoice = state.dealChoices[rightHand.id];
  if (!rightChoice || !rightChoice.selectedIndexes) return { kind: "ignore" };
  if (!Number.isInteger(msg.neighborDiscardIndex)) return { kind: "ignore" };
  const keptSet = new Set(rightChoice.selectedIndexes);
  const discardIndexes = rightHand.cards
    .map((_card, i) => i)
    .filter((i) => !keptSet.has(i));
  if (!discardIndexes.includes(msg.neighborDiscardIndex)) return { kind: "ignore" };

  const recruited = rightHand.cards[msg.neighborDiscardIndex];
  hand.cards.push(recruited);
  choice.recruitedFromNeighborIndex = msg.neighborDiscardIndex;
  choice.recruitStage = "done";
  choice.submitted = true;

  if (allDealChoicesReady(state)) finishDealChoicePhase(state);
  return { kind: "broadcast" };
};

export const solomonSplit: Handler = (state, player, msg) => {
  if (msg.type !== "solomonSplit") return { kind: "ignore" };
  if (state.phase !== "dealChoice") return { kind: "ignore" };
  const mode = getGameModeDefinition(state.modeId);
  if (!mode.deal.dealChoice?.solomon) return { kind: "ignore" };

  const owned = lookupOwnedHandChoice(state, player, msg.handId);
  if (!owned) return { kind: "ignore" };
  const { hand, choice } = owned;

  const total = hand.cards.length;
  const pair1 = normalizeIndexes(msg.pair1, total);
  const pair2 = normalizeIndexes(msg.pair2, total);
  const combined = new Set([...pair1, ...pair2]);
  if (
    pair1.length + pair2.length !== total ||
    combined.size !== total ||
    pair1.length !== Math.floor(total / 2)
  ) {
    return { kind: "ignore" };
  }

  choice.solomonSplit = { pair1, pair2 };
  return { kind: "broadcast" };
};

export const solomonChoose: Handler = (state, player, msg) => {
  if (msg.type !== "solomonChoose") return { kind: "ignore" };
  if (state.phase !== "dealChoice") return { kind: "ignore" };
  const mode = getGameModeDefinition(state.modeId);
  if (!mode.deal.dealChoice?.solomon) return { kind: "ignore" };

  const targetHand = findHandById(state.hands, msg.targetHandId);
  if (!targetHand) return { kind: "ignore" };
  const targetChoice = state.dealChoices[msg.targetHandId];
  if (!targetChoice || targetChoice.submitted || !targetChoice.solomonSplit) {
    return { kind: "ignore" };
  }

  const playerIds = state.players.map((p) => p.id);
  const targetIndex = playerIds.indexOf(targetHand.playerId);
  if (targetIndex < 0) return { kind: "ignore" };
  const leftId = leftNeighbor(playerIds, targetIndex);
  if (player.id !== leftId) return { kind: "ignore" };

  if (msg.chosenPair !== 0 && msg.chosenPair !== 1) return { kind: "ignore" };
  const chosen = msg.chosenPair;
  const pairIndexes = chosen === 0 ? targetChoice.solomonSplit.pair1 : targetChoice.solomonSplit.pair2;

  targetChoice.solomonChosenPair = chosen;
  targetChoice.selectedIndexes = pairIndexes.slice().sort((a, b) => a - b);
  targetChoice.submitted = true;

  if (allDealChoicesReady(state)) finishDealChoicePhase(state);
  return { kind: "broadcast" };
};

export const tablePicksVote: Handler = (state, player, msg) => {
  if (msg.type !== "tablePicksVote") return { kind: "ignore" };
  if (state.phase !== "dealChoice") return { kind: "ignore" };
  const mode = getGameModeDefinition(state.modeId);
  if (!mode.deal.dealChoice?.tablePicks) return { kind: "ignore" };

  const target = findHandById(state.hands, msg.targetHandId);
  if (!target) return { kind: "ignore" };
  if (target.playerId === player.id) return { kind: "ignore" };
  const choice = state.dealChoices[msg.targetHandId];
  if (!choice || choice.submitted) return { kind: "ignore" };

  const keep = mode.deal.dealChoice.keepCards;
  const indexes = normalizeIndexes(msg.indexes, target.cards.length);
  if (indexes.length !== keep) return { kind: "ignore" };
  // Reject re-votes: once a voter submits, their ballot is final. Lets the
  // table see live tallies without letting late voters game earlier ballots.
  if (choice.tablePicksVotes?.[player.id]) return { kind: "ignore" };

  if (!choice.tablePicksVotes) choice.tablePicksVotes = {};
  choice.tablePicksVotes[player.id] = indexes;

  const eligibleVoters = state.players.filter((p) => p.id !== target.playerId);
  const allVoted = eligibleVoters.every((p) => {
    if (!p.connected || p.isBot) return true;
    return Boolean(choice.tablePicksVotes?.[p.id]);
  });
  if (allVoted) {
    for (const p of eligibleVoters) {
      if (choice.tablePicksVotes?.[p.id]) continue;
      const sortedAsc = target.cards
        .map((card, i) => ({ i, rankIdx: RANK_ORDER.indexOf(card.rank) }))
        .sort((a, b) => a.rankIdx - b.rankIdx)
        .map((entry) => entry.i)
        .slice(0, keep)
        .sort((a, b) => a - b);
      if (!choice.tablePicksVotes) choice.tablePicksVotes = {};
      choice.tablePicksVotes[p.id] = sortedAsc;
    }
    const tally = new Map<number, number>();
    for (const ballot of Object.values(choice.tablePicksVotes ?? {})) {
      for (const idx of ballot) incrementMapCount(tally, idx);
    }
    const winners = Array.from(tally.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0] - b[0];
      })
      .slice(0, keep)
      .map(([idx]) => idx)
      .sort((a, b) => a - b);
    choice.selectedIndexes = winners.length === keep
      ? winners
      : fallbackKeepIndexes(target.cards, keep);
    choice.submitted = true;
  }

  if (allDealChoicesReady(state)) finishDealChoicePhase(state);
  return { kind: "broadcast" };
};

export const draftFlopCard: Handler = (state, player, msg) => {
  if (msg.type !== "draftFlopCard") return { kind: "ignore" };
  if (state.phase !== "flop") return { kind: "ignore" };
  if (state.phaseSubstep !== "flopDraftPending") return { kind: "ignore" };

  const pool = state.flopDraftPool;
  if (!pool) return { kind: "ignore" };
  if (!Number.isInteger(msg.poolCardIndex)) return { kind: "ignore" };
  if (!pool.remainingIndexes.includes(msg.poolCardIndex)) return { kind: "ignore" };

  if ((pool.draftedBy[player.id]?.length ?? 0) >= 1) return { kind: "ignore" };

  const card = pool.cards[msg.poolCardIndex];
  if (!card) return { kind: "ignore" };

  const firstHandByPlayer = new Map<string, StateHand>();
  for (const h of state.hands) {
    if (!firstHandByPlayer.has(h.playerId)) firstHandByPlayer.set(h.playerId, h);
  }
  const targetHand = firstHandByPlayer.get(player.id);
  if (!targetHand) return { kind: "ignore" };
  targetHand.cards.push(card);
  targetHand.cardCount = targetHand.cards.length;

  pool.remainingIndexes = pool.remainingIndexes.filter((i) => i !== msg.poolCardIndex);
  pool.draftedBy[player.id] = [msg.poolCardIndex];

  for (const p of state.players) {
    if ((pool.draftedBy[p.id]?.length ?? 0) >= 1) continue;
    if (!p.isBot && p.connected) continue;
    const pick = pool.remainingIndexes[0];
    if (pick === undefined) break;
    const botHand = firstHandByPlayer.get(p.id);
    if (!botHand) continue;
    botHand.cards.push(pool.cards[pick]);
    botHand.cardCount = botHand.cards.length;
    pool.remainingIndexes = pool.remainingIndexes.filter((i) => i !== pick);
    pool.draftedBy[p.id] = [pick];
  }

  const allDrafted = state.players.every((p) => (pool.draftedBy[p.id]?.length ?? 0) >= 1);
  if (allDrafted) {
    const finalFlop = filterDefined(pool.remainingIndexes.map((i) => pool.cards[i]));
    // 6-card pool → 3-card flop; preserve the unrevealed turn/river tail.
    const tail = state.allCommunityCards.slice(6);
    state.allCommunityCards = finalFlop.concat(tail);
    state.phaseSubstep = undefined;
    state.flopDraftPool = undefined;
    state.mutationVersion++;
  }
  return { kind: "broadcast" };
};

// -------- Internal helpers ----------------------------------------------

function normalizeIndexes(indexes: readonly number[], cardCount: number): number[] {
  const unique = new Set<number>();
  for (const index of indexes) {
    if (!Number.isInteger(index) || index < 0 || index >= cardCount) continue;
    unique.add(index);
  }
  return [...unique].sort((a, b) => a - b);
}

function allDealChoicesReady(state: ServerGameState): boolean {
  for (const hand of state.hands) {
    const choice = state.dealChoices[hand.id];
    if (!choice) continue;
    if (choice.submitted) continue;
    const owner = state.players.find((candidate) => candidate.id === hand.playerId);
    if (owner?.connected && !owner.isBot) return false;
  }
  return true;
}

function finishDealChoicePhase(state: ServerGameState): void {
  const mode = getGameModeDefinition(state.modeId);
  const variant = resolveDealChoiceVariant(mode);

  // Dispatch the per-variant finalize via the registry; falls back to the
  // standard keep behaviour if a variant somehow slipped past registration.
  const handler = dealChoiceVariantRegistry[variant];
  if (handler) handler.apply(state);
  else applyStandardKeep(state);

  // Capture opted hands before `state.dealChoices` is wiped — the reveal-phase
  // penalty reads `state.optedHandIds` to know which hands to bump.
  if (variant === "optInHole3WithPenalty") {
    const opted: string[] = [];
    for (const hand of state.hands) {
      if (state.dealChoices[hand.id]?.optedThirdHole) opted.push(hand.id);
    }
    state.optedHandIds = opted;
  }

  state.dealChoices = {};
  state.dealDeck = [];
  state.auctionPool = undefined;
  state.ranking = Array(state.hands.length).fill(null);
  state.acquireRequests = [];
  state.communityCards = [];
  state.phase = "preflop";
  state.phaseStartedAt = Date.now();
  for (const p of state.players) p.ready = false;
}
