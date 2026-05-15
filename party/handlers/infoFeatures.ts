import type { Card, ModeInfo, Phase } from "../../src/lib/types";
import { getGameModeDefinition, type InfoFeatureId } from "../../src/lib/gameMode";
import type { ServerGameState } from "../state";

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

/**
 * Per-feature label + phase-keyed chip text for modes whose info chip is a
 * narrative reminder of the rule rather than a live measurement. Each entry
 * lists what the player sees at the four play phases (preflop/flop/turn/
 * river) and at reveal. Authored from the catalog summaries so the chip
 * always reads as a specific promise of the mode's mechanic.
 */
const narrativeSpecs: Partial<Record<InfoFeatureId, { label: string; text: Partial<Record<Phase, string>>; fallback?: string }>> = {
  earthquake: { label: "Quake", fallback: "Board scrambles when turn arrives", text: {
    preflop: "Board scrambles when turn arrives",
    flop: "Board scrambles when turn arrives",
    turn: "Board just scrambled into a new order",
    river: "Board reordered at turn",
    reveal: "Board reordered at turn",
  } },
  tornado: { label: "Tornado", fallback: "Hole cards rotate clockwise at turn", text: {
    preflop: "Hole cards rotate clockwise at turn",
    flop: "Hole cards rotate clockwise at turn",
    turn: "Hole cards just rotated clockwise",
    river: "Hole cards rotated at turn",
    reveal: "Hole cards rotated at turn",
  } },
  lightning: { label: "Lightning", fallback: "Top hole card jumps +1 rank at river", text: {
    preflop: "First hole card climbs +1 rank at river",
    flop: "First hole card climbs +1 rank at river",
    turn: "First hole card climbs +1 rank at river",
    river: "First hole card just climbed +1 rank",
    reveal: "First hole card climbed +1 rank at river",
  } },
  flood: { label: "Flood", fallback: "2/3/4/5 play as wild at reveal", text: {
    preflop: "2, 3, 4, 5 play as wild at reveal",
    flop: "2, 3, 4, 5 play as wild at reveal",
    turn: "2, 3, 4, 5 play as wild at reveal",
    river: "2, 3, 4, 5 play as wild at reveal",
    reveal: "2/3/4/5 are wild for scoring",
  } },
  drought: { label: "Drought", fallback: "Face cards wiped from board at turn", text: {
    preflop: "Face cards wiped from board at turn",
    flop: "Face cards wiped from board at turn",
    turn: "Face cards just wiped from board",
    river: "Face cards wiped from board at turn",
    reveal: "Face cards wiped from board at turn",
  } },
  plague: { label: "Plague", fallback: "Sevens wiped from board at turn", text: {
    preflop: "Sevens wiped from board at turn",
    flop: "Sevens wiped from board at turn",
    turn: "Sevens just wiped from board",
    river: "Sevens wiped from board at turn",
    reveal: "Sevens wiped from board at turn",
  } },
  "solar-flare": { label: "Flare", fallback: "All suits reassign at turn", text: {
    preflop: "All suits reassign on a cycle at turn",
    flop: "All suits reassign on a cycle at turn",
    turn: "Every suit just reassigned",
    river: "Suits reassigned at turn",
    reveal: "Suits reassigned at turn",
  } },
  meteor: { label: "Meteor", fallback: "One visible board card swapped at turn", text: {
    preflop: "One visible board card is replaced at turn",
    flop: "One visible board card is replaced at turn",
    turn: "Board card just struck out and replaced",
    river: "One board card was swapped at turn",
    reveal: "One board card was swapped at turn",
  } },
  "mirror-universe": { label: "Mirror U", fallback: "Every rank inverts at river", text: {
    preflop: "Every rank inverts at river (A↔2, K↔3, …)",
    flop: "Every rank inverts at river (A↔2, K↔3, …)",
    turn: "Every rank inverts at river (A↔2, K↔3, …)",
    river: "Ranks just inverted across hands and board",
    reveal: "Ranks inverted at river",
  } },
  wildfire: { label: "Wildfire", fallback: "River neighbor ranks burn out", text: {
    preflop: "River-adjacent ranks burn out at river",
    flop: "River-adjacent ranks burn out at river",
    turn: "River-adjacent ranks burn out at river",
    river: "Ranks adjacent to river just burned out",
    reveal: "River-adjacent ranks were removed",
  } },
  avalanche: { label: "Avalanche", fallback: "Board grows to 7 cards by river", text: {
    preflop: "Board grows to 7 cards by river",
    flop: "Flop (3); board grows to 7 by river",
    turn: "5 cards; board grows to 7 at river",
    river: "Board is 7 cards wide this hand",
    reveal: "Seven-card board scored",
  } },
  "storm-surge": { label: "Surge", fallback: "Oldest board card sweeps off each street", text: {
    preflop: "Each street, the oldest board card is swept off",
    flop: "Flop dropped its first card; turn drops another",
    turn: "Turn just dropped another oldest board card",
    river: "River swept the next oldest board card",
    reveal: "Board kept shifting forward each street",
  } },
  static: { label: "Static", fallback: "Board suits scramble each street", text: {
    preflop: "Each street, board-card suits scramble (ranks lock)",
    flop: "Flop suits just scrambled (ranks lock)",
    turn: "Turn just scrambled board suits again",
    river: "River just scrambled board suits again",
    reveal: "Board ranks locked; suits scrambled each street",
  } },
  wormhole: { label: "Wormhole", fallback: "Seats 1 & 2 swap one card at river", text: {
    preflop: "Seats 1 & 2 swap their first hole cards at river",
    flop: "Seats 1 & 2 swap their first hole cards at river",
    turn: "Seats 1 & 2 swap their first hole cards at river",
    river: "Seats 1 & 2 just swapped first hole cards",
    reveal: "Seats 1 & 2 swapped first hole cards at river",
  } },
  "black-hole": { label: "Black Hole", fallback: "Last board card vanishes at river", text: {
    preflop: "Last board card disappears at river (4-card board)",
    flop: "Last board card disappears at river (4-card board)",
    turn: "Last board card disappears at river (4-card board)",
    river: "Last board card just vanished into the void",
    reveal: "Final board is 4 cards (last vanished at river)",
  } },
  "gravity-well": { label: "Gravity", fallback: "Top hole card climbs +1 at river", text: {
    preflop: "Highest hole card climbs +1 rank at river",
    flop: "Highest hole card climbs +1 rank at river",
    turn: "Highest hole card climbs +1 rank at river",
    river: "Highest hole card just climbed +1 rank",
    reveal: "Highest hole card climbed +1 rank at river",
  } },
  "heat-wave": { label: "Heat W", fallback: "Face cards become Aces at turn", text: {
    preflop: "All face cards (J/Q/K) become Aces at turn",
    flop: "All face cards (J/Q/K) become Aces at turn",
    turn: "Face cards just converted to Aces",
    river: "Face cards converted to Aces at turn",
    reveal: "Face cards became Aces at turn",
  } },
  "cold-snap": { label: "Cold", fallback: "Face cards become 2s at turn", text: {
    preflop: "All face cards (J/Q/K) become 2s at turn",
    flop: "All face cards (J/Q/K) become 2s at turn",
    turn: "Face cards just converted to 2s",
    river: "Face cards converted to 2s at turn",
    reveal: "Face cards became 2s at turn",
  } },
  "fog-bank": { label: "Fog", fallback: "Board shows color only until reveal", text: {
    preflop: "Board will show color only until reveal",
    flop: "Board shows color only — ranks and suits hidden",
    turn: "Board shows color only — ranks and suits hidden",
    river: "Board shows color only — ranks and suits hidden",
    reveal: "Board cleared up — full identities scored",
  } },
  rainstorm: { label: "Rain", fallback: "One board card replaced each street", text: {
    preflop: "One board card is replaced each street",
    flop: "Flop replaced one board card; more replacements coming",
    turn: "Turn replaced one board card; another comes at river",
    river: "River replaced one more board card",
    reveal: "Three board cards were replaced across streets",
  } },
  aurora: { label: "Aurora", fallback: "Suits reassign at river", text: {
    preflop: "All suits reassign on a cycle at river",
    flop: "All suits reassign on a cycle at river",
    turn: "All suits reassign on a cycle at river",
    river: "Every suit just reassigned",
    reveal: "Suits reassigned at river",
  } },
  hurricane: { label: "Hurricane", fallback: "Every hand loses one hole card at river", text: {
    preflop: "Every hand loses its last hole card at river",
    flop: "Every hand loses its last hole card at river",
    turn: "Every hand loses its last hole card at river",
    river: "Every hand just lost its last hole card",
    reveal: "Every hand lost a hole card at river",
  } },
  "ice-age": { label: "Ice", fallback: "Even ranks (and T, Q) frozen out", text: {
    preflop: "Even ranks (2/4/6/8/T/Q) do not score",
    flop: "Even ranks (2/4/6/8/T/Q) do not score",
    turn: "Even ranks (2/4/6/8/T/Q) do not score",
    river: "Even ranks (2/4/6/8/T/Q) do not score",
    reveal: "Even ranks (2/4/6/8/T/Q) excluded from scoring",
  } },
  volcano: { label: "Volcano", fallback: "First hole card destroyed at river", text: {
    preflop: "First hole card in each hand is destroyed at river",
    flop: "First hole card in each hand is destroyed at river",
    turn: "First hole card in each hand is destroyed at river",
    river: "First hole card in each hand just got destroyed",
    reveal: "First hole card destroyed at river",
  } },
  "quantum-shuffle": { label: "Quantum", fallback: "All hole cards redistributed at turn", text: {
    preflop: "All hole cards get gathered and redealt at turn",
    flop: "All hole cards get gathered and redealt at turn",
    turn: "Hole cards just gathered, shuffled, and redealt",
    river: "Hole cards were reshuffled at turn",
    reveal: "Hole cards were reshuffled at turn",
  } },
  "quantum-flop": { label: "Q Flop", fallback: "Three flops in play; best scores", text: {
    preflop: "Three 3-card flops will appear; you score against your best",
    flop: "Three 3-card flops in play; you score against the best",
    turn: "Three 3-card boards in play; best scores",
    river: "Three 3-card boards in play; best scores",
    reveal: "Each hand scored against its strongest of three flops",
  } },
  "card-multiverse": { label: "Multiverse", fallback: "Four parallel boards play out; best scores", text: {
    preflop: "Four parallel 5-card boards will play out; best scores",
    flop: "Four 5-card boards in play; you score against the best",
    turn: "Four 5-card boards in play; you score against the best",
    river: "Four 5-card boards in play; you score against the best",
    reveal: "Each hand scored against its strongest of four boards",
  } },
  "identity-crisis": { label: "Crisis", fallback: "Seat 1's first hole swaps with board[0] at turn", text: {
    preflop: "Seat 1's first hole card swaps with board card 1 at turn",
    flop: "Seat 1's first hole card swaps with board card 1 at turn",
    turn: "Seat 1's first hole just swapped with board card 1",
    river: "Seat 1's first hole swapped with board card 1 at turn",
    reveal: "Seat 1's first hole swapped with board card 1 at turn",
  } },
  "photographic-negative": { label: "Negative", fallback: "Board shows color only from turn", text: {
    preflop: "Board shows color only from turn through river",
    flop: "Board readable; goes color-only at turn",
    turn: "Board now shows color only (negative display)",
    river: "Board still color only — ranks/suits hidden",
    reveal: "Board ran color-only from turn through river",
  } },
  synesthesia: { label: "Synesthesia", fallback: "Each street shows a different facet", text: {
    preflop: "Flop=ranks, turn=suits, river=colors; full at reveal",
    flop: "Board shows ranks only this street",
    turn: "Board shows suits only this street",
    river: "Board shows colors only this street",
    reveal: "Full board landed; sensory filters lifted",
  } },
  shapeshifter: { label: "Shifter", fallback: "First board card climbs +1 each street", text: {
    preflop: "First community card climbs +1 rank each street",
    flop: "First community card just climbed +1 rank",
    turn: "First community card climbed again (+1)",
    river: "First community card climbed once more (+1)",
    reveal: "First community card climbed +1 each street",
  } },
  "card-rebellion": { label: "Rebellion", fallback: "Hands rotate one seat clockwise at turn", text: {
    preflop: "Whole hands rotate one seat clockwise at turn",
    flop: "Whole hands rotate one seat clockwise at turn",
    turn: "Hands just rotated one seat clockwise",
    river: "Hands rotated one seat clockwise at turn",
    reveal: "Hands rotated one seat clockwise at turn",
  } },
  "card-festival": { label: "Festival", fallback: "First board card becomes an Ace at river", text: {
    preflop: "First community card becomes an Ace at river",
    flop: "First community card becomes an Ace at river",
    turn: "First community card becomes an Ace at river",
    river: "First community card just became an Ace",
    reveal: "First community card became an Ace at river",
  } },
  "anti-memory": { label: "Anti-Memory", fallback: "Board fades as streets progress", text: {
    preflop: "All 5 board cards visible now; they fade across streets",
    flop: "Only 2 board cards still visible; they keep fading",
    turn: "Only 1 board card visible; river will hide all",
    river: "Board fully hidden until reveal",
    reveal: "Board restored — full truth scored",
  } },
  "photographic-memory": { label: "Photo Mem", fallback: "Flop visible, then board goes dark", text: {
    preflop: "Flop will be visible, then board goes dark at turn",
    flop: "Memorize this flop — board hides at turn",
    turn: "Board hidden — recall the flop you saw",
    river: "Partial board returns (2 cards); flop stays in memory",
    reveal: "Board restored — full truth scored",
  } },
  "memory-hole": { label: "Mem Hole", fallback: "Slot 0 swapped at turn, then hidden", text: {
    preflop: "One board card will be swapped and hidden at turn",
    flop: "One board card will be swapped and hidden at turn",
    turn: "Slot 0 just swapped and is now hidden",
    river: "Slot 0 remains hidden until reveal",
    reveal: "Slot 0 was swapped at turn and stays revealed now",
  } },
  "time-echo": { label: "Echo", fallback: "Board reverts to flop at river", text: {
    preflop: "Board will revert to the flop at river",
    flop: "Board will revert to this flop at river",
    turn: "Board will revert to flop at river",
    river: "Board just reverted to the flop",
    reveal: "Final board is the original flop only",
  } },
  "reverse-universe": { label: "Reverse U", fallback: "Table and board reverse at river", text: {
    preflop: "Table and board order will reverse at river",
    flop: "Table and board order will reverse at river",
    turn: "Table and board order will reverse at river",
    river: "Table and board order just reversed",
    reveal: "Table and board ran reversed from river",
  } },
  "card-singularity": { label: "Singularity", fallback: "Hand collapses to one averaged card at turn", text: {
    preflop: "Each hand's two holes collapse into one averaged card at turn",
    flop: "Each hand's two holes collapse into one averaged card at turn",
    turn: "Each hand just collapsed to a single averaged card",
    river: "Hands ran as single averaged cards from turn",
    reveal: "Hands ran as single averaged cards from turn",
  } },
  "glitch-wars": { label: "Glitch Wars", fallback: "Board[0] eats board[1]'s suit at turn", text: {
    preflop: "Board card 1 will absorb board card 2's suit at turn",
    flop: "Board card 1 will absorb board card 2's suit at turn",
    turn: "Board card 1 just absorbed board card 2's suit",
    river: "Board card 1 took board card 2's suit at turn",
    reveal: "Board card 1 took board card 2's suit at turn",
  } },
  "card-convergence": { label: "Converge", fallback: "Every 7 becomes an Ace at river", text: {
    preflop: "Every 7 in play will become an Ace at river",
    flop: "Every 7 in play will become an Ace at river",
    turn: "Every 7 in play will become an Ace at river",
    river: "Every 7 just converged into an Ace",
    reveal: "Sevens converged to Aces at river",
  } },
  "card-halo": { label: "Halo", fallback: "Adjacent ranks score as synthetic pair", text: {
    preflop: "Adjacent-rank cards score as a synthetic pair at reveal",
    flop: "Adjacent-rank cards score as a synthetic pair at reveal",
    turn: "Adjacent-rank cards score as a synthetic pair at reveal",
    river: "Adjacent-rank cards score as a synthetic pair at reveal",
    reveal: "Adjacent-rank cards counted as a synthetic pair",
  } },
  "card-vortex": { label: "Vortex", fallback: "Hole-card ranks rotate across hands at turn", text: {
    preflop: "Hole-card ranks rotate across hands at turn (suits stay)",
    flop: "Hole-card ranks rotate across hands at turn (suits stay)",
    turn: "Hole-card ranks just rotated across hands; suits stayed",
    river: "Hole-card ranks rotated across hands at turn",
    reveal: "Hole-card ranks rotated across hands at turn",
  } },
  "card-eclipse-total": { label: "Eclipse T", fallback: "Highest rank in play vanishes at river", text: {
    preflop: "Highest rank in play disappears at river",
    flop: "Highest rank in play disappears at river",
    turn: "Highest rank in play disappears at river",
    river: "Highest rank in play just vanished",
    reveal: "Highest rank in play was wiped at river",
  } },
  "card-plague-spread": { label: "Spread", fallback: "One more card becomes a 7 each street", text: {
    preflop: "Each street, one more card converts to a 7",
    flop: "Flop just converted one card to a 7",
    turn: "Turn converted another card to a 7",
    river: "River converted yet another card to a 7",
    reveal: "Sevens spread one new card per street",
  } },
  "card-diaspora": { label: "Diaspora", fallback: "First hole card rotates seats at turn", text: {
    preflop: "Each hand's first hole card rotates one seat at turn",
    flop: "Each hand's first hole card rotates one seat at turn",
    turn: "First hole cards just rotated one seat",
    river: "First hole cards rotated at turn",
    reveal: "First hole cards rotated at turn",
  } },
  "card-soup": { label: "Soup", fallback: "Holes + burn mix and redeal at turn", text: {
    preflop: "Hole cards mix with the burn pile and redeal at turn",
    flop: "Hole cards mix with the burn pile and redeal at turn",
    turn: "Holes and burn just mixed and redealt",
    river: "Holes and burn mixed and redealt at turn",
    reveal: "Holes and burn mixed and redealt at turn",
  } },
  "card-madness": { label: "Madness", fallback: "Every card rotates one slot at turn", text: {
    preflop: "Every card rotates one position through a shared stream at turn",
    flop: "Every card rotates one position through a shared stream at turn",
    turn: "Every card just rotated one position",
    river: "Every card rotated at turn",
    reveal: "Every card rotated one position at turn",
  } },
  "card-tide": { label: "Tide", fallback: "All ranks drift +1 each street", text: {
    preflop: "All ranks drift +1 every street",
    flop: "Flop just drifted every rank +1",
    turn: "Turn drifted every rank +1 again",
    river: "River drifted every rank +1 again",
    reveal: "All ranks drifted +1 each street",
  } },
  "card-drift": { label: "Drift", fallback: "Hole ranks drift +1 each street", text: {
    preflop: "Hole-card ranks drift +1 every street",
    flop: "Flop drifted all hole-card ranks +1",
    turn: "Turn drifted all hole-card ranks +1 again",
    river: "River drifted all hole-card ranks +1 again",
    reveal: "Hole ranks drifted +1 each street",
  } },
  "recursive-board": { label: "Recursive", fallback: "Board mirrors itself at turn (10 displayed)", text: {
    preflop: "Board mirrors itself at turn (10 displayed; 5 score)",
    flop: "Board mirrors itself at turn (10 displayed; 5 score)",
    turn: "Board just mirrored — 10 cards shown, top 5 score",
    river: "Board mirrored at turn — top 5 score",
    reveal: "Board mirrored at turn — top 5 cards scored",
  } },
  "twin-universes": { label: "Twin U", fallback: "Two boards in play; best scores", text: {
    preflop: "Two parallel boards will play out; best scores",
    flop: "First board visible; second board (vault) opens at turn",
    turn: "Both boards in play; you score against the better one",
    river: "Both boards in play; you score against the better one",
    reveal: "Each hand scored against its better of two boards",
  } },
  "mirror-world": { label: "M World", fallback: "Two mirrored boards; best scores", text: {
    preflop: "Two mirrored boards will play out; best scores",
    flop: "First board (5) visible; mirror opens at river",
    turn: "First board visible; mirror opens at river",
    river: "Both boards in play; better board scores",
    reveal: "Each hand scored against its better of two boards",
  } },
  "card-constellation": { label: "Constellation", fallback: "Every 7 plays as wild at reveal", text: {
    preflop: "Every 7 plays as wild at reveal",
    flop: "Every 7 plays as wild at reveal",
    turn: "Every 7 plays as wild at reveal",
    river: "Every 7 plays as wild at reveal",
    reveal: "Sevens were wild for scoring",
  } },
  "card-resurrection": { label: "Resurrect", fallback: "Discards rejoin community at reveal", text: {
    preflop: "Dealt 3, kept 2; each discard reappears as a community card at reveal",
    flop: "Discards reappear as community cards at reveal",
    turn: "Discards reappear as community cards at reveal",
    river: "Discards reappear as community cards at reveal",
    reveal: "Discards joined the community board",
  } },
  "card-memorial": { label: "Memorial", fallback: "Sixth memorial card joins at reveal", text: {
    preflop: "Board grows 3→4→5; a 6th memorial card joins at reveal (5 score)",
    flop: "Flop dealt 3; board grows to 4 at turn, 5 at river, 6 at reveal",
    turn: "Board now 4; 5 at river, plus a memorial card at reveal",
    river: "Board now 5; a memorial 6th card joins at reveal",
    reveal: "Memorial sixth card landed; top 5 scored",
  } },
  "hex-card": { label: "Hex", fallback: "Hexed hand finishes last", text: {
    preflop: "Whichever hand holds the hex card finishes last",
    flop: "Whichever hand holds the hex card finishes last",
    turn: "Whichever hand holds the hex card finishes last",
    river: "Whichever hand holds the hex card finishes last",
    reveal: "The hexed hand finished last regardless of cards",
  } },
  "blessed-card-absolute": { label: "Bless Abs", fallback: "Blessed hand finishes first", text: {
    preflop: "Whichever hand holds the blessed card finishes first",
    flop: "Whichever hand holds the blessed card finishes first",
    turn: "Whichever hand holds the blessed card finishes first",
    river: "Whichever hand holds the blessed card finishes first",
    reveal: "The blessed hand finished first regardless of cards",
  } },
  "doomsday-card": { label: "Doomsday", fallback: "All ranks invert at river", text: {
    preflop: "All ranks invert at river (A↔2, K↔3, …)",
    flop: "All ranks invert at river (A↔2, K↔3, …)",
    turn: "All ranks invert at river (A↔2, K↔3, …)",
    river: "Doomsday just inverted every rank in play",
    reveal: "All ranks inverted at river",
  } },
  "card-cipher": { label: "Cipher", fallback: "Ranks shift by river's value", text: {
    preflop: "All ranks shift by the river card's rank index when river arrives",
    flop: "All ranks shift by the river card's rank index when river arrives",
    turn: "All ranks shift by the river card's rank index when river arrives",
    river: "Cipher just shifted every rank by the river's index",
    reveal: "Ranks were ciphered by the river's index",
  } },
  "card-static": { label: "C Static", fallback: "First hole + first board climb each street", text: {
    preflop: "First hole card and first board card climb +1 each street",
    flop: "Flop bumped the first hole and first board card +1",
    turn: "Turn bumped them again +1",
    river: "River bumped them once more +1",
    reveal: "First hole and first board climbed +1 each street",
  } },
  "cell-division": { label: "Division", fallback: "Hands split at reveal", text: {
    preflop: "Each two-card hand will split into two one-card hands at reveal",
    flop: "Each two-card hand will split into two one-card hands at reveal",
    turn: "Each two-card hand will split into two one-card hands at reveal",
    river: "Each two-card hand will split into two one-card hands at reveal",
    reveal: "Hands just split — ranking spans the split hands",
  } },
  "card-schism": { label: "Schism", fallback: "Deck keeps only high ranks from turn", text: {
    preflop: "From turn on, only the deck's high half stays in play",
    flop: "From turn on, only the deck's high half stays in play",
    turn: "Deck just split — only high ranks remain for later draws",
    river: "Only high ranks remained in deck since turn",
    reveal: "Only high ranks remained in deck since turn",
  } },
  "card-pendulum": { label: "Pendulum", fallback: "Every 7 plays as wild at reveal", text: {
    preflop: "Every 7 plays as wild at reveal",
    flop: "Every 7 plays as wild at reveal",
    turn: "Every 7 plays as wild at reveal",
    river: "Every 7 plays as wild at reveal",
    reveal: "Sevens were wild for scoring",
  } },
  "card-pinball": { label: "Pinball", fallback: "First board + first hole swap each street", text: {
    preflop: "First board card swaps with first hole card every street",
    flop: "Flop just swapped first board with first hole",
    turn: "Turn swapped again — first board ↔ first hole",
    river: "River swapped once more — first board ↔ first hole",
    reveal: "First board ↔ first hole swapped at every street",
  } },
  "doppelganger-deck": { label: "Doppel", fallback: "Deck is doubled — duplicates possible", text: {
    preflop: "Deck is doubled; duplicate cards can appear across hands and board",
    flop: "Deck is doubled; duplicate cards can appear across hands and board",
    turn: "Deck is doubled; duplicate cards can appear across hands and board",
    river: "Deck is doubled; duplicate cards can appear across hands and board",
    reveal: "Doubled deck — duplicates scored normally",
  } },
  "card-lunar": { label: "Lunar", fallback: "Every heart is wild at reveal", text: {
    preflop: "Every heart plays as wild at reveal",
    flop: "Every heart plays as wild at reveal",
    turn: "Every heart plays as wild at reveal",
    river: "Every heart plays as wild at reveal",
    reveal: "Hearts were wild for scoring",
  } },
  pandemonium: { label: "Pandemonium", fallback: "Different chaos every street + superposition", text: {
    preflop: "Flop bumps ranks +1, turn rotates hole ranks, river inverts all ranks",
    flop: "Flop just bumped every rank +1; turn rotates hole ranks next",
    turn: "Turn just rotated hole ranks across hands; river inverts ranks next",
    river: "River just inverted every rank; reveal collapses superpositions",
    reveal: "Pandemonium ran — every card collapsed to best-possible identity",
  } },
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
    const neighbor = players[(index + 1) % players.length];
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
    const player = state.players.find((p) => p.id === hand.playerId);
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
  const phases: readonly Phase[] = ["lobby", "dealChoice", "preflop", "flop", "turn", "river", "reveal"];
  return Math.max(0, phases.indexOf(phase));
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
  const live = state.hands.find((h) => h.id === hand.id);
  if (!live || live.cards.length === 0) return `${playerName(state, hand)} steps onstage`;
  const suits = new Map<string, number>();
  for (const c of live.cards) suits.set(c.suit, (suits.get(c.suit) ?? 0) + 1);
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
  for (const card of cards) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  return Array.from(counts.entries()).map(([rank, count]) => `${rank}${count}`).join(" ");
}

function cardList(cards: readonly Card[]): string {
  return cards.length === 0 ? "none" : cards.map((card) => `${card.rank}${card.suit}`).join(" ");
}
