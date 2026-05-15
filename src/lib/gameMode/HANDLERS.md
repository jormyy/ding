# Handler Audit

Audit of every `PhaseEffectId` and `InfoFeatureId` against `party/handlers/`
dispatchers. Documents which effects mutate engine state, which dispatch
to registry handlers, and which are intentional no-ops.

Re-run anytime: `npx tsx scripts/audit-handlers.ts`

## Phase effects

### Direct-mutation effects

State-mutating effects. The dispatcher in `party/handlers/phaseEffects.ts`
calls a helper that changes `state.allCommunityCards`, `state.hands`,
`state.dealDeck`, or one of the new engine state slots.

```
randomReplaceVisibleCommunity, reverseCommunity, mirrorCommunity,
shuffleCommunity, rotateHoleCardsClockwise, incrementFirstHolePerHand,
removeFaceCards, removeSevens, reassignAllSuits, invertAllRanks,
removeAdjacentToRiver, stormSurge, scrambleCommunitySuits,
swapFirstCardsFirstTwoHands, removeLastCommunity, upgradeHighestHole,
faceCardsToAces, faceCardsToTwos, removeOneHolePerHand,
removeFirstHolePerHand, shuffleAllHoleCards,
swapFirstHoleWithFirstCommunity, incrementFirstCommunityRank,
festivalBoostFirstCommunity, revertBoardToFlop, reverseTableAndBoard,
singularityAverageFirstTwoHoles, firstCommunityAbsorbsSecondSuit,
convergeSevensToAces, rotateHoleRanksAcrossHands, removeHighestRankInPlay,
spreadPlagueToFirstCard, rotateFirstHoleCardsClockwise, mixHolesWithBurn,
rotateAllCardPositions, incrementAllRanks, incrementAllHoleRanks,
cipherRanksWithRiver, staticFlickerFirstCards, splitHandsAtReveal,
schismDeckHighOnly, lockMajorityColor, zeroHighRanks, breakBoardPairs,
invertScoringNow, executeRankInvert, riverOverwritesSuit,
shuffleHandAssignment, crossHandCardSwap, absorbLastHandToBoard,
hostageRankBecomesWild, bestCardClockwise, rerollFlopAtTurn,
markFirstBoard, tricksterSwapRight, glitchCopyNeighbor, tarotRankShift,
counterfeitInversion, markOneBoardWild, duplicateFlopPhase,
lockTopHalfAtFlop
```

### Score-rule pivots — set state.scoreRuleOverride

Read by `computeShowdownForMode` via the `scoreRuleOverride` slot on
`ShowdownContext`. The base scoring rule for the mode is swapped out for
the override at reveal.

```
adoptRedScoring, adoptBlackScoring, coinflipScoreRule, armRankInvert
```

### Qualifier effects — set state.pendingQualifier

The phase effect installs a qualifier ID. At reveal,
`computeShowdownForMode` looks the ID up in `QUALIFIERS` (see
`src/lib/gameMode/qualifiers.ts`) and writes `state.qualifierResult`. A
failed qualifier shows a VOIDED badge on the reveal panel.

```
requirePairToQualify, requireTopHandIsFlush, requireAllHandsPaired,
requireTopHandNoFaceCards, requireAllHandsHaveFace, requireTopHandRainbow,
requireAdjacentTie, requireTightSpread, requireWideSpread,
requireRedRiver, requirePocketSourceTop, excludePairTier
```

### Hierarchy effects — set state.handHierarchyId

The phase effect installs a hierarchy ID. At reveal,
`computeShowdownForMode` looks the ID up in `HIERARCHIES` (see
`src/lib/gameMode/hierarchies.ts`) and reorders the ranking through the
hierarchy function.

```
hierarchyByMeta, enforceOneCardPerBoardRow, bridgeCardChoice,
cyclicHandHierarchy, adjacentRankBonus, uniqueHandClassRequired,
matchRankInherit, pactMergeFirstLast, colorTeamAssign, forceAdjacentTie,
crowdedRankPenalty
```

### Phase-tempo substep effects — set state.phaseSubstep

Sets a marker on state that the renderer (visibility + reveal animation)
reads to alter the pace of the round. The base phase order is unchanged;
sub-phase machinery is layered on top via the substep slot.

```
revertToFlopBriefly, flopOneAtATime, rewindToTurnAfterReveal
```

### Visual-only flags

```
stripBoardSuits         → state.suitsStripped = true
draftFromFlop           → handled at deal-choice
```

### Deleted (kept as no-op for backward catalog compatibility)

The following effects were redundant with `forceRankByMeta` /
`wildCards.metas` already wired into the showdown. Their YAML references
should be removed in a future catalog pass; the cases remain as no-ops to
keep older builds from throwing.

```
blessedTierBump, cursedTierDemote, chosenJokerImprint, markedTwinWild,
optedTierPenalty
```

## Info features

### Live handlers

Compute from engine state. Examples: `deck-count`, `suit-census`,
`rank-census`, `burn-reveal`, `hint-card`, `tell`, `heat-map`,
`meta-legend`.

### Narrative handlers

Per-phase chip text from `narrativeSpecs`. Each one defines what the chip
says in `preflop`/`flop`/`turn`/`river`/`reveal`. Example: `aurora` says
"All suits reassign on a cycle at river" through the early phases, and
"Every suit just reassigned" at river.

### Generic fallback

The handler dispatch falls through to `genericInfo()` which emits the mode
summary as the chip text. Many modes want the chip to simply restate
"what this mode does"; the summary is the canonical source of that text.
