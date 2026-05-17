import type { Card, ModeInfo, Phase } from "../../src/lib/types";
import { getGameModeDefinition, type InfoFeatureId } from "../../src/lib/gameMode";
import { ALL_PHASES } from "../../src/lib/phases";
import { findHandById, findPlayerById, incrementMapCount, leftNeighbor } from "../../src/lib/utils";
import type { ServerGameState } from "../state";
import { narrativeSpecs } from "./infoNarrativeSpecs";

type InfoFeatureHandler = (state: ServerGameState, phase: Phase) => ModeInfo[];

const featureHandlers: Partial<Record<InfoFeatureId, InfoFeatureHandler>> = {
  "deck-count": (state, phase) => fact("deck-count", "Deck", `${state.dealDeck.length} cards remain`, phase),
  "suit-census": (state, phase) => fact("suit-census", "Suits", suitCounts(state.dealDeck), phase),
  "rank-census": (state, phase) => fact("rank-census", "Ranks", rankCounts(state.dealDeck), phase),
  "burn-reveal": (state, phase) => fact("burn-reveal", "Burn", cardList(state.burnCards), phase),
  "hint-card": (state, phase) => phase === "turn" ? fact("hint-card", "Hint", cardList(state.dealDeck.slice(0, 1)), phase) : [],
  "lying-mirror": (state, phase) => phase === "flop" ? fact("lying-mirror", "Mirror", `Fake flop: ${cardList(state.dealDeck.slice(0, 3))}`, phase) : [],
  "sample-draw": (state, phase) => phase === "river" ? fact("sample-draw", "Sample", cardList(state.dealDeck.slice(0, 3)), phase) : [],
  "late-hand-reveal": (_state, phase) => phase === "river" ? fact("late-hand-reveal", "Reveal", "All hole cards are now public", phase) : [],
  "tell": (state, phase) => rat("tell", subjectHand(state, phase)?.id ?? "table", tellFact(state), phase),
  "card-whisper-network": (state, phase) => rat("card-whisper-network", subjectHand(state, phase)?.id ?? "table", tellFact(state), phase),
  "card-whisper": (state, phase) => phase === "river" ? rat("card-whisper", subjectHand(state, phase)?.id ?? "table", tellFact(state), phase) : [],
  "suit-whisper": (state, phase) => fact("suit-whisper", "Suit Whisper", missingSuitWhisper(state), phase),
  "rank-whisper": (state, phase) => fact("rank-whisper", "Rank Whisper", missingRankWhisper(state), phase),
  "heat-map": (state, phase) => fact("heat-map", "Heat", deckHeat(state.dealDeck), phase),
  "suit-heat": (state, phase) => fact("suit-heat", "Suit Heat", suitHeat(state.dealDeck), phase),
  "phantom-card": (state, phase) => fact("phantom-card", "Phantom", state.dealDeck[0] === undefined ? "No phantom rank available" : `${state.dealDeck[0].rank} is not in at least one hand`, phase),
  "past-trace": (state, phase) => fact("past-trace", "Trace", state.lastHandSummary?.names.join(", ") ?? "No prior hand trace in this room yet", phase),
  "card-karma": (state, phase) => {
    const top = state.lastHandSummary?.names[0];
    return fact(
      "card-karma",
      "Karma",
      top ? `Karma carries forward: ${top} took the prior hand` : "No prior hand yet",
      phase,
    );
  },
  "card-marriage": (_state, phase) =>
    fact("card-marriage", "Marriage", "Adjacent hole cards are wedded and score as a synthetic pair", phase),
  "reality-skip": (state, phase) =>
    phase === "turn"
      ? fact("reality-skip", "Skip", `Future glimpse: ${cardList(state.dealDeck.slice(0, 3))}`, phase)
      : [],
  "card-inheritance": (_state, phase) =>
    fact("card-inheritance", "Inheritance", "One hole card is kept; the other came from your right neighbor's discard", phase),
  "card-theatre": (state, phase) => fact("card-theatre", "Theatre", theatreClue(state, phase), phase),
  "card-conscience": (state, phase) => fact("card-conscience", "Conscience", conscienceRank(state), phase),
  "decoy": (_state, phase) => fact("decoy", "Decoy", "One table card is a decoy and does not score", phase),
  "card-decoy": (_state, phase) => fact("card-decoy", "Decoy", "One visible community card does not score", phase),
  "schrodingers-hole": (_state, phase) => fact("schrodingers-hole", "Schrodinger", phase === "reveal" ? "Hole-card identities have collapsed" : "Hole cards have unresolved alternate identities", phase),
  "schrodingers-board": (_state, phase) => fact("schrodingers-board", "Board", phase === "reveal" ? "Board identities have collapsed" : "The board has unresolved alternate identities", phase),
  "probability-cloud": (_state, phase) => fact("probability-cloud", "Cloud", "Board cards have possible alternate identities", phase),
  "holographic-card": (_state, phase) => fact("holographic-card", "Holo", "A community card may be seen as multiple identities", phase),
  "reality-tear": (_state, phase) => fact("reality-tear", "Tear", "Cards can hold alternate identities", phase),
  "drunken-display": (_state, phase) => fact("drunken-display", "Drunken", "Cards wobble through possible identities", phase),
  "mirror-hand": (_state, phase) => fact("mirror-hand", "Mirror Hand", "Hands carry mirrored possible identities", phase),
  "telepathic-river": (_state, phase) => phase === "river" ? fact("telepathic-river", "Telepathy", "A neighbor's hole card feels high or low", phase) : [],
  "spotlight": (state, phase) => {
    const hand = state.hands[phaseIndex(phase) % Math.max(1, state.hands.length)];
    return fact("spotlight", "Spotlight", hand ? `${playerName(state, hand)}: ${cardList(hand.cards.slice(0, 1))}` : `Rotating public hand for ${phase}`, phase);
  },
  "half-lit-holes": (_state, phase) => fact("half-lit-holes", "Half-Lit", `Visible slot alternates on ${phase}`, phase),
  "mirror-hole": (state, phase) => neighborHoleAnnouncements("mirror-hole", "Mirror", state, phase, 1),
  "group-mind": (_state, phase) => fact("group-mind", "Group", `Shared hole-card slot for ${phase}`, phase),
  "tag-team": (state, phase) => neighborHoleAnnouncements("tag-team", "Tag", state, phase, 2),
  "whisper-chain": (state, phase) => neighborHoleAnnouncements("whisper-chain", "Whisper", state, phase, 1),
  "periscope": (state, phase) => phase === "river" ? neighborHoleAnnouncements("periscope", "Periscope", state, phase, 1) : [],
  "smoke-hole": (_state, phase) => fact("smoke-hole", "Smoke", phase === "preflop" || phase === "flop" ? "Hole cards show suits only" : "Hole cards are clear", phase),
  "communal-glance": (_state, phase) => fact("communal-glance", "Glance", "One hole-card slot is shared by the table", phase),
  "wild-rank-roulette": (state, phase) => {
    const mode = getGameModeDefinition(state.modeId);
    const ranks = mode.wildCardsByPhase?.[phase]?.ranks;
    const value = ranks && ranks.length > 0
      ? `Wild rank: ${ranks.join(", ")}${phase === "reveal" ? " (counts for scoring)" : ""}`
      : "No wild rank this street";
    return fact("wild-rank-roulette", "Roulette", value, phase);
  },
  "meta-legend": (state, phase) => {
    // Surface the target meta card identity so players can preflop-track who's
    // holding it. Identity is computed once at deal time and stored on state;
    // the chip just reads it back.
    const card = state.metaTargetCard;
    const kind = state.metaKind;
    if (!card || !kind) {
      return fact("meta-legend", "Watch for", `a ${kind ?? "special"} card`, phase);
    }
    return fact(
      "meta-legend",
      "Watch for",
      `${card.rank}${card.suit} (${kind})`,
      phase,
    );
  },
};

const narrativeIds = Object.keys(narrativeSpecs) as InfoFeatureId[];

for (const id of narrativeIds) {
  featureHandlers[id] = (state: ServerGameState, phase: Phase) => narrativeChip(id, state, phase);
}

export function applyModeInfoFeatures(state: ServerGameState, phase: Phase): ModeInfo[] {
  const mode = getGameModeDefinition(state.modeId);
  return (mode.infoFeatures ?? []).flatMap((id) => featureHandlers[id]?.(state, phase) ?? genericInfo(id, state, phase));
}

function narrativeChip(id: InfoFeatureId, _state: ServerGameState, phase: Phase): ModeInfo[] {
  const spec = narrativeSpecs[id];
  if (!spec) return genericInfo(id, _state, phase);
  const value = spec.text[phase] ?? spec.fallback ?? "";
  if (!value) return genericInfo(id, _state, phase);
  return fact(id, spec.label, value, phase);
}

function fact(id: string, label: string, value: string, phase: Phase): ModeInfo[] {
  return [{ kind: "fact", id, label, value, payload: value, phase }];
}

function rat(id: string, aboutId: string, text: string, phase: Phase): ModeInfo[] {
  return [{ kind: "rat", id, aboutId, text, label: "Tell", value: text, phase }];
}

function announce(id: string, label: string, text: string, recipientId: string, phase: Phase): ModeInfo {
  return { kind: "announce", id, label, value: text, text, audience: "player", recipientId, phase };
}

function neighborHoleAnnouncements(id: InfoFeatureId, label: string, state: ServerGameState, phase: Phase, cardCount: number): ModeInfo[] {
  const players = state.players;
  if (players.length === 0) return [];
  return players.flatMap((player, index) => {
    const neighbor = leftNeighbor(players, index);
    const hand = state.hands.find((candidate) => candidate.playerId === neighbor.id);
    if (!hand) return [];
    return [announce(id, label, `${neighbor.name}: ${cardList(hand.cards.slice(0, cardCount))}`, player.id, phase)];
  });
}

function genericInfo(id: InfoFeatureId, state: ServerGameState, phase: Phase): ModeInfo[] {
  const mode = getGameModeDefinition(state.modeId);
  const value = mode.summary || `active on ${phase}`;
  return fact(id, labelFromId(id), value, phase);
}

/** Resolve a player-facing name for a hand, falling back if no matching player. */
function playerName(state: ServerGameState, hand: { playerId?: string; id: string }): string {
  if (hand.playerId) {
    const player = findPlayerById(state.players, hand.playerId);
    if (player) return player.name;
  }
  const index = state.hands.findIndex((h) => h.id === hand.id);
  return index >= 0 ? `Hand ${index + 1}` : "Hand";
}

/** Rotate which hand is the subject of a rat-style tell across phases. */
function subjectHand(state: ServerGameState, phase: Phase): { id: string; playerId?: string } | undefined {
  if (state.hands.length === 0) return undefined;
  return state.hands[phaseIndex(phase) % state.hands.length];
}

function labelFromId(id: string): string {
  return id.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function phaseIndex(phase: Phase): number {
  return Math.max(0, ALL_PHASES.indexOf(phase));
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

function theatreClue(state: ServerGameState, phase: Phase): string {
  const hand = subjectHand(state, phase);
  if (!hand) return "The stage is empty";
  const live = findHandById(state.hands, hand.id);
  if (!live || live.cards.length === 0) return `${playerName(state, hand)} steps onstage`;
  const suits = new Map<string, number>();
  for (const c of live.cards) incrementMapCount(suits, c.suit);
  const suitNote = Array.from(suits.entries()).map(([s, n]) => `${n}${s}`).join(" ");
  const ranks = live.cards.map((c) => c.rank).join(",");
  return `${playerName(state, hand)} reads as ${ranks} (${suitNote})`;
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

function missingSuitWhisper(state: ServerGameState): string {
  const suits: Card["suit"][] = ["H", "D", "C", "S"];
  for (const hand of state.hands) {
    const present = new Set(hand.cards.map((card) => card.suit));
    const missing = suits.find((suit) => !present.has(suit));
    if (missing !== undefined) return `${playerName(state, hand)} does not hold ${missing}`;
  }
  return "Every sampled hand covers all suits";
}

function missingRankWhisper(state: ServerGameState): string {
  const ranks: Card["rank"][] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  for (const hand of state.hands) {
    const present = new Set(hand.cards.map((card) => card.rank));
    const missing = ranks.find((rank) => !present.has(rank));
    if (missing !== undefined) return `${playerName(state, hand)} does not hold ${missing}`;
  }
  return "No missing rank hint available";
}

function rankValue(rank: Card["rank"]): number {
  const values: Record<Card["rank"], number> = { "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };
  return values[rank];
}

function suitCounts(cards: readonly Card[]): string {
  const counts = { H: 0, D: 0, C: 0, S: 0 };
  for (const card of cards) counts[card.suit]++;
  return `H${counts.H} D${counts.D} C${counts.C} S${counts.S}`;
}

function rankCounts(cards: readonly Card[]): string {
  const counts = new Map<string, number>();
  for (const card of cards) incrementMapCount(counts, card.rank);
  return Array.from(counts.entries()).map(([rank, count]) => `${rank}${count}`).join(" ");
}

function cardList(cards: readonly Card[]): string {
  return cards.length === 0 ? "none" : cards.map((card) => `${card.rank}${card.suit}`).join(" ");
}
