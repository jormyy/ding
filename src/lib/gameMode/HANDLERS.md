# Handler Audit

Reference for every `PhaseEffectId`, `InfoFeatureId`, and `DealChoiceVariant`
in the catalog: where the handler lives, what it does, and how the contract
audit keeps YAML in sync with code.

Re-run the human-readable table anytime:

```
npx tsx scripts/audit-handlers.ts             # full table + warnings
npx tsx scripts/audit-handlers.ts --strict    # exit non-zero on missing handler
```

`npm run modes:gen` and `npm run modes:check` invoke `--strict` automatically, so
declarative drift (a YAML id without a runtime handler) fails the build.

## How dispatch works

### Phase effects → `party/effects/`

Each `PhaseEffectId` (in `src/lib/gameMode/types.ts`) has one of three homes:

1. **Mechanic handler** — a file under `party/effects/<id>.ts` that calls
   `registerPhaseEffect("<id>", (state, phase) => …)`. Files self-register at
   module-load time; `party/effects/index.ts` side-effect imports them all so
   the registry is populated before the first dispatch.
2. **Qualifier id** — listed in `QUALIFIER_EFFECTS` in
   `party/handlers/phaseEffects.ts`. The dispatcher arms
   `state.pendingQualifier`; the showdown runs the predicate from
   `QUALIFIERS` (`src/lib/gameMode/qualifiers.ts`) and writes
   `state.qualifierResult`.
3. **Hierarchy id** — listed in `HIERARCHY_EFFECTS` in the same file. The
   dispatcher arms `state.handHierarchyId`; the showdown applies the
   reorderer from `HIERARCHIES` (`src/lib/gameMode/hierarchies.ts`) after
   the base sort.

The dispatcher (`party/handlers/phaseEffects.ts:applyModePhaseEffects`) checks
qualifier → hierarchy → registry in that order, bumps `state.mutationVersion`,
and pushes a typed `ChaosEvent`. Handlers don't need to remember either.

### Info features → `party/handlers/infoFeatures.ts`

Single-file registry. Three categories:

- **Live**: `(state, phase) => ModeInfo[]` reads state and emits a chip.
- **Narrative**: `{ label, byPhase: { … } }` static per-phase chip text.
- **Generic fallback**: anything in `InfoFeatureId` without an entry gets a
  generic mode-summary chip via the dispatcher's tail.

### DealChoice variants → `src/lib/gameMode/dealChoices/`

`DealChoiceVariant` (in `src/lib/gameMode/dealChoiceVariant.ts`) is resolved
from the mode's `deal.dealChoice` flags by `resolveDealChoiceVariant`. Each
variant has a file under `src/lib/gameMode/dealChoices/<variant>.ts` that
calls `registerDealChoiceVariant("<variant>", { apply: (state) => … })`.
`finishDealChoicePhase` looks up the registry and invokes `.apply` once all
players' choices are submitted.

Message handlers (`chooseDealCards`, `auctionClaim`, etc.) stay in
`party/handlers/dealChoice.ts` because they're keyed by ClientMessage type,
not by variant — the variant only determines the finalize step.

## Phase effects — by category

### Mechanic handlers (`party/effects/<id>.ts`)

State-mutating effects. Each lives in its own file and uses shared helpers
(`RANKS`, `SUITS`, `copyCard`, `mapAllCards`, `removeAndRefillBoard`, …) from
`party/effects/shared.ts`. Adding a new mechanic: new file + one line in
`party/effects/index.ts`.

Community-board mutators: `randomReplaceVisibleCommunity`, `reverseCommunity`,
`mirrorCommunity`, `shuffleCommunity`, `scrambleCommunitySuits`,
`removeAdjacentToRiver`, `stormSurge`, `removeLastCommunity`,
`incrementFirstCommunityRank`, `festivalBoostFirstCommunity`,
`revertBoardToFlop`, `firstCommunityAbsorbsSecondSuit`,
`removeHighestRankInPlay`, `cipherRanksWithRiver`, `riverOverwritesSuit`,
`breakBoardPairs`, `lockMajorityColor`, `markFirstBoard`,
`glitchCopyNeighbor`, `markOneBoardWild`.

Hole-card mutators: `rotateHoleCardsClockwise`, `incrementFirstHolePerHand`,
`swapFirstCardsFirstTwoHands`, `upgradeHighestHole`, `removeOneHolePerHand`,
`removeFirstHolePerHand`, `shuffleAllHoleCards`,
`swapFirstHoleWithFirstCommunity`, `singularityAverageFirstTwoHoles`,
`rotateHoleRanksAcrossHands`, `rotateFirstHoleCardsClockwise`,
`mixHolesWithBurn`, `incrementAllHoleRanks`, `tricksterSwapRight`,
`bestCardClockwise`.

Whole-state mutators: `reassignAllSuits`, `invertAllRanks`, `faceCardsToAces`,
`faceCardsToTwos`, `convergeSevensToAces`, `incrementAllRanks`,
`rotateAllCardPositions`, `cipherRanksWithRiver`, `staticFlickerFirstCards`,
`zeroHighRanks`, `removeFaceCards`, `removeSevens`, `tarotRankShift`,
`counterfeitInversion`, `executeRankInvert`, `reverseTableAndBoard`,
`shuffleHandAssignment`, `crossHandCardSwap`, `absorbLastHandToBoard`,
`splitHandsAtReveal`, `hostageRankBecomesWild`, `schismDeckHighOnly`,
`spreadPlagueToFirstCard`.

Phase-tempo substep effects (set `state.phaseSubstep`):
`revertToFlopBriefly`, `flopOneAtATime`, `duplicateFlopPhase`,
`rewindToTurnAfterReveal`, `lockTopHalfAtFlop`, `rerollFlopAtTurn`,
`draftFromFlop`.

Score-rule pivots (set `state.scoreRuleOverride`):
`adoptRedScoring`, `adoptBlackScoring`, `coinflipScoreRule`, `armRankInvert`,
`invertScoringNow`.

Other engine slots: `stripBoardSuits` (suitsStripped), `optedTierPenalty`
(pendingOptedTierPenalty).

### Qualifier-dispatch ids (`QUALIFIER_EFFECTS` in `phaseEffects.ts`)

Arm `state.pendingQualifier`; showdown runs the predicate from `QUALIFIERS`.

`requirePairToQualify`, `requireTopHandIsFlush`, `requireAllHandsPaired`,
`requireTopHandNoFaceCards`, `requireAllHandsHaveFace`,
`requireTopHandRainbow`, `requireAdjacentTie`, `requireTightSpread`,
`requireWideSpread`, `requireRedRiver`, `requirePocketSourceTop`,
`excludePairTier`.

### Hierarchy-dispatch ids (`HIERARCHY_EFFECTS` in `phaseEffects.ts`)

Arm `state.handHierarchyId`; showdown reorders via `HIERARCHIES`.

`hierarchyByMeta`, `enforceOneCardPerBoardRow`, `bridgeCardChoice`,
`cyclicHandHierarchy`, `adjacentRankBonus`, `uniqueHandClassRequired`,
`matchRankInherit`, `pactMergeFirstLast`, `colorTeamAssign`,
`forceAdjacentTie`, `crowdedRankPenalty`.

### Registered no-op handlers (`party/effects/noopMetaEffects.ts`)

These ids reinforce `forceRankByMeta` which already runs at showdown via
`applyMetaRankForces`. The handler is intentionally a no-op (state already
correct); the ids stay registered so the contract audit doesn't flag legacy
YAML references. The dispatcher's tail still emits a `ChaosEvent` so the UI
surfaces the announcement.

`blessedTierBump`, `cursedTierDemote`, `chosenJokerImprint`, `markedTwinWild`.

## DealChoice variants — registry

`peekKeep` (default), `mulligan`, `tradeUp`, `inheritance`, `exposeChoice`,
`auction`, `blindPool`, `peekBoard`, `sacrificeForPeek`, `recruit`,
`solomon`, `tablePicks`, `optInHole3WithPenalty`, `draftFromFlop`.

Each has a file under `src/lib/gameMode/dealChoices/`. Variants whose
finalize behaviour is "keep the selected indexes, drop the rest" share
`applyStandardKeep` from `peekKeep.ts` via `standardKeepVariants.ts`.
`draftFromFlop` is wired at the `flop` phase via `state.phaseSubstep`
rather than `finishDealChoicePhase`, so its registered handler is a no-op.

## Info features

The handler classifications (live / narrative / generic) are still extracted
by regex from `infoFeatures.ts` because that file is the registry. To see the
current categorization plus mode usage counts:

```
npx tsx scripts/audit-handlers.ts
```

Adding a new info feature: append the id to `InfoFeatureId` in `types.ts`, add
an entry to either `featureHandlers` (live) or `narrativeSpecs` (per-phase
chip text) in `party/handlers/infoFeatures.ts`. Anything not registered falls
back to the generic mode-summary chip.
