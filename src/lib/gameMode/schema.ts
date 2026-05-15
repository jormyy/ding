import { z } from "zod";

import { standardDeal, type DingGameModeDefinition, type GameModeDealRule } from "./types";

const Rank = z.enum([
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
  "A",
]);

const Suit = z.enum(["H", "D", "C", "S"]);

const CardMeta = z.enum([
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

const DeckKind = z.enum([
  "standard",
  "short",
  "stripped",
  "bottomHalf",
  "double",
  "triple",
  "half",
  "pinochle",
  "tarot",
  "suitHeavy",
  "suitLight",
  "jokers",
  "cursed",
  "blessed",
  "glitch",
  "twoSuited",
  "marked",
  "trickster",
]);

const HoleCardVisibilityDetail = z.enum([
  "full",
  "suit",
  "rank",
  "color",
  "hidden",
]);

const PublicHoleCardSelection = z.enum([
  "first",
  "highest",
  "lowest",
  "playerChoice",
]);

const ScoreRule = z.enum([
  "high",
  "lowball",
  "flush",
  "straight",
  "pairs",
  "red",
  "black",
]);

const DealConstraint = z.enum([
  "pocketPair",
  "sharedFirstCard",
  "differentSuits",
  "sameSuit",
  "connectedRanks",
  "gappedRanks",
  "polarRanks",
  "lowRanks",
  "highRanks",
]);

const ModeTier = z.enum([
  "standard",
  "twist",
  "select",
  "wild",
  "chaos",
  "insanity",
]);

const PhaseEffectId = z.enum([
  "randomReplaceVisibleCommunity",
  "reverseCommunity",
  "mirrorCommunity",
  "shuffleCommunity",
  "rotateHoleCardsClockwise",
  "incrementFirstHolePerHand",
  "removeFaceCards",
  "removeSevens",
  "reassignAllSuits",
  "invertAllRanks",
  "removeAdjacentToRiver",
  "stormSurge",
  "scrambleCommunitySuits",
  "swapFirstCardsFirstTwoHands",
  "removeLastCommunity",
  "upgradeHighestHole",
  "faceCardsToAces",
  "faceCardsToTwos",
  "removeOneHolePerHand",
  "removeEvenRanks",
  "removeFirstHolePerHand",
  "shuffleAllHoleCards",
  "swapFirstHoleWithFirstCommunity",
  "incrementFirstCommunityRank",
  "festivalBoostFirstCommunity",
  "revertBoardToFlop",
  "reverseTableAndBoard",
  "singularityAverageFirstTwoHoles",
  "firstCommunityAbsorbsSecondSuit",
  "convergeSevensToAces",
  "rotateHoleRanksAcrossHands",
  "removeHighestRankInPlay",
  "spreadPlagueToFirstCard",
  "rotateFirstHoleCardsClockwise",
  "mixHolesWithBurn",
  "rotateAllCardPositions",
  "incrementAllRanks",
  "incrementAllHoleRanks",
  "cipherRanksWithRiver",
  "staticFlickerFirstCards",
  "splitHandsAtReveal",
  "schismDeckHighOnly",
]);

const InfoFeatureId = z.enum([
  "anti-memory",
  "aurora",
  "avalanche",
  "black-hole",
  "blessed-card-absolute",
  "burn-reveal",
  "card-cipher",
  "card-conscience",
  "card-constellation",
  "card-convergence",
  "card-decoy",
  "card-diaspora",
  "card-drift",
  "card-eclipse-total",
  "card-festival",
  "card-halo",
  "card-inheritance",
  "card-karma",
  "card-lunar",
  "card-madness",
  "card-marriage",
  "card-memorial",
  "card-multiverse",
  "card-pendulum",
  "card-pinball",
  "card-plague-spread",
  "card-rebellion",
  "card-resurrection",
  "card-schism",
  "card-singularity",
  "card-soup",
  "card-static",
  "card-theatre",
  "card-tide",
  "card-vortex",
  "card-whisper",
  "card-whisper-network",
  "cell-division",
  "cold-snap",
  "communal-glance",
  "deck-count",
  "decoy",
  "doomsday-card",
  "doppelganger-deck",
  "drought",
  "drunken-display",
  "earthquake",
  "flood",
  "fog-bank",
  "glitch-wars",
  "gravity-well",
  "group-mind",
  "half-lit-holes",
  "heat-map",
  "heat-wave",
  "hex-card",
  "hint-card",
  "holographic-card",
  "hurricane",
  "ice-age",
  "identity-crisis",
  "late-hand-reveal",
  "lightning",
  "lying-mirror",
  "memory-hole",
  "meteor",
  "mirror-hand",
  "mirror-hole",
  "mirror-universe",
  "mirror-world",
  "pandemonium",
  "past-trace",
  "periscope",
  "phantom-card",
  "photographic-memory",
  "photographic-negative",
  "plague",
  "probability-cloud",
  "quantum-flop",
  "quantum-shuffle",
  "rainstorm",
  "rank-census",
  "rank-whisper",
  "reality-skip",
  "reality-tear",
  "recursive-board",
  "reverse-universe",
  "sample-draw",
  "schrodingers-board",
  "schrodingers-hole",
  "shapeshifter",
  "smoke-hole",
  "solar-flare",
  "spotlight",
  "static",
  "storm-surge",
  "suit-census",
  "suit-heat",
  "suit-whisper",
  "synesthesia",
  "tag-team",
  "telepathic-river",
  "tell",
  "time-echo",
  "tornado",
  "twin-universes",
  "volcano",
  "whisper-chain",
  "wild-rank-roulette",
  "wildfire",
  "wormhole",
]);

const BoardSlot = z
  .object({
    row: z.number().int(),
    col: z.number().int(),
    group: z.string().optional(),
    scoresAs: z.enum(["primary", "mirror", "decoy"]).optional(),
  })
  .strict();

const BoardLayout = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("linear"), slots: z.number().int() }).strict(),
  z
    .object({
      kind: z.literal("dual"),
      primary: z.number().int(),
      secondary: z.number().int(),
      secondaryRole: z.enum(["mirror", "decoy", "vault"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("L"),
      arm: z.number().int(),
      stem: z.number().int(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("grid"),
      slots: z.array(BoardSlot),
    })
    .strict(),
]);

const Wilds = z
  .object({
    ranks: z.array(Rank).optional(),
    suits: z.array(Suit).optional(),
    metas: z.array(CardMeta).optional(),
  })
  .strict();

const PhaseRecord = <V extends z.ZodTypeAny>(value: V) =>
  z
    .object({
      lobby: value.optional(),
      dealChoice: value.optional(),
      preflop: value.optional(),
      flop: value.optional(),
      turn: value.optional(),
      river: value.optional(),
      reveal: value.optional(),
    })
    .strict();

const DealChoice = z
  .object({
    dealtCards: z.number().int(),
    keepCards: z.number().int(),
    selectionPhase: z.boolean(),
    mulligan: z.boolean().optional(),
    tradeUp: z.boolean().optional(),
    inheritance: z.boolean().optional(),
  })
  .strict();

const Boards = z
  .object({
    count: z.number().int().optional(),
    cardsPerBoard: z.number().int().optional(),
    cardIndexes: z.array(z.array(z.number().int())).optional(),
    scoring: z.literal("best"),
  })
  .strict();

const VisibleHoleCardDetail = z.union([
  HoleCardVisibilityDetail,
  PhaseRecord(HoleCardVisibilityDetail),
]);

/** Deal-rule shape as it appears in YAML. `extends: standard` is sugar for
 * spreading the standardDeal defaults; holeCards/communityCards are optional
 * here because the resolver may fill them in. The resolved object is
 * re-checked against ResolvedDealRule below. */
const DealYaml = z
  .object({
    extends: z.literal("standard").optional(),
    holeCards: z.number().int().optional(),
    keepCards: z.number().int().optional(),
    dealChoice: DealChoice.optional(),
    publicCards: z.number().int().optional(),
    publicCardSelection: PublicHoleCardSelection.optional(),
    visibleHoleCards: PhaseRecord(z.number().int()).optional(),
    visibleHoleCardDetail: VisibleHoleCardDetail.optional(),
    visibleHoleCardIndexes: PhaseRecord(z.array(z.number().int())).optional(),
    communityCards: z.number().int().optional(),
    boardLayout: BoardLayout.optional(),
    boards: Boards.optional(),
    visibleCommunityCards: PhaseRecord(z.number().int()).optional(),
    visibleCommunityIndexes: PhaseRecord(z.array(z.number().int())).optional(),
    scoreCommunityCards: z.number().int().optional(),
    visibleCommunityCardDetail: PhaseRecord(HoleCardVisibilityDetail).optional(),
    visibleCommunityCardDetails: PhaseRecord(
      z.record(z.string(), HoleCardVisibilityDetail),
    ).optional(),
    possibleIdentities: z.enum(["holes", "board", "holesAndBoard"]).optional(),
    discardedCardsToCommunity: z.boolean().optional(),
    counterfeitHoleCards: z.number().int().optional(),
    deck: DeckKind.optional(),
    constraint: DealConstraint.optional(),
  })
  .strict();

const ResolvedDealRule = DealYaml.extend({
  extends: z.undefined().optional(),
  holeCards: z.number().int(),
  communityCards: z.number().int(),
});

export const ModeYamlSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    shortName: z.string().min(1),
    summary: z.string().min(1),
    detail: z.string().min(1),
    tags: z.array(z.string()),
    tier: ModeTier,
    deal: DealYaml,
    phaseEffects: PhaseRecord(z.array(PhaseEffectId)).optional(),
    wildCards: Wilds.optional(),
    wildCardsByPhase: PhaseRecord(Wilds).optional(),
    excludedRanks: z.array(Rank).optional(),
    excludedMetas: z.array(CardMeta).optional(),
    forceRankByMeta: z
      .object({
        first: CardMeta.optional(),
        last: CardMeta.optional(),
      })
      .strict()
      .optional(),
    identityResolution: z.literal("bestPossible").optional(),
    infoFeatures: z.array(InfoFeatureId).optional(),
    syntheticPair: z.enum(["adjacent", "spread"]).optional(),
    rankTransform: z.literal("inverted").optional(),
    suitTransform: z.literal("color").optional(),
    score: ScoreRule,
  })
  .strict();

export const ManifestSchema = z
  .object({
    modes: z.array(z.string().min(1)),
  })
  .strict();

export type ModeYaml = z.infer<typeof ModeYamlSchema>;

/** Resolves `deal.extends: standard` into the final GameModeDealRule. */
export function resolveDeal(yamlDeal: z.infer<typeof DealYaml>): GameModeDealRule {
  const { extends: extendsKey, ...rest } = yamlDeal;
  const merged = extendsKey === "standard" ? { ...standardDeal, ...rest } : rest;
  const parsed = ResolvedDealRule.parse(merged);
  // Strip any residual `extends` key (already removed via destructure).
  const { extends: _ignored, ...clean } = parsed;
  void _ignored;
  return clean as GameModeDealRule;
}

/** Validates a parsed YAML object and returns a fully-resolved mode definition. */
export function resolveMode(yamlMode: unknown): DingGameModeDefinition {
  const parsed = ModeYamlSchema.parse(yamlMode);
  const { deal, ...rest } = parsed;
  return {
    ...rest,
    deal: resolveDeal(deal),
  } as DingGameModeDefinition;
}
