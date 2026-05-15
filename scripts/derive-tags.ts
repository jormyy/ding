/**
 * Derive canonical tags from mode shape and rewrite tags: blocks in YAML.
 *
 * Reads every src/lib/gameMode/modes/*.yaml, inspects the mode's deal /
 * phaseEffects / wildCards / infoFeatures / tier, computes the canonical
 * tag set per TAGS.md, and writes the new tags: block back.
 *
 * Run: npx tsx scripts/derive-tags.ts
 *      npx tsx scripts/derive-tags.ts --check   (exit 1 if anything would change)
 *      npx tsx scripts/derive-tags.ts --dry     (print diff, no writes)
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const HERE = dirname(fileURLToPath(import.meta.url));
const MODES_DIR = resolve(HERE, "..", "src", "lib", "gameMode", "modes");

// ---------- Token sets ---------------------------------------------------

const TOKEN_DECKS = new Set([
  "cursed",
  "blessed",
  "tarot",
  "glitch",
  "twoSuited",
  "marked",
  "trickster",
  "jokers",
]);

const RANK_WILD_SHAPED_DECKS = new Set(["jokers", "tarot"]);

const SCORE_PIVOT_EFFECTS = new Set([
  "adoptRedScoring",
  "adoptBlackScoring",
  "invertScoringNow",
  "coinflipScoreRule",
  "armRankInvert",
  "executeRankInvert",
]);

const POSITIONAL_EFFECTS = new Set([
  "rotateHoleCardsClockwise",
  "rotateFirstHoleCardsClockwise",
  "rotateAllCardPositions",
  "bestCardClockwise",
  "swapFirstCardsFirstTwoHands",
  "crossHandCardSwap",
  "rotateHoleRanksAcrossHands",
  "shuffleHandAssignment",
  "tricksterSwapRight",
]);

const RELATIONAL_EFFECTS = new Set([
  "hierarchyByMeta",
  "cyclicHandHierarchy",
  "pactMergeFirstLast",
  "colorTeamAssign",
  "matchRankInherit",
  "forceAdjacentTie",
  "crowdedRankPenalty",
  "enforceOneCardPerBoardRow",
  "absorbLastHandToBoard",
  "requirePocketSourceTop",
  "splitHandsAtReveal",
  "hostageRankBecomesWild",
  "adjacentRankBonus",
  "uniqueHandClassRequired",
]);

const PHASE_TEMPO_EFFECTS = new Set([
  "revertBoardToFlop",
  "revertToFlopBriefly",
  "rerollFlopAtTurn",
  "duplicateFlopPhase",
  "flopOneAtATime",
  "rewindToTurnAfterReveal",
  "lockTopHalfAtFlop",
  "markFirstBoard",
  "reverseTableAndBoard",
]);

const WEATHER_EFFECTS = new Set([
  "stormSurge",
  "spreadPlagueToFirstCard",
  "staticFlickerFirstCards",
  "cipherRanksWithRiver",
  "randomReplaceVisibleCommunity",
  "shuffleCommunity",
  "scrambleCommunitySuits",
  "removeAdjacentToRiver",
  "removeLastCommunity",
  "mixHolesWithBurn",
  "convergeSevensToAces",
  "removeHighestRankInPlay",
  "singularityAverageFirstTwoHoles",
  "schismDeckHighOnly",
  "lockMajorityColor",
  "zeroHighRanks",
  "breakBoardPairs",
  "stripBoardSuits",
  "markOneBoardWild",
  "firstCommunityAbsorbsSecondSuit",
  "riverOverwritesSuit",
  "incrementAllRanks",
  "incrementAllHoleRanks",
  "incrementFirstCommunityRank",
  "incrementFirstHolePerHand",
  "festivalBoostFirstCommunity",
  "upgradeHighestHole",
  "faceCardsToAces",
  "faceCardsToTwos",
  "removeFaceCards",
  "removeSevens",
  "removeEvenRanks",
  "removeOneHolePerHand",
  "removeFirstHolePerHand",
  "shuffleAllHoleCards",
  "swapFirstHoleWithFirstCommunity",
  "reverseCommunity",
  "mirrorCommunity",
  "reassignAllSuits",
  "invertAllRanks",
]);

const IDENTITY_TOKEN_EFFECTS = new Set([
  "blessedTierBump",
  "cursedTierDemote",
  "glitchCopyNeighbor",
  "tarotRankShift",
  "counterfeitInversion",
  "chosenJokerImprint",
  "markedTwinWild",
]);

// ---------- Mode-shape interface (loose, just for derivation) -----------

interface Shape {
  id: string;
  tier?: string;
  score?: string;
  deal: {
    holeCards?: number;
    communityCards?: number;
    deck?: string;
    publicCards?: number;
    publicCardSelection?: string;
    visibleHoleCards?: Record<string, number>;
    visibleHoleCardDetail?: unknown;
    visibleHoleCardIndexes?: Record<string, unknown>;
    visibleCommunityCards?: Record<string, number>;
    visibleCommunityIndexes?: Record<string, unknown>;
    visibleCommunityCardDetail?: unknown;
    visibleCommunityCardDetails?: unknown;
    dealChoice?: {
      mulligan?: boolean;
      tradeUp?: boolean;
      inheritance?: boolean;
      auction?: boolean;
      blindPool?: boolean;
      peekBoard?: number;
      sacrificeForPeek?: boolean;
      recruit?: boolean;
      solomon?: boolean;
      tablePicks?: boolean;
      optInHole3WithPenalty?: boolean;
    };
    constraint?: string;
    boards?: { count?: number };
    boardLayout?: {
      kind: string;
      slots?: { group?: string }[];
      secondaryRole?: string;
    };
    possibleIdentities?: string;
    counterfeitHoleCards?: number;
    discardedCardsToCommunity?: boolean;
  };
  phaseEffects?: Record<string, string[]>;
  wildCards?: { ranks?: string[]; suits?: string[]; metas?: string[] };
  wildCardsByPhase?: Record<
    string,
    { ranks?: string[]; suits?: string[]; metas?: string[] }
  >;
  excludedRanks?: string[];
  excludedMetas?: string[];
  forceRankByMeta?: { first?: string; last?: string };
  infoFeatures?: string[];
  identityResolution?: string;
  syntheticPair?: string;
  rankTransform?: string;
  suitTransform?: string;
}

// ---------- Derivation --------------------------------------------------

function deriveTags(m: Shape): string[] {
  if (m.id === "ding") return ["core"];

  const tags = new Set<string>();

  const allEffects: string[] = Object.values(m.phaseEffects ?? {}).flat();
  const lateEffects = [
    ...(m.phaseEffects?.river ?? []),
    ...(m.phaseEffects?.reveal ?? []),
  ];

  // identity-token: special-meta decks, exclude/force/wild meta refs, identity effects
  const hasTokenDeck = m.deal.deck != null && TOKEN_DECKS.has(m.deal.deck);
  const hasWildMeta =
    (m.wildCards?.metas?.length ?? 0) > 0 ||
    Object.values(m.wildCardsByPhase ?? {}).some(
      (w) => (w?.metas?.length ?? 0) > 0,
    );
  const hasMetaQualifier =
    (m.excludedMetas?.length ?? 0) > 0 ||
    m.forceRankByMeta?.first != null ||
    m.forceRankByMeta?.last != null;
  const hasIdentityEffect = allEffects.some((e) =>
    IDENTITY_TOKEN_EFFECTS.has(e),
  );
  if (
    hasTokenDeck ||
    hasWildMeta ||
    hasMetaQualifier ||
    hasIdentityEffect ||
    m.deal.possibleIdentities != null ||
    m.identityResolution != null ||
    (m.deal.counterfeitHoleCards ?? 0) > 0
  ) {
    tags.add("identity-token");
  }

  // deck-swap: deck swap that is NOT a token deck
  if (m.deal.deck != null && !TOKEN_DECKS.has(m.deal.deck)) {
    tags.add("deck-swap");
  }

  // wild: rank/suit wilds (not just metas — those are identity-token)
  const hasRankSuitWild =
    (m.wildCards?.ranks?.length ?? 0) > 0 ||
    (m.wildCards?.suits?.length ?? 0) > 0 ||
    Object.values(m.wildCardsByPhase ?? {}).some(
      (w) => (w?.ranks?.length ?? 0) > 0 || (w?.suits?.length ?? 0) > 0,
    );
  if (hasRankSuitWild) tags.add("wild");

  // visibility: any non-standard reveal schedule
  if (
    m.deal.publicCards != null ||
    m.deal.publicCardSelection != null ||
    m.deal.visibleHoleCards != null ||
    m.deal.visibleHoleCardDetail != null ||
    m.deal.visibleHoleCardIndexes != null
  ) {
    tags.add("visibility");
  }
  // Community visibility schedule is only non-baseline when it diverges from
  // the engine default (flop=3, turn=4, river=5, reveal=5). Treat any
  // visibleCommunity* as a visibility signal.
  if (
    m.deal.visibleCommunityCards != null ||
    m.deal.visibleCommunityIndexes != null ||
    m.deal.visibleCommunityCardDetail != null ||
    m.deal.visibleCommunityCardDetails != null
  ) {
    tags.add("visibility");
  }

  // select-stage + sub-mechanic
  if (m.deal.dealChoice) {
    tags.add("select-stage");
    const dc = m.deal.dealChoice;
    if (dc.mulligan) tags.add("mulligan");
    else if (dc.tradeUp) tags.add("trade-up");
    else if (dc.inheritance) tags.add("inheritance");
    else if (
      m.deal.publicCardSelection === "playerChoice" &&
      !dc.auction &&
      !dc.solomon &&
      !dc.tablePicks
    )
      tags.add("expose-choice");
    else if (
      !dc.auction &&
      !dc.blindPool &&
      !dc.peekBoard &&
      !dc.sacrificeForPeek &&
      !dc.recruit &&
      !dc.solomon &&
      !dc.tablePicks &&
      !dc.optInHole3WithPenalty
    )
      tags.add("peek-keep");
    // exotic select-stage (auction/solomon/etc.) gets select-stage only

    // solomon/tablePicks/inheritance/recruit also imply relational
    if (dc.solomon || dc.tablePicks || dc.inheritance || dc.recruit || dc.tradeUp)
      tags.add("relational");
  } else if (m.deal.publicCardSelection === "playerChoice") {
    // expose-choice without a full dealChoice block (e.g. schrodinger-expose)
    tags.add("select-stage");
    tags.add("expose-choice");
  }

  // constrained-deal
  if (m.deal.constraint) tags.add("constrained-deal");

  // multi-board
  if ((m.deal.boards?.count ?? 0) > 1) tags.add("multi-board");
  if (m.deal.boardLayout?.kind === "grid") {
    const groups = new Set(
      (m.deal.boardLayout.slots ?? [])
        .map((s) => s.group)
        .filter((g): g is string => typeof g === "string"),
    );
    if (groups.size > 1) tags.add("multi-board");
  }

  // big-hands: any non-standard deal shape (more or fewer hole/community)
  const holeCards = m.deal.holeCards ?? 2;
  const communityCards = m.deal.communityCards ?? 5;
  if (holeCards !== 2 || communityCards !== 5) tags.add("big-hands");

  // phase-tempo: custom visibleCommunityCards schedule that diverges from
  // the engine default (flop=3, turn=4, river=communityCards, reveal=communityCards).
  // Smaller boards that just match (flop=3 if comm>=3) are NOT phase-tempo.
  if (m.deal.visibleCommunityCards) {
    const v = m.deal.visibleCommunityCards;
    const expectedFlop = Math.min(3, communityCards);
    const expectedTurn = Math.min(4, communityCards);
    const expectedRiver = communityCards;
    if (
      (v.flop != null && v.flop !== expectedFlop) ||
      (v.turn != null && v.turn !== expectedTurn) ||
      (v.river != null && v.river !== expectedRiver) ||
      (v.preflop != null && v.preflop > 0)
    ) {
      tags.add("phase-tempo");
    }
  }
  if (m.deal.visibleCommunityIndexes) tags.add("phase-tempo");

  // wild (cont.): mode-level rank/suit transforms behave as wilds
  if (m.syntheticPair) tags.add("wild");
  if (m.suitTransform) tags.add("wild");

  // score-pivot (cont.): rankTransform: inverted is a top-level score rule pivot
  if (m.rankTransform) tags.add("score-pivot");

  // mission (cont.): non-`high` score rule = alternate objective
  if (m.score && m.score !== "high") tags.add("mission");

  // multi-board (cont.): dual layout with vault/decoy secondary
  if (m.deal.boardLayout?.kind === "dual") tags.add("multi-board");

  // excludedRanks signals an identity/deck shape mod; treat as deck-swap
  if ((m.excludedRanks?.length ?? 0) > 0) tags.add("deck-swap");

  // discardedCardsToCommunity adds extra board real estate at reveal
  if (m.deal.discardedCardsToCommunity) tags.add("late-detonation");

  // late-detonation: river or reveal effects
  if (lateEffects.length > 0) tags.add("late-detonation");

  // mission: any qualifier
  if (
    allEffects.some(
      (e) => e.startsWith("require") || e === "excludePairTier",
    )
  ) {
    tags.add("mission");
  }

  // score-pivot
  if (allEffects.some((e) => SCORE_PIVOT_EFFECTS.has(e))) {
    tags.add("score-pivot");
  }

  // positional
  if (allEffects.some((e) => POSITIONAL_EFFECTS.has(e))) {
    tags.add("positional");
  }

  // relational (cross-hand)
  if (allEffects.some((e) => RELATIONAL_EFFECTS.has(e))) {
    tags.add("relational");
  }

  // phase-tempo
  if (allEffects.some((e) => PHASE_TEMPO_EFFECTS.has(e))) {
    tags.add("phase-tempo");
  }

  // weather
  if (allEffects.some((e) => WEATHER_EFFECTS.has(e))) {
    tags.add("weather");
  }

  // insanity: tier-driven catch-all (must run before info-overlay check)
  if (m.tier === "insanity") tags.add("insanity");

  // info-overlay: has infoFeatures and no other engine-effect tag classifies
  // the mode. (A pure overlay mode = info chip + nothing else.)
  const ENGINE_EFFECT_TAGS = new Set([
    "weather",
    "late-detonation",
    "score-pivot",
    "mission",
    "phase-tempo",
    "positional",
    "relational",
    "wild",
    "identity-token",
    "multi-board",
    "big-hands",
    "select-stage",
    "constrained-deal",
    "deck-swap",
    "visibility",
    "insanity",
  ]);
  if ((m.infoFeatures?.length ?? 0) > 0) {
    const hasEngineTag = [...tags].some((t) => ENGINE_EFFECT_TAGS.has(t));
    if (!hasEngineTag) tags.add("info-overlay");
  }

  // safety net: every mode must have at least one tag
  if (tags.size === 0) {
    // Could be a pure deck reshuffle that's not a token deck and not
    // captured above. Fall back to the deck-swap signal if a deck is set.
    if (m.deal.deck) tags.add("deck-swap");
    else tags.add("core");
  }

  return Array.from(tags).sort();
}

// ---------- YAML rewrite ------------------------------------------------

function rewriteTagsInYaml(text: string, newTags: string[]): string {
  // Locate the `tags:` block (line starting with "tags:") and replace until
  // the next top-level key. Preserves rest of file verbatim.
  const lines = text.split("\n");
  let start = -1;
  let end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("tags:")) {
      start = i;
      for (let j = i + 1; j < lines.length; j++) {
        // top-level key (no leading space, has a colon)
        if (/^[A-Za-z]/.test(lines[j])) {
          end = j;
          break;
        }
      }
      if (end === -1) end = lines.length;
      break;
    }
  }
  if (start === -1) {
    throw new Error("No tags: block found");
  }
  const before = lines.slice(0, start);
  const after = lines.slice(end);
  const tagBlock = ["tags:", ...newTags.map((t) => `  - ${t}`)];
  return [...before, ...tagBlock, ...after].join("\n");
}

// ---------- Main --------------------------------------------------------

function main() {
  const dry = process.argv.includes("--dry");
  const check = process.argv.includes("--check");
  const files = readdirSync(MODES_DIR)
    .filter((f) => f.endsWith(".yaml") && f !== "_manifest.yaml")
    .sort();

  let changed = 0;
  let unchanged = 0;
  const changes: { id: string; before: string[]; after: string[] }[] = [];

  for (const file of files) {
    const path = resolve(MODES_DIR, file);
    const text = readFileSync(path, "utf8");
    const yaml = YAML.parse(text) as Shape & { tags?: string[] };
    const oldTags = [...(yaml.tags ?? [])];
    const newTags = deriveTags(yaml);

    const sameLength = oldTags.length === newTags.length;
    const sameContents =
      sameLength && oldTags.every((t, i) => t === newTags[i]);

    if (!sameContents) {
      changed++;
      changes.push({ id: yaml.id, before: oldTags, after: newTags });
      if (!dry && !check) {
        const next = rewriteTagsInYaml(text, newTags);
        writeFileSync(path, next, "utf8");
      }
    } else {
      unchanged++;
    }
  }

  if (dry || check) {
    for (const c of changes) {
      console.log(`${c.id}: [${c.before.join(", ")}] -> [${c.after.join(", ")}]`);
    }
  }
  console.log(`\n${changed} changed, ${unchanged} unchanged.`);

  if (check && changed > 0) {
    console.error(
      "derive-tags --check: tags are out of date; run `npx tsx scripts/derive-tags.ts`.",
    );
    process.exit(1);
  }
}

main();
