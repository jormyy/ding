# Ding Mode Tag Vocabulary

Canonical mechanic-grouped tags for the 328-YAML catalog. Replaces the ad-hoc
386-tag soup that accumulated as modes were authored. Every mode carries
1–4 tags drawn from this list and **nothing else**. New mechanic → new tag,
documented here, then propagated through every YAML.

Source: `~/vault/projects/ding/ding-mode-tag-vocabulary.md` (vault), reconciled
with the 13 mechanic clusters specified in the audit goal. Tags are mechanic-
grouped: they describe what the engine actually does to the hand, not vibe.

## Authoring

Tags live in each mode's YAML under `tags:` and are hand-written from this
vocabulary. The schema (`src/lib/gameMode/schema.ts`) types `tags` as
`z.array(z.string())`, so the constraint is documentary — keep new modes
inside the 23 tags below, derive the right set from the table, and add a
new cluster only when a mechanic genuinely doesn't fit.

Pick tags from these signals in the YAML:

- `deal.deck`, `deal.publicCards`, `deal.visibleHoleCards/...Detail/...Indexes`
- `deal.visibleCommunityCards/...Indexes/...Detail`
- `deal.dealChoice.{mulligan,tradeUp,inheritance,auction,...}`
- `deal.constraint`, `deal.boards`, `deal.boardLayout`
- `wildCards`, `wildCardsByPhase`, `excludedMetas`, `forceRankByMeta`
- `phaseEffects.*` (every PhaseEffectId)
- `infoFeatures.*`, `tier`

## The 23 canonical tags

### Baseline (one)

| Tag    | Meaning                          | Derived from                |
|--------|----------------------------------|-----------------------------|
| `core` | Classic Ding, no twist           | `id === "ding"` exclusively |

### Mechanic clusters (one or more)

| Tag                 | What it does to the hand                                                                                       | Derived from |
|---------------------|-----------------------------------------------------------------------------------------------------------------|--------------|
| `deck-swap`         | Deck composition replaced (short, stripped, double, triple, half, pinochle, bottomHalf, suitHeavy, suitLight)   | `deal.deck` in non-token set |
| `visibility`        | Hole-card or community-card reveal schedule differs from baseline (public holes, suit-show, phased exposure)    | `publicCards` / `visibleHoleCards*` / `visibleCommunityCards*` |
| `select-stage`      | Player-driven deal-time decision (peek-keep, mulligan, trade, inherit, expose, auction, …)                      | `deal.dealChoice` present    |
| `constrained-deal`  | Hand composition constraint at deal (pocket-pair, same-suit, polar ranks, …)                                    | `deal.constraint` present    |
| `identity-token`    | Cards carry hidden identity meta (joker/tarot/cursed/blessed/counterfeit/glitched/twoSuited/marked/trickster)   | `deal.deck` in token set / `excludedMetas` / `forceRankByMeta` / wild metas |
| `wild`              | Designated ranks/suits substitute at showdown (jokers-in, wild-suit, wild-rank, wild-rank-roulette); also `syntheticPair`/`suitTransform` rank-substitution | `wildCards` / `wildCardsByPhase` ranks or suits, `syntheticPair`, `suitTransform` |
| `multi-board`       | Two or more separately scored boards (multiverse, twin-boards, bridge)                                          | `deal.boards.count > 1` / multi-group `boardLayout: grid` |
| `big-hands`         | Non-baseline deal shape: any hole / community count other than 2/5 (Omaha-style, Behemoth, single-spark, tiny-board) | `holeCards !== 2` / `communityCards !== 5` |
| `positional`        | Seat-relative effects: clockwise rotations, neighbor swaps, hierarchy by seat order                              | `rotateHoleCardsClockwise`, `rotateFirstHoleCardsClockwise`, `rotateAllCardPositions`, `bestCardClockwise`, `swapFirstCardsFirstTwoHands`, `crossHandCardSwap`, `rotateHoleRanksAcrossHands`, `shuffleHandAssignment` |
| `relational`        | Cross-hand effects: one hand's contents affect another's score / qualifier / inheritance                         | `hierarchyByMeta`, `cyclicHandHierarchy`, `pactMergeFirstLast`, `colorTeamAssign`, `matchRankInherit`, `forceAdjacentTie`, `crowdedRankPenalty`, `enforceOneCardPerBoardRow`, `absorbLastHandToBoard`, `requirePocketSourceTop`, `splitHandsAtReveal`, `solomon`, `tablePicks`, `inheritance`, `tradeUp`, `recruit` |
| `mission`           | Alternate qualifier or score rule: round only counts when a property holds, or scoring runs lowball/flush/etc.    | any `require*` effect, `excludePairTier`, `requirePairToQualify`, `score !== "high"` |
| `score-pivot`       | Mid-hand scoring rule swap (red, black, lowball, invert, coin-flip); also `rankTransform: inverted`              | `adoptRedScoring`, `adoptBlackScoring`, `invertScoringNow`, `coinflipScoreRule`, `armRankInvert`, `executeRankInvert`, `rankTransform` |
| `late-detonation`   | Twist that fires at river or reveal — board state changes after most decisions are locked                        | any phase effect at `river` or `reveal` |
| `phase-tempo`       | Phase order or pacing changes (revert, reroll, duplicate flop, one-at-a-time, rewind, slow-burn, blackout, turnpike) | `revert/reroll/duplicate/rewind/lock/markFirst/reverseTableAndBoard` phase effects; `visibleCommunityCards` schedule diverges from `flop=3, turn=4, river=communityCards` |
| `weather`           | Atmospheric mid-game chaos hitting all hands equally (storm surge, plague spread, static flicker, replacement)   | `stormSurge`, `spreadPlagueToFirstCard`, `staticFlickerFirstCards`, `cipherRanksWithRiver`, `randomReplaceVisibleCommunity`, `shuffleCommunity`, `scrambleCommunitySuits`, `removeAdjacentToRiver`, `removeLastCommunity`, `mixHolesWithBurn`, `convergeSevensToAces`, `removeHighestRankInPlay`, `singularityAverageFirstTwoHoles`, `schismDeckHighOnly`, `lockMajorityColor`, `zeroHighRanks`, `breakBoardPairs`, `stripBoardSuits`, `markOneBoardWild`, `firstCommunityAbsorbsSecondSuit`, `riverOverwritesSuit`, `incrementAllRanks`, `incrementAllHoleRanks`, `incrementFirstCommunityRank`, `incrementFirstHolePerHand`, `festivalBoostFirstCommunity`, `upgradeHighestHole`, `faceCardsToAces`, `faceCardsToTwos`, `removeFaceCards`, `removeSevens`, `removeOneHolePerHand`, `removeFirstHolePerHand`, `shuffleAllHoleCards`, `swapFirstHoleWithFirstCommunity`, `reverseCommunity`, `mirrorCommunity`, `reassignAllSuits`, `invertAllRanks` |
| `info-overlay`      | Pure informational chip — board state is unchanged; players just see more (census, whisper, hint, periscope)     | mode has `infoFeatures` and no engine-effect tag would otherwise apply |
| `insanity`          | Tier `insanity`: multiple twists stack, or a single twist is surreal (multiverse, soup, schrodinger)             | `tier === "insanity"` |

### Select-stage sub-mechanics (under `select-stage`)

When a mode has `deal.dealChoice`, exactly one of these sub-tags is added so the
lobby filter can split the Select tier by exact variant.

| Tag             | Mechanic                                                              | Derived from                       |
|-----------------|-----------------------------------------------------------------------|------------------------------------|
| `peek-keep`     | Owner sees N candidates, keeps a subset (3→2, 5→2, etc.)              | `dealChoice` + none of the below   |
| `mulligan`      | Owner can lock or take a one-time full redraw                          | `dealChoice.mulligan = true`       |
| `trade-up`      | Owner picks one card to pass left before preflop                       | `dealChoice.tradeUp = true`        |
| `inheritance`   | Owner keeps one card; second comes from the right neighbor's discard   | `dealChoice.inheritance = true`    |
| `expose-choice` | Owner picks which of their hole cards is publicly visible              | `dealChoice` + `publicCardSelection: playerChoice` |

(Note: `auction`, `blindPool`, `peekBoard`, `sacrificeForPeek`, `recruit`,
`solomon`, `tablePicks`, `optInHole3WithPenalty` are exotic enough that they
get `select-stage` alone — they don't share a sub-family with siblings.)

## Removed from vocabulary

The following ad-hoc tags accumulated in YAMLs and are folded back into the
canonical set during derivation:

- info-feature ids (`avalanche`, `aurora`, `card-soup`, …) — these belong in
  `infoFeatures:`, not `tags:`. Folded into the canonical mechanic tag.
- mode ids (`one-up`, `tarot-tower`, `behemoth`, …) — accidental self-reference.
  Folded.
- vibe tags (`compact`, `dense`, `swingy`, `friendly`, `lock`, `peek`, `team`,
  `tower`, `tiny-board`, `dark-flop`, `slow-burn`, …) — non-mechanical. Folded.
- `event` (54×), `board` (53×), `ranks` (51×), `holes` (32×), `suits` (26×),
  `reveal` (25×), `info` (38×), `objective` (18×), `tempo` (13×) — domain-of-
  effect tags from the legacy 14-family vault doc. Replaced by mechanic-specific
  tags above. `info` collapses to `info-overlay`; `objective` collapses to
  `mission`; `tempo` collapses to `phase-tempo`; `event` to `weather` /
  `late-detonation` depending on phase; `board`/`ranks`/`suits`/`holes` are
  descriptive of the deal shape and aren't independent mechanics.
- single-card-meta tags (`marked`, `wild`, `colors`, etc.) — folded into
  `identity-token` / `wild` / `visibility` per the meta.
- numeric stragglers (`"2"`, `"7"`, `Q`, etc.) — typos in YAML, dropped.

## Examples after derivation

| Mode             | Canonical tags                                       |
|------------------|------------------------------------------------------|
| `ding`           | `core`                                               |
| `one-up`         | `visibility`                                         |
| `open-book`      | `visibility`                                         |
| `short-deck`     | `deck-swap`                                          |
| `cursed-card`    | `identity-token`, `late-detonation`                  |
| `jokers-in`      | `identity-token`, `wild`                             |
| `lying-mirror`   | `info-overlay`                                       |
| `card-multiverse`| `multi-board`, `big-hands`, `insanity`               |
| `inheritance`    | `select-stage`, `inheritance`, `relational`          |
| `mission-flush`  | `mission`, `late-detonation`                         |
| `bridge`         | `multi-board`, `big-hands`, `late-detonation`        |
| `last-rites`     | `relational`, `late-detonation`                      |
| `card-soup`      | `weather`, `insanity`                                |
| `tarot-tower`    | `identity-token`, `weather`, `late-detonation`       |
| `solomon-cut`    | `select-stage`, `relational`                         |
| `multiverse-trade` | `select-stage`, `trade-up`, `multi-board`, `big-hands`, `insanity` |

## How to use in the ModeBrowser

The lobby's tag filter surfaces these 23 tags. Each acts as a coherent
cluster — clicking `weather` shows storms, plagues, replacements; clicking
`select-stage` shows every deal-choice variant; clicking `mission` shows
qualifier-based modes. No filter pulls a one-off info-feature id.

## Adding a new tag

If a new mechanic doesn't fit one of these 23, **don't bolt a tag on**:

1. Decide whether the mechanic is genuinely orthogonal (a new cluster) or
   a variant of an existing one (a new sub-mechanic).
2. If new cluster: add a row to "Mechanic clusters" above and apply the
   tag to every existing YAML that matches the new signal.
3. If new sub-mechanic under `select-stage`: add a row under sub-mechanics
   and update affected YAMLs.

The vocabulary is for the catalog as a whole — never for one mode.
