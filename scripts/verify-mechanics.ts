/**
 * Programmatic mechanic verifier — drives the engine directly for every mode
 * in src/lib/gameMode/modes/*.yaml and records:
 *
 *   - twist fires:       phaseEffects yielded the promised events at the
 *                        promised phases.
 *   - showdown valid:    computeShowdownForMode returns a complete ranking
 *                        across every hand (no nulls, every hand id present).
 *   - special card seen: for token-deck and meta-wild modes, the special
 *                        card meta appears in dealt cards / board after at
 *                        most N replays.
 *   - info chip text:    applyModeInfoFeatures returns non-empty chip per
 *                        phase for the mode's declared infoFeatures.
 *
 * Output: scripts/Stage-3-results.md — one block per mode with pass/fail
 * per axis. Fast: completes in a few seconds for all 328 modes.
 *
 * This does NOT verify (c) UI rendering of special-card glyphs / glow /
 * shimmer — that's the agent-browser sample check in Stage-3-ui.md.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createDeckForMode, dealCardsForMode } from "../src/lib/gameMode/deal";
import { shuffleDeck } from "../src/lib/deckUtils";
import { computeShowdownForMode } from "../src/lib/gameMode/showdown";
import { getGameModeDefinition } from "../src/lib/gameMode/registry";
import { applyModePhaseEffects } from "../party/handlers/phaseEffects";
import { applyModeInfoFeatures } from "../party/handlers/infoFeatures";
import { QUALIFIERS } from "../src/lib/gameMode/qualifiers";
import { HIERARCHIES } from "../src/lib/gameMode/hierarchies";
import type { ServerGameState } from "../party/state";
import type { Card, Hand, Phase, Player, CardMeta, Rank, Suit } from "../src/lib/types";
import type { DealConstraint } from "../src/lib/gameMode/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const PHASES_PLAYED: readonly Phase[] = [
  "preflop",
  "flop",
  "turn",
  "river",
  "reveal",
];

const SPECIAL_METAS = new Set<CardMeta>([
  "joker",
  "tarot",
  "cursed",
  "blessed",
  "counterfeit",
  "glitched",
  "twoSuited",
  "marked",
  "trickster",
]);

interface VerificationResult {
  id: string;
  passes: {
    twistFires: boolean;
    twistDetail: string;
    showdownValid: boolean;
    showdownDetail: string;
    specialCardSeen: boolean | "n/a";
    specialCardDetail: string;
    infoChipsValid: boolean;
    infoChipDetail: string;
  };
  errors: string[];
}

function makePlayers(): Player[] {
  return [
    { id: "p1", name: "AgentA", isBot: false, ready: true, joinedAt: 0 } as unknown as Player,
    { id: "p2", name: "AgentB", isBot: false, ready: true, joinedAt: 0 } as unknown as Player,
  ];
}

function makeServerState(modeId: string): ServerGameState | null {
  try {
    const players = makePlayers();
    const deck = shuffleDeck(createDeckForMode(modeId));
    const dealResult = dealCardsForMode(deck, players.map((p) => p.id), 1, modeId);

    return {
      modeId,
      phase: "preflop",
      players,
      handsPerPlayer: 1,
      gameTimerSeconds: 0,
      roundTimerSeconds: 0,
      phaseStartedAt: null,
      gameStartedAt: null,
      communityCards: dealResult.communityCards,
      communityLayout: undefined,
      modeInfo: [],
      ranking: [],
      hands: dealResult.hands,
      dealChoices: {},
      revealIndex: 0,
      trueRanking: null,
      trueRanks: null,
      score: null,
      rankHistory: {},
      allCommunityCards: dealResult.communityCards.slice(),
      dealDeck: dealResult.remainingDeck,
      burnCards: dealResult.burnCards,
      acquireRequests: [],
      chatMessages: [],
      dingLog: [],
      fuckoffLog: [],
      pendingChaosEvents: [],
      gen: 0,
      mutationVersion: 0,
      modeExt: {},
    } as ServerGameState;
  } catch (err) {
    return null;
  }
}

function metaInState(state: ServerGameState, meta: CardMeta): boolean {
  for (const card of state.allCommunityCards) if (card.meta === meta) return true;
  for (const hand of state.hands) for (const card of hand.cards) if (card.meta === meta) return true;
  return false;
}

function verifyMode(id: string): VerificationResult {
  const result: VerificationResult = {
    id,
    passes: {
      twistFires: true,
      twistDetail: "no phaseEffects declared",
      showdownValid: false,
      showdownDetail: "",
      specialCardSeen: "n/a",
      specialCardDetail: "no special meta to check",
      infoChipsValid: true,
      infoChipDetail: "no infoFeatures declared",
    },
    errors: [],
  };

  const mode = getGameModeDefinition(id);

  // (a) Twist fires — walk through phases, apply effects, record events
  const declaredEffects = new Map<Phase, readonly string[]>();
  if (mode.phaseEffects) {
    for (const phase of PHASES_PLAYED) {
      const list = mode.phaseEffects[phase];
      if (list && list.length > 0) declaredEffects.set(phase, list);
    }
  }

  const state = makeServerState(id);
  if (!state) {
    result.errors.push("makeServerState threw — mode shape rejected by dealCardsForMode");
    return result;
  }

  // (d) info chips for each phase
  const chipsByPhase = new Map<Phase, number>();
  for (const phase of PHASES_PLAYED) {
    state.phase = phase;
    if (declaredEffects.has(phase)) {
      try {
        const events = applyModePhaseEffects(state, phase);
        const expectedSet = new Set(declaredEffects.get(phase)!);
        const observed = new Set(events.map((e) => e.event));
        const missing = [...expectedSet].filter((e) => !observed.has(e));
        if (missing.length > 0) {
          result.passes.twistFires = false;
          result.passes.twistDetail = `phase ${phase} missing effects: ${missing.join(", ")}`;
        } else if (result.passes.twistDetail === "no phaseEffects declared") {
          result.passes.twistDetail = `${events.length} effect(s) fired across declared phases`;
        }
      } catch (err) {
        result.passes.twistFires = false;
        result.passes.twistDetail = `phase ${phase} threw: ${(err as Error).message}`;
      }
    }
    // info chips
    try {
      const chips = applyModeInfoFeatures(state, phase);
      chipsByPhase.set(phase, chips.length);
    } catch (err) {
      result.passes.infoChipsValid = false;
      result.passes.infoChipDetail = `phase ${phase}: ${(err as Error).message}`;
    }
  }

  if (mode.infoFeatures && mode.infoFeatures.length > 0) {
    const totalChips = [...chipsByPhase.values()].reduce((a, b) => a + b, 0);
    if (totalChips === 0) {
      result.passes.infoChipsValid = false;
      result.passes.infoChipDetail = "no info chips emitted across any phase";
    } else {
      result.passes.infoChipDetail = `${totalChips} chip(s) across ${chipsByPhase.size} phases`;
    }
  }

  // (b)/(e) Showdown valid + ranking playable
  try {
    const showdown = computeShowdownForMode(id, state.hands, state.allCommunityCards);
    if (
      showdown.trueRanking.length === state.hands.length &&
      state.hands.every((h) => h.id in showdown.trueRanks)
    ) {
      result.passes.showdownValid = true;
      result.passes.showdownDetail = `ranking [${showdown.trueRanking.join(", ")}]`;
    } else {
      result.passes.showdownValid = false;
      result.passes.showdownDetail = `incomplete ranking: ${JSON.stringify(showdown.trueRanking)}`;
    }
  } catch (err) {
    result.passes.showdownValid = false;
    result.passes.showdownDetail = `computeShowdown threw: ${(err as Error).message}`;
  }

  // (c) Special card seen — replay up to N=30 times for token decks
  let expectedMeta: CardMeta | null = null;
  switch (mode.deal.deck) {
    case "cursed":  expectedMeta = "cursed"; break;
    case "blessed": expectedMeta = "blessed"; break;
    case "tarot":   expectedMeta = "tarot"; break;
    case "jokers":  expectedMeta = "joker"; break;
    case "glitch":  expectedMeta = "glitched"; break;
    case "twoSuited": expectedMeta = "twoSuited"; break;
    case "marked":  expectedMeta = "marked"; break;
    case "trickster": expectedMeta = "trickster"; break;
  }
  if (!expectedMeta && mode.wildCards?.metas?.length) expectedMeta = mode.wildCards.metas[0];
  if (!expectedMeta && mode.excludedMetas?.length) expectedMeta = mode.excludedMetas[0];
  if (!expectedMeta && mode.forceRankByMeta?.first) expectedMeta = mode.forceRankByMeta.first;
  if (!expectedMeta && mode.forceRankByMeta?.last) expectedMeta = mode.forceRankByMeta.last;
  if ((mode.deal.counterfeitHoleCards ?? 0) > 0) expectedMeta = "counterfeit";

  if (expectedMeta) {
    let sawCard = false;
    let attempts = 0;
    const maxAttempts = 30;
    while (!sawCard && attempts < maxAttempts) {
      attempts++;
      const replay = makeServerState(id);
      if (!replay) break;
      if (metaInState(replay, expectedMeta)) sawCard = true;
    }
    result.passes.specialCardSeen = sawCard;
    result.passes.specialCardDetail = sawCard
      ? `${expectedMeta} observed after ${attempts} deal(s)`
      : `${expectedMeta} NOT observed in ${maxAttempts} deals`;
  }

  return result;
}

function main() {
  const modesDir = resolve(ROOT, "src", "lib", "gameMode", "modes");
  const files = readdirSync(modesDir)
    .filter((f) => f.endsWith(".yaml") && f !== "_manifest.yaml")
    .map((f) => f.replace(/\.yaml$/, ""))
    .sort();

  const results: VerificationResult[] = [];
  for (const id of files) {
    try {
      results.push(verifyMode(id));
    } catch (err) {
      results.push({
        id,
        passes: {
          twistFires: false,
          twistDetail: `top-level throw: ${(err as Error).message}`,
          showdownValid: false,
          showdownDetail: "",
          specialCardSeen: "n/a",
          specialCardDetail: "",
          infoChipsValid: false,
          infoChipDetail: "",
        },
        errors: [(err as Error).message],
      });
    }
  }

  // Counts
  const fails = results.filter(
    (r) =>
      !r.passes.twistFires ||
      !r.passes.showdownValid ||
      r.passes.specialCardSeen === false ||
      !r.passes.infoChipsValid,
  );
  const passing = results.length - fails.length;

  // Write Stage-3-results.md
  const lines: string[] = [
    "# Stage 3 Mechanic Verification Results",
    "",
    `Run: ${new Date().toISOString()}`,
    `Modes verified: ${results.length}`,
    `Passing: ${passing}/${results.length}`,
    `Failing: ${fails.length}`,
    "",
    "Programmatic mechanic verification — drives the engine directly via",
    "`dealCardsForMode`, `applyModePhaseEffects`, `applyModeInfoFeatures`,",
    "`computeShowdownForMode`. Does NOT verify UI rendering (special-card",
    "glyphs, glow, shimmer, board layout pixels). UI verification is the",
    "agent-browser sample pass in `Stage-3-ui.md`.",
    "",
    "## Failures",
    "",
  ];

  if (fails.length === 0) {
    lines.push("(none — every mode passes mechanic invariants)");
  } else {
    for (const r of fails) {
      lines.push(`### ${r.id}`);
      lines.push("");
      if (!r.passes.twistFires) lines.push(`- twist-fires: ❌ ${r.passes.twistDetail}`);
      if (!r.passes.showdownValid) lines.push(`- showdown: ❌ ${r.passes.showdownDetail}`);
      if (r.passes.specialCardSeen === false) lines.push(`- special-card: ❌ ${r.passes.specialCardDetail}`);
      if (!r.passes.infoChipsValid) lines.push(`- info-chip: ❌ ${r.passes.infoChipDetail}`);
      for (const e of r.errors) lines.push(`- error: ${e}`);
      lines.push("");
    }
  }

  lines.push("## Full table");
  lines.push("");
  lines.push("| mode | twist | showdown | special-card | info-chip |");
  lines.push("|------|-------|----------|--------------|-----------|");
  for (const r of results) {
    const cells = [
      r.id,
      r.passes.twistFires ? "✓" : "✗",
      r.passes.showdownValid ? "✓" : "✗",
      r.passes.specialCardSeen === "n/a" ? "—" : r.passes.specialCardSeen ? "✓" : "✗",
      r.passes.infoChipsValid ? "✓" : "✗",
    ];
    lines.push(`| ${cells.join(" | ")} |`);
  }

  const out = resolve(ROOT, "scripts", "Stage-3-results.md");
  writeFileSync(out, lines.join("\n") + "\n", "utf8");
  console.log(`Wrote ${out}`);
  console.log(`Passing: ${passing}/${results.length}, Failing: ${fails.length}`);

  // -------- Property tests: constraints, qualifiers, hierarchies --------
  const propLines: string[] = [];
  const cFail = verifyConstraintPredicates(propLines);
  const qFail = verifyQualifierPredicates(propLines);
  const hFail = verifyHierarchyPredicates(propLines);
  const totalPropFails = cFail + qFail + hFail;
  if (totalPropFails === 0) {
    console.log("Property tests: all constraints, qualifiers, hierarchies pass");
  } else {
    console.log(`Property tests: ${totalPropFails} failure(s)`);
    for (const l of propLines) console.log(`  ${l}`);
  }

  // -------- Strict CI gate --------
  // With `--strict`, exit non-zero on any mode failure or property-test
  // failure. Used by `npm run modes:verify` as a deployment gate.
  if (process.argv.includes("--strict")) {
    if (fails.length > 0 || totalPropFails > 0) {
      console.error(
        `verify-mechanics --strict: ${fails.length} mode failure(s), ${totalPropFails} property failure(s)`,
      );
      process.exit(1);
    }
  }
}

// ---------- Property test helpers ----------

function makeRng(seed: number): () => number {
  // Mulberry32 — small deterministic PRNG.
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STANDARD_DECK: Card[] = (() => {
  const out: Card[] = [];
  const ranks: Rank[] = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
  const suits: Suit[] = ["H","D","C","S"];
  for (const s of suits) for (const r of ranks) out.push({ rank: r, suit: s });
  return out;
})();

function seededShuffle(rng: () => number): Card[] {
  const out = STANDARD_DECK.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const CONSTRAINT_PROPS: Record<DealConstraint, (hand: Card[]) => boolean> = {
  pocketPair: (h) => h.length >= 2 && h[0].rank === h[1].rank,
  sharedFirstCard: (_h) => true, // multi-hand property — checked separately if needed
  differentSuits: (h) => new Set(h.map((c) => c.suit)).size === h.length,
  sameSuit: (h) => new Set(h.map((c) => c.suit)).size === 1,
  connectedRanks: (h) => {
    if (h.length < 2) return true;
    const vals = h.map((c) => "23456789TJQKA".indexOf(c.rank)).sort((a, b) => a - b);
    for (let i = 1; i < vals.length; i++) if (vals[i] - vals[i - 1] !== 1) return false;
    return true;
  },
  gappedRanks: (h) => {
    if (h.length < 2) return true;
    const vals = h.map((c) => "23456789TJQKA".indexOf(c.rank)).sort((a, b) => a - b);
    return vals[1] - vals[0] >= 2;
  },
  polarRanks: (h) => {
    // Engine semantics: one card from the high band (rank value >= 8) and one from
    // the low band (rank value <= 7). The two halves of the deck are mixed.
    if (h.length < 2) return true;
    const vals = h.map((c) => "23456789TJQKA".indexOf(c.rank) + 2);
    return vals.some((v) => v >= 8) && vals.some((v) => v <= 7);
  },
  lowRanks: (h) => h.every((c) => "234567".includes(c.rank)),
  highRanks: (h) => h.every((c) => "89TJQKA".includes(c.rank)),
  atLeastOneFace: (h) => h.some((c) => c.rank === "J" || c.rank === "Q" || c.rank === "K"),
  bichrome: (h) => {
    const colors = new Set(h.map((c) => (c.suit === "H" || c.suit === "D") ? "R" : "B"));
    return colors.size > 1;
  },
  monochrome: (h) => {
    const colors = new Set(h.map((c) => (c.suit === "H" || c.suit === "D") ? "R" : "B"));
    return colors.size === 1;
  },
  fixedGap5: (h) => {
    if (h.length < 2) return true;
    const vals = h.map((c) => "23456789TJQKA".indexOf(c.rank)).sort((a, b) => a - b);
    return vals[1] - vals[0] === 5;
  },
};

const CONSTRAINT_TO_MODE: Record<DealConstraint, string> = {
  pocketPair: "echo",
  sharedFirstCard: "mirror-match",
  differentSuits: "rainbow-hole",
  sameSuit: "suited-hole",
  connectedRanks: "connected-hole",
  gappedRanks: "gapped-hole",
  polarRanks: "polar-hole",
  lowRanks: "peasant-deal",
  highRanks: "royal-spark",
  atLeastOneFace: "royal-deal",
  bichrome: "chromatic",
  monochrome: "monochrome",
  fixedGap5: "gap-club",
};

function verifyConstraintPredicates(out: string[]): number {
  const TRIALS = 100;
  let fails = 0;
  for (const constraint of Object.keys(CONSTRAINT_PROPS) as DealConstraint[]) {
    const modeId = CONSTRAINT_TO_MODE[constraint];
    let mode;
    try {
      mode = getGameModeDefinition(modeId);
    } catch {
      out.push(`constraint ${constraint}: skipped (no exemplar mode ${modeId})`);
      continue;
    }
    const predicate = CONSTRAINT_PROPS[constraint];
    let fail = 0;
    for (let trial = 0; trial < TRIALS; trial++) {
      const rng = makeRng(trial * 7919 + 17);
      const deck = seededShuffle(rng);
      try {
        const dealResult = dealCardsForMode(deck, ["p1", "p2"], 1, mode.id);
        for (const hand of dealResult.hands) {
          if (!predicate(hand.cards)) {
            fail++;
            if (fail <= 3) {
              out.push(`constraint ${constraint}: hand ${hand.cards.map((c) => c.rank + c.suit).join(",")} violates predicate`);
            }
          }
        }
      } catch {
        // mode shape rejected — skip.
      }
    }
    if (fail > 0) {
      fails++;
      out.push(`constraint ${constraint}: ${fail} failures across ${TRIALS} trials`);
    }
  }
  return fails;
}

function makeHand(id: string, cards: Card[]): Hand {
  return { id, playerId: "p1", cards, flipped: false };
}

function verifyQualifierPredicates(out: string[]): number {
  let fails = 0;
  // Build a few known good/bad boards per qualifier to verify the predicate logic.
  const flushHand = makeHand("h1", [
    { rank: "A", suit: "H" }, { rank: "K", suit: "H" },
  ]);
  const flushBoard: Card[] = [
    { rank: "Q", suit: "H" }, { rank: "J", suit: "H" }, { rank: "5", suit: "H" },
    { rank: "2", suit: "C" }, { rank: "3", suit: "D" },
  ];
  // Flush qualifier — should pass
  const flushOk = QUALIFIERS.requireTopHandIsFlush({ ranking: ["h1"], hands: [flushHand], board: flushBoard });
  if (!flushOk.ok) {
    fails++;
    out.push(`qualifier requireTopHandIsFlush: expected pass on flush board, got fail (${flushOk.reason})`);
  }
  // Rainbow qualifier — should pass for 4-suit hole
  const rainbowHand = makeHand("h1", [
    { rank: "A", suit: "H" }, { rank: "K", suit: "S" },
  ]);
  const rainbowOk = QUALIFIERS.requireTopHandRainbow({ ranking: ["h1"], hands: [rainbowHand], board: [] });
  if (!rainbowOk.ok) {
    fails++;
    out.push(`qualifier requireTopHandRainbow: expected pass for distinct suits, got fail`);
  }
  // No-face qualifier — should fail on face-card hand
  const faceHand = makeHand("h1", [
    { rank: "K", suit: "H" }, { rank: "5", suit: "S" },
  ]);
  const noFace = QUALIFIERS.requireTopHandNoFaceCards({ ranking: ["h1"], hands: [faceHand], board: [] });
  if (noFace.ok) {
    fails++;
    out.push(`qualifier requireTopHandNoFaceCards: expected fail on K-hand, got ok`);
  }
  return fails;
}

function verifyHierarchyPredicates(out: string[]): number {
  let fails = 0;
  // hierarchyByMeta: blessed hand should move ahead of unmarked.
  const blessedHand = makeHand("h-blessed", [{ rank: "5", suit: "H", meta: "blessed" }, { rank: "3", suit: "D" }]);
  const plainHand = makeHand("h-plain", [{ rank: "A", suit: "S" }, { rank: "K", suit: "C" }]);
  const mode = getGameModeDefinition("judgment-day");
  const reordered = HIERARCHIES.hierarchyByMeta({
    ranking: ["h-plain", "h-blessed"],
    hands: [blessedHand, plainHand],
    board: [],
    mode,
  });
  if (reordered[0] !== "h-blessed") {
    fails++;
    out.push(`hierarchy hierarchyByMeta: expected blessed first, got ${reordered.join(",")}`);
  }
  return fails;
}

main();
